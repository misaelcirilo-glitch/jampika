// Fórmulas puras de KPIs (sin BD). Única fuente: las usan la página de
// Indicadores (GET /kpis) y la Consultora Senior.
import type { KpiEstado, KpiPacienteSinCita, KpiProfesional } from './kpis.types.js'
import { CLAVES_DIA, DIA, diasDelRango, horaLocal } from './kpis.time.js'

export interface CitaKpi {
  id: string
  patientId: string
  doctorId: string
  startTime: Date
  endTime: Date
  status: string
  facturada: boolean
  cobrada: boolean
}

export interface ProfesionalKpi {
  id: string
  nombre: string
  role: string
  schedule: unknown
}

type Horario = Record<string, { start: string; end: string } | null>

// Mismo horario por defecto que muestra Configuración → Horarios cuando no hay uno guardado.
export const HORARIO_DEFECTO: Horario = {
  mon: { start: '08:00', end: '18:00' },
  tue: { start: '08:00', end: '18:00' },
  wed: { start: '08:00', end: '18:00' },
  thu: { start: '08:00', end: '18:00' },
  fri: { start: '08:00', end: '18:00' },
  sat: { start: '08:00', end: '13:00' },
  sun: null,
}

export const ATENDIDA = ['completed', 'in_progress']
const NO_CERRADA = ['scheduled', 'confirmed']

export const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0)
export const horas = (c: { startTime: Date; endTime: Date }) =>
  Math.max(0, (c.endTime.getTime() - c.startTime.getTime()) / 3_600_000)

export function estado(hayDatos: boolean, v: number, bien: (v: number) => boolean, atencion: (v: number) => boolean): KpiEstado {
  if (!hayDatos) return 'sin_datos'
  return bien(v) ? 'bien' : atencion(v) ? 'atencion' : 'mal'
}

/** Horario del profesional: el guardado, o el por defecto si es médico sin horario. */
export function horarioDe(p: ProfesionalKpi): { horario: Horario | null; estimado: boolean } {
  if (p.schedule && typeof p.schedule === 'object') return { horario: p.schedule as Horario, estimado: false }
  if (p.role === 'doctor') return { horario: HORARIO_DEFECTO, estimado: true }
  return { horario: null, estimado: false }
}

/** Horas de agenda disponibles de un profesional en [inicio, fin), en hora local. */
export function horasDisponibles(horario: Horario, inicio: Date, fin: Date, tz: string): number {
  let total = 0
  for (const dia of diasDelRango(inicio, fin, tz)) {
    const clave = CLAVES_DIA[dia.dow]
    const franja = clave ? horario[clave] : null
    if (!franja?.start || !franja?.end) continue
    const desde = Math.max(horaLocal(dia.y, dia.m, dia.d, franja.start, tz).getTime(), inicio.getTime())
    const hasta = Math.min(horaLocal(dia.y, dia.m, dia.d, franja.end, tz).getTime(), fin.getTime())
    total += Math.max(0, hasta - desde) / 3_600_000
  }
  return total
}

export function capacidad(citas: CitaKpi[], disponibles: number, ahora: Date) {
  const pasadas = citas.filter((c) => c.startTime < ahora)
  const reservadas = pasadas.filter((c) => c.status !== 'cancelled').reduce((s, c) => s + horas(c), 0)
  const atendidas = pasadas.filter((c) => ATENDIDA.includes(c.status)).reduce((s, c) => s + horas(c), 0)
  const canceladasNoShow = pasadas.filter((c) => c.status === 'cancelled' || c.status === 'no_show').reduce((s, c) => s + horas(c), 0)
  const huecos = Math.max(0, disponibles - reservadas)
  return { reservadas, atendidas, canceladasNoShow, huecos, perdidas: huecos + canceladasNoShow }
}

/** No-show sobre citas pasadas no canceladas (las que debían ocurrir). */
export function noShow(citas: { status: string; startTime: Date }[], ahora: Date) {
  const pasadas = citas.filter((c) => c.startTime < ahora && c.status !== 'cancelled')
  const noShows = pasadas.filter((c) => c.status === 'no_show').length
  return { pasadas: pasadas.length, noShows, pct: pct(noShows, pasadas.length) }
}

export function citasSinCerrar(citas: CitaKpi[], ahora: Date) {
  return citas.filter((c) => NO_CERRADA.includes(c.status) && c.endTime.getTime() < ahora.getTime() - 2 * 3_600_000).length
}

/** Atendidos en los últimos 6 meses sin cita futura (fase "Seguimiento" del Patient Journey). */
export function sinProximaCita(
  atendidas6m: { patientId: string; startTime: Date; doctorId: string }[],
  conCitaFutura: Set<string>,
  pacientes: Map<string, { nombre: string; telefono: string | null }>,
  nombreProfesional: Map<string, string>,
  ahora: Date,
) {
  const ultima = new Map<string, { fecha: Date; doctorId: string }>()
  for (const c of atendidas6m) {
    const prev = ultima.get(c.patientId)
    if (!prev || c.startTime > prev.fecha) ultima.set(c.patientId, { fecha: c.startTime, doctorId: c.doctorId })
  }
  const lista: KpiPacienteSinCita[] = [...ultima.entries()]
    .filter(([id]) => !conCitaFutura.has(id))
    .map(([id, u]) => ({
      pacienteId: id,
      nombre: pacientes.get(id)?.nombre ?? 'Paciente',
      telefono: pacientes.get(id)?.telefono ?? null,
      ultimaVisita: u.fecha.toISOString(),
      diasDesdeVisita: Math.floor((ahora.getTime() - u.fecha.getTime()) / DIA),
      profesional: nombreProfesional.get(u.doctorId) ?? null,
    }))
    .sort((a, b) => a.diasDesdeVisita - b.diasDesdeVisita)
  return { lista, atendidos: ultima.size }
}

export function tasaRetorno(atendidas6m: { patientId: string }[]) {
  const visitas = new Map<string, number>()
  atendidas6m.forEach((c) => visitas.set(c.patientId, (visitas.get(c.patientId) ?? 0) + 1))
  const conRetorno = [...visitas.values()].filter((n) => n >= 2).length
  return { activos: visitas.size, pct: pct(conRetorno, visitas.size) }
}

/** Patient Journey del periodo: agendadas → asistidas → facturadas → cobradas → volvieron. */
export function journey(citas: CitaKpi[], citasPosteriores: { patientId: string; startTime: Date }[]) {
  const agendadas = citas.filter((c) => c.status !== 'cancelled')
  const asistidas = citas.filter((c) => c.status === 'completed')
  const ultimaAtencion = new Map<string, Date>()
  asistidas.forEach((c) => {
    const prev = ultimaAtencion.get(c.patientId)
    if (!prev || c.startTime > prev) ultimaAtencion.set(c.patientId, c.startTime)
  })
  const volvieron = [...ultimaAtencion.entries()].filter(([id, fecha]) =>
    citasPosteriores.some((c) => c.patientId === id && c.startTime > fecha),
  ).length
  return {
    agendadas: agendadas.length,
    asistidas: asistidas.length,
    facturadas: asistidas.filter((c) => c.facturada).length,
    cobradas: asistidas.filter((c) => c.cobrada).length,
    atendidosQueVolvieron: volvieron,
    atendidos: ultimaAtencion.size,
  }
}

export function productividad(
  profesionales: ProfesionalKpi[],
  citas: CitaKpi[],
  ingresosPorProfesional: Map<string, number>,
  disponiblesPorProfesional: Map<string, number>,
): KpiProfesional[] {
  return profesionales
    .map((p) => {
      const propias = citas.filter((c) => c.doctorId === p.id)
      const atendidas = propias.filter((c) => ATENDIDA.includes(c.status)).reduce((s, c) => s + horas(c), 0)
      const disponibles = disponiblesPorProfesional.get(p.id) ?? 0
      const ingresos = ingresosPorProfesional.get(p.id) ?? 0
      return {
        id: p.id,
        nombre: p.nombre,
        consultas: propias.filter((c) => c.status === 'completed').length,
        ingresos,
        horasDisponibles: disponibles,
        horasAtendidas: atendidas,
        ocupacionPct: pct(atendidas, disponibles),
        ingresoPorHora: atendidas > 0 ? ingresos / atendidas : 0,
      }
    })
    .filter((p) => p.consultas > 0 || p.horasDisponibles > 0 || p.ingresos > 0)
    .sort((a, b) => b.ingresos - a.ingresos)
}

export function serviciosTop(items: { description: string; quantity: number; subtotal: number }[]) {
  const mapa = new Map<string, { unidades: number; ingresos: number }>()
  for (const it of items) {
    const clave = it.description.trim() || 'Sin descripción'
    const e = mapa.get(clave) ?? { unidades: 0, ingresos: 0 }
    e.unidades += it.quantity
    e.ingresos += it.subtotal
    mapa.set(clave, e)
  }
  return [...mapa.entries()]
    .map(([servicio, e]) => ({ servicio, ...e }))
    .sort((a, b) => b.ingresos - a.ingresos)
    .slice(0, 10)
}
