import type { Prisma } from '@prisma/client'
import { prisma } from '../../config/database.js'
import type { KpiSnapshot } from './kpis.types.js'
import { haceMeses, rangoKpi, type KpiPeriodo } from './kpis.time.js'
import {
  ATENDIDA,
  type CitaKpi,
  type ProfesionalKpi,
  capacidad,
  citasSinCerrar,
  estado,
  horarioDe,
  horasDisponibles,
  journey,
  noShow,
  pct,
  productividad,
  serviciosTop,
  sinProximaCita,
  tasaRetorno,
} from './kpis.calc.js'

export const MONEDA_POR_PAIS: Record<string, string> = { PE: 'PEN', CO: 'COP', EC: 'USD', BO: 'BOB', MX: 'MXN', CL: 'CLP' }

export interface KpiConfig {
  costoHoraConsulta: number | null
  costosFijosMensuales: number | null
}

export function leerConfigKpis(settings: unknown): KpiConfig {
  const s = (settings ?? {}) as Record<string, unknown>
  const k = (s.kpis ?? {}) as Record<string, unknown>
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
  return { costoHoraConsulta: n(k.costoHoraConsulta), costosFijosMensuales: n(k.costosFijosMensuales) }
}

/** Fusiona settings.kpis sin tocar el resto de settings (módulos, reservas…). */
export async function guardarConfigKpis(clinicId: string, cambios: Partial<KpiConfig>) {
  const clinic = await prisma.clinic.findUniqueOrThrow({ where: { id: clinicId }, select: { settings: true } })
  const settings = (clinic.settings ?? {}) as Record<string, unknown>
  const kpis = { ...((settings.kpis ?? {}) as Record<string, unknown>), ...cambios }
  await prisma.clinic.update({ where: { id: clinicId }, data: { settings: { ...settings, kpis } as Prisma.InputJsonValue } })
  return leerConfigKpis({ kpis })
}

const NO_ANULADA: Prisma.InvoiceWhereInput = { comprobanteEstado: { not: 'anulado' }, status: { not: 'cancelled' } }
const sumar = (lista: { total: Prisma.Decimal }[]) => lista.reduce((s, i) => s + Number(i.total), 0)

function citaKpi(c: {
  id: string; patientId: string; doctorId: string; startTime: Date; endTime: Date; status: string
  invoices: { status: string; comprobanteEstado: string }[]
}): CitaKpi {
  const validas = c.invoices.filter((i) => i.comprobanteEstado !== 'anulado' && i.status !== 'cancelled')
  return { ...c, facturada: validas.length > 0, cobrada: validas.some((i) => i.status === 'paid') }
}

async function cargarInventario(clinicId: string, inicio: Date, fin: Date) {
  const [items, salidas] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { clinicId, isActive: true },
      select: { currentStock: true, minStock: true, expirationDate: true, purchasePrice: true },
    }),
    prisma.inventoryMovement.findMany({
      where: { clinicId, movementType: { not: 'in' }, createdAt: { gte: inicio, lt: fin } },
      select: { quantity: true, item: { select: { purchasePrice: true } } },
    }),
  ])
  if (items.length === 0) return null
  const en30d = new Date(fin.getTime() + 30 * 86_400_000)
  return {
    insumosBajoStock: items.filter((i) => i.currentStock <= i.minStock).length,
    insumosPorVencer: items.filter((i) => i.expirationDate && i.expirationDate <= en30d).length,
    valorInventario: items.reduce((s, i) => s + i.currentStock * Number(i.purchasePrice ?? 0), 0),
    consumoInsumos: salidas.reduce((s, m) => s + Math.abs(m.quantity) * Number(m.item.purchasePrice ?? 0), 0),
  }
}

export async function calcularSnapshotKpis(
  clinicId: string,
  opciones: { periodo?: KpiPeriodo; profesionalId?: string | null } = {},
): Promise<KpiSnapshot> {
  const periodo = opciones.periodo ?? 'mes'
  const prof = opciones.profesionalId ?? null
  const clinic = await prisma.clinic.findUniqueOrThrow({
    where: { id: clinicId },
    select: { name: true, country: true, timezone: true, settings: true, ownerId: true },
  })
  const tz = clinic.timezone || 'America/Lima'
  const { inicio, fin, inicioAnterior, finAnterior } = rangoKpi(periodo, tz)
  const ahora = fin
  const porProf = prof ? { doctorId: prof } : {}
  const facturaPorProf: Prisma.InvoiceWhereInput = prof ? { appointment: { doctorId: prof } } : {}
  const config = leerConfigKpis(clinic.settings)

  const [usuarios, citasRaw, citasAnt, emitidas, cobradasRaw, cobradasAnt, pendientes, nuevos, nuevosAnt, atendidas6m, futuras] =
    await Promise.all([
      prisma.user.findMany({ where: { clinicId, isActive: true }, select: { id: true, firstName: true, lastName: true, role: true, schedule: true } }),
      prisma.appointment.findMany({
        where: { clinicId, startTime: { gte: inicio, lt: fin }, ...porProf },
        select: { id: true, patientId: true, doctorId: true, startTime: true, endTime: true, status: true, invoices: { select: { status: true, comprobanteEstado: true } } },
      }),
      prisma.appointment.findMany({ where: { clinicId, startTime: { gte: inicioAnterior, lte: finAnterior }, ...porProf }, select: { status: true, startTime: true } }),
      prisma.invoice.findMany({ where: { clinicId, createdAt: { gte: inicio, lt: fin }, ...NO_ANULADA, ...facturaPorProf }, select: { total: true, status: true } }),
      prisma.invoice.findMany({
        where: { clinicId, status: 'paid', paidAt: { gte: inicio, lt: fin }, comprobanteEstado: { not: 'anulado' } },
        select: { total: true, createdAt: true, paidAt: true, appointment: { select: { doctorId: true } }, items: { select: { description: true, quantity: true, subtotal: true } } },
      }),
      prisma.invoice.findMany({ where: { clinicId, status: 'paid', paidAt: { gte: inicioAnterior, lte: finAnterior }, comprobanteEstado: { not: 'anulado' }, ...facturaPorProf }, select: { total: true } }),
      prisma.invoice.aggregate({ where: { clinicId, status: 'pending', ...NO_ANULADA, ...facturaPorProf }, _sum: { total: true }, _count: true }),
      prisma.patient.count({ where: { clinicId, createdAt: { gte: inicio, lt: fin } } }),
      prisma.patient.count({ where: { clinicId, createdAt: { gte: inicioAnterior, lte: finAnterior } } }),
      prisma.appointment.findMany({
        where: { clinicId, status: { in: ATENDIDA }, startTime: { gte: haceMeses(ahora, 6, tz), lt: ahora }, ...porProf },
        select: { patientId: true, startTime: true, doctorId: true },
      }),
      prisma.appointment.findMany({
        where: { clinicId, startTime: { gte: ahora }, status: { notIn: ['cancelled', 'no_show'] } },
        select: { patientId: true },
        distinct: ['patientId'],
      }),
    ])

  const citas = citasRaw.map(citaKpi)
  const nombre = new Map(usuarios.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]))
  const idsConCitas = new Set(citas.map((c) => c.doctorId))
  const profesionales: ProfesionalKpi[] = usuarios
    .filter((u) => u.role === 'doctor' || u.id === clinic.ownerId || idsConCitas.has(u.id))
    .map((u) => ({ id: u.id, nombre: nombre.get(u.id) ?? '', role: u.role, schedule: u.schedule }))
  const enFiltro = profesionales.filter((p) => !prof || p.id === prof)

  // Capacidad (horarios en hora local de la clínica)
  const disponiblesPorProf = new Map<string, number>()
  let horarioEstimado = false
  for (const p of enFiltro) {
    const { horario, estimado } = horarioDe(p)
    if (!horario) continue
    horarioEstimado ||= estimado
    disponiblesPorProf.set(p.id, horasDisponibles(horario, inicio, fin, tz))
  }
  const disponibles = [...disponiblesPorProf.values()].reduce((s, h) => s + h, 0)
  const cap = capacidad(citas, disponibles, ahora)
  const perdidaPct = pct(cap.perdidas, disponibles)

  // Cobros
  const cobradas = cobradasRaw.filter((f) => !prof || f.appointment?.doctorId === prof)
  const ingresos = sumar(cobradas)
  const ingresosAnterior = sumar(cobradasAnt)
  const facturado = sumar(emitidas)
  const cobradoDeLoFacturado = sumar(emitidas.filter((f) => f.status === 'paid'))
  const tasaCobro = pct(cobradoDeLoFacturado, facturado)
  const dias = cobradas.filter((f) => f.paidAt).map((f) => (f.paidAt!.getTime() - f.createdAt.getTime()) / 86_400_000)
  const ingresosPorProf = new Map<string, number>()
  cobradasRaw.forEach((f) => {
    const id = f.appointment?.doctorId
    if (id) ingresosPorProf.set(id, (ingresosPorProf.get(id) ?? 0) + Number(f.total))
  })

  // Pacientes
  const ns = noShow(citas, ahora)
  const nsAnt = noShow(citasAnt, ahora)
  const consultas = citas.filter((c) => c.status === 'completed').length
  const consultasAnt = citasAnt.filter((c) => c.status === 'completed').length
  const retorno = tasaRetorno(atendidas6m)
  const conCitaFutura = new Set(futuras.map((f) => f.patientId))
  const idsSinCita = [...new Set(atendidas6m.map((c) => c.patientId))].filter((id) => !conCitaFutura.has(id))
  const pacientesRaw = idsSinCita.length
    ? await prisma.patient.findMany({ where: { clinicId, id: { in: idsSinCita.slice(0, 200) } }, select: { id: true, firstName: true, lastName: true, phone: true } })
    : []
  const pacientes = new Map(pacientesRaw.map((p) => [p.id, { nombre: `${p.firstName} ${p.lastName}`.trim(), telefono: p.phone }]))
  const sinCita = sinProximaCita(atendidas6m, conCitaFutura, pacientes, nombre, ahora)
  const sinCitaPct = pct(sinCita.lista.length, sinCita.atendidos)

  // Journey: ¿los atendidos del periodo tienen una cita posterior?
  const atendidosIds = [...new Set(citas.filter((c) => c.status === 'completed').map((c) => c.patientId))]
  const posteriores = atendidosIds.length
    ? await prisma.appointment.findMany({
        where: { clinicId, patientId: { in: atendidosIds }, startTime: { gt: inicio }, status: { not: 'cancelled' } },
        select: { patientId: true, startTime: true },
      })
    : []

  // Recursos y salud financiera
  const inventario = await cargarInventario(clinicId, inicio, fin)
  const diasRango = Math.max(1, (fin.getTime() - inicio.getTime()) / 86_400_000)
  const costosFijos = config.costosFijosMensuales != null ? config.costosFijosMensuales * (diasRango / 30.44) : 0
  const consumo = inventario?.consumoInsumos ?? 0
  const costosPct = pct(costosFijos + consumo, ingresos)
  const configurado = config.costosFijosMensuales != null

  // Dependencia del fundador (clinic.ownerId), siempre sobre todo el equipo
  const ingresosFundador = ingresosPorProf.get(clinic.ownerId) ?? 0
  const ingresosTotalesProf = [...ingresosPorProf.values()].reduce((s, v) => s + v, 0)
  const fundadorPct = pct(ingresosFundador, ingresosTotalesProf)
  const aplicaDependencia = profesionales.length > 1

  return {
    clinica: clinic.name,
    pais: clinic.country,
    moneda: MONEDA_POR_PAIS[clinic.country] ?? 'USD',
    periodo,
    rango: { inicio: inicio.toISOString(), fin: fin.toISOString(), inicioAnterior: inicioAnterior.toISOString(), finAnterior: finAnterior.toISOString() },
    profesionalFiltro: prof,
    profesionales: profesionales.map((p) => ({ id: p.id, nombre: p.nombre })),
    config,
    esenciales: {
      capacidadPerdida: {
        horasDisponibles: disponibles,
        horasReservadas: cap.reservadas,
        horasAtendidas: cap.atendidas,
        horasHuecos: cap.huecos,
        horasCanceladasNoShow: cap.canceladasNoShow,
        horasPerdidas: cap.perdidas,
        perdidaPct,
        montoPerdido: config.costoHoraConsulta != null ? cap.perdidas * config.costoHoraConsulta : null,
        horarioEstimado,
        estado: estado(disponibles > 0, perdidaPct, (v) => v < 10, (v) => v <= 20),
      },
      noShow: { citasPasadas: ns.pasadas, noShows: ns.noShows, pct: ns.pct, pctAnterior: nsAnt.pct, estado: estado(ns.pasadas > 0, ns.pct, (v) => v < 5, (v) => v <= 10) },
      sinProximaCita: {
        total: sinCita.lista.length,
        atendidos: sinCita.atendidos,
        pct: sinCitaPct,
        pacientes: sinCita.lista.slice(0, 100),
        estado: estado(sinCita.atendidos > 0, sinCitaPct, (v) => v < 40, (v) => v <= 60),
      },
      cobro: {
        facturado,
        cobradoDeLoFacturado,
        tasaPct: tasaCobro,
        pendienteTotal: Number(pendientes._sum.total ?? 0),
        facturasPendientes: pendientes._count,
        diasPromedioCobro: dias.length ? dias.reduce((s, d) => s + d, 0) / dias.length : null,
        estado: estado(facturado > 0, tasaCobro, (v) => v > 95, (v) => v >= 90),
      },
    },
    scorecard: {
      financiera: {
        ingresos,
        ingresosAnterior,
        ingresoPorConsulta: consultas > 0 ? ingresos / consultas : 0,
        ingresoPorConsultaAnterior: consultasAnt > 0 ? ingresosAnterior / consultasAnt : 0,
      },
      paciente: { nuevos, nuevosAnterior: nuevosAnt, tasaRetornoPct: retorno.pct, activos6m: retorno.activos },
      procesos: {
        citas: citas.length,
        consultasRealizadas: consultas,
        consultasAnterior: consultasAnt,
        ocupacionPct: pct(cap.atendidas, disponibles),
        ocupacionEstado: estado(disponibles > 0, pct(cap.atendidas, disponibles), (v) => v >= 70 && v <= 85, (v) => v >= 60),
        cancelacionPct: pct(citas.filter((c) => c.status === 'cancelled').length, citas.length),
        citasSinCerrar: citasSinCerrar(citas, ahora),
      },
      recursos: inventario,
    },
    journey: journey(citas, posteriores),
    productividad: productividad(enFiltro, citas, ingresosPorProf, disponiblesPorProf),
    servicios: serviciosTop(cobradas.flatMap((f) => f.items.map((i) => ({ description: i.description, quantity: i.quantity, subtotal: Number(i.subtotal) })))),
    saludFinanciera: {
      configurado,
      ingresos,
      costosFijos,
      consumoInsumos: consumo,
      costosTotales: costosFijos + consumo,
      costosPct,
      estado: estado(configurado && ingresos > 0, costosPct, (v) => v <= 65, (v) => v <= 70),
    },
    dependenciaFundador: {
      aplica: aplicaDependencia,
      fundador: nombre.get(clinic.ownerId) ?? null,
      ingresosFundador,
      ingresosEquipo: ingresosTotalesProf - ingresosFundador,
      fundadorPct,
      estado: estado(aplicaDependencia && ingresosTotalesProf > 0, fundadorPct, (v) => v < 40, (v) => v < 60),
    },
  }
}
