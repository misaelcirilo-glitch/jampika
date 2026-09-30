import { prisma } from '../../config/database.js'
import { env } from '../../config/env.js'
import { construirSystemPrompt } from './consultora.prompt.js'

const CURRENCY_BY_COUNTRY: Record<string, string> = {
  PE: 'PEN',
  CO: 'COP',
  EC: 'USD',
  BO: 'BOB',
  MX: 'MXN',
  CL: 'CLP',
}

interface KpisClinica {
  nombre: string
  pais: string
  plan: string
  tipoProfesion?: string
  equipoTotal: number
  pacientesActivos: number
  citasHoy: number
  citasSemana: number
  tasaNoShowPct: number | null
  ingresosMes30d: number
  moneda: string
  facturasPendientes: number
  insumosBajoStock: number
}

async function calcularKpis(clinicId: string): Promise<KpisClinica> {
  const clinic = await prisma.clinic.findUniqueOrThrow({
    where: { id: clinicId },
    select: { name: true, country: true, plan: true, settings: true },
  })
  const settings = (clinic.settings ?? {}) as Record<string, unknown>

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date()
  endOfDay.setHours(23, 59, 59, 999)
  const startOfWeek = new Date(startOfDay)
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
  const hace30d = new Date()
  hace30d.setDate(hace30d.getDate() - 30)

  const [
    equipoTotal,
    pacientesActivos,
    citasHoy,
    citasSemana,
    citas30d,
    noShow30d,
    invoicesPagadas30d,
    facturasPendientes,
    insumosBajoStock,
  ] = await Promise.all([
    prisma.user.count({ where: { clinicId, isActive: true } }),
    prisma.patient.count({ where: { clinicId, isActive: true } }),
    prisma.appointment.count({ where: { clinicId, startTime: { gte: startOfDay, lte: endOfDay } } }),
    prisma.appointment.count({ where: { clinicId, startTime: { gte: startOfWeek } } }),
    prisma.appointment.count({ where: { clinicId, startTime: { gte: hace30d }, status: { not: 'scheduled' } } }),
    prisma.appointment.count({ where: { clinicId, startTime: { gte: hace30d }, status: 'no_show' } }),
    prisma.invoice.findMany({
      where: { clinicId, status: 'paid', paidAt: { gte: hace30d } },
      select: { total: true },
    }),
    prisma.invoice.count({ where: { clinicId, status: 'pending' } }),
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count FROM inventory_items
      WHERE clinic_id = ${clinicId}::uuid AND is_active = true AND current_stock <= min_stock
    `,
  ])

  const ingresosMes30d = invoicesPagadas30d.reduce((acc, i) => acc + Number(i.total), 0)
  const tasaNoShowPct = citas30d > 0 ? (noShow30d / citas30d) * 100 : null

  return {
    nombre: clinic.name,
    pais: clinic.country,
    plan: clinic.plan,
    tipoProfesion: typeof settings.professionType === 'string' ? settings.professionType : undefined,
    equipoTotal,
    pacientesActivos,
    citasHoy,
    citasSemana,
    tasaNoShowPct,
    ingresosMes30d,
    moneda: CURRENCY_BY_COUNTRY[clinic.country] ?? 'USD',
    facturasPendientes,
    insumosBajoStock: Number(insumosBajoStock[0]?.count ?? 0),
  }
}

export async function listarHistorial(clinicId: string, userId: string) {
  return prisma.consultoraMensaje.findMany({
    where: { clinicId, userId },
    orderBy: { createdAt: 'asc' },
    take: 50,
  })
}

export async function enviarMensaje(clinicId: string, userId: string, mensaje: string) {
  await prisma.consultoraMensaje.create({
    data: { clinicId, userId, rol: 'user', contenido: mensaje },
  })

  const kpis = await calcularKpis(clinicId)
  const systemPrompt = construirSystemPrompt(kpis)

  const historial = await prisma.consultoraMensaje.findMany({
    where: { clinicId, userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })
  const historialTexto =
    historial.length > 1
      ? historial
          .reverse()
          .slice(0, -1)
          .map((m) => `${m.rol === 'user' ? 'Usuario' : 'Consultora Senior'}: ${m.contenido}`)
          .join('\n')
      : ''

  const userPrompt = historialTexto
    ? `CONVERSACIÓN PREVIA:\n${historialTexto}\n\n---\n\nPREGUNTA: ${mensaje}`
    : mensaje

  let respuesta: string
  const usandoIA = Boolean(env.OPENROUTER_API_KEY)

  if (usandoIA) {
    try {
      respuesta = await llamarOpenRouter(systemPrompt, userPrompt)
    } catch (err) {
      console.error('Consultora Senior: error llamando a OpenRouter:', err)
      respuesta = respuestaFallback(kpis, mensaje)
    }
  } else {
    respuesta = respuestaFallback(kpis, mensaje)
  }

  await prisma.consultoraMensaje.create({
    data: { clinicId, userId, rol: 'assistant', contenido: respuesta },
  })

  return { respuesta, usandoIA, kpis }
}

async function llamarOpenRouter(systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-001',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
    }),
  })

  if (!res.ok) {
    throw new Error(`OpenRouter respondió ${res.status}: ${await res.text()}`)
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const texto = json.choices?.[0]?.message?.content
  if (!texto) throw new Error('OpenRouter no devolvió contenido')
  return texto
}

// Respuesta útil sin IA externa: analiza los KPIs ya calculados con reglas simples.
function respuestaFallback(kpis: KpisClinica, _mensaje: string): string {
  const partes: string[] = []
  partes.push(`**Diagnóstico rápido de ${kpis.nombre}**\n`)

  partes.push(`Equipo: ${kpis.equipoTotal} · Pacientes activos: ${kpis.pacientesActivos} · Citas hoy: ${kpis.citasHoy} · Citas esta semana: ${kpis.citasSemana}\n`)

  const alertas: string[] = []
  if (kpis.tasaNoShowPct !== null && kpis.tasaNoShowPct > 15) {
    alertas.push(
      `Tasa de no-show del ${kpis.tasaNoShowPct.toFixed(1)}% (últimos 30 días) — está por encima de lo razonable. Recomendación: confirmación automática 24h antes por WhatsApp + lista de espera para llenar huecos.`,
    )
  }
  if (kpis.insumosBajoStock > 0) {
    alertas.push(
      `${kpis.insumosBajoStock} insumo(s) por debajo del stock mínimo. Revisa el módulo de Inventario antes de que afecte la agenda.`,
    )
  }
  if (kpis.facturasPendientes > 5) {
    alertas.push(
      `${kpis.facturasPendientes} facturas pendientes de cobro. Hay una fuga en el ciclo de ingresos: prioriza el seguimiento de cobranza esta semana.`,
    )
  }

  if (alertas.length > 0) {
    partes.push('**Alertas:**')
    alertas.forEach((a) => partes.push(`- ${a}`))
    partes.push('')
  } else {
    partes.push('No hay alertas críticas en los indicadores disponibles ahora mismo.\n')
  }

  partes.push(
    `Ingresos cobrados (30 días): ${kpis.ingresosMes30d.toFixed(2)} ${kpis.moneda}. Como referencia general, tus costes operativos no deberían superar el 65-70% de esa cifra.`,
  )

  partes.push(
    `\nPara respuestas más profundas y personalizadas a tu pregunta, configura la variable OPENROUTER_API_KEY en el servidor de la API.`,
  )

  return partes.join('\n')
}
