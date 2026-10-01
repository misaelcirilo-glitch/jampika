import { prisma } from '../../config/database.js'
import { env } from '../../config/env.js'
import { construirSystemPrompt, type DatosClinica } from './consultora.prompt.js'
import { calcularSnapshotKpis } from '../kpis/kpis.service.js'
import type { KpiSnapshot } from '../kpis/kpis.types.js'
import { alertasKpi, vistaConsultora } from './consultora.vista.js'

// Contexto de la clínica para la consultora. Los KPIs salen del MISMO cálculo
// que la página de Indicadores (kpis.service.ts): aquí no hay fórmulas.
async function contextoClinica(clinicId: string): Promise<{ datos: DatosClinica; snapshot: KpiSnapshot }> {
  const [clinic, equipoTotal, snapshot] = await Promise.all([
    prisma.clinic.findUniqueOrThrow({ where: { id: clinicId }, select: { name: true, country: true, plan: true, settings: true } }),
    prisma.user.count({ where: { clinicId, isActive: true } }),
    calcularSnapshotKpis(clinicId, { periodo: 'mes' }),
  ])
  const settings = (clinic.settings ?? {}) as Record<string, unknown>
  return {
    snapshot,
    datos: {
      nombre: clinic.name,
      pais: clinic.country,
      plan: clinic.plan,
      tipoProfesion: typeof settings.professionType === 'string' ? settings.professionType : undefined,
      equipoTotal,
      kpis: vistaConsultora(snapshot),
    },
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

  const { datos, snapshot } = await contextoClinica(clinicId)
  const systemPrompt = construirSystemPrompt(datos)

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
      respuesta = respuestaFallback(datos, snapshot)
    }
  } else {
    respuesta = respuestaFallback(datos, snapshot)
  }

  await prisma.consultoraMensaje.create({
    data: { clinicId, userId, rol: 'assistant', contenido: respuesta },
  })

  return { respuesta, usandoIA }
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

// Respuesta útil sin IA externa: las mismas alertas (semáforo, referencia,
// responsable, acción) que muestra la página de Indicadores.
function respuestaFallback(datos: DatosClinica, s: KpiSnapshot): string {
  const sc = s.scorecard
  const partes: string[] = [
    `**Diagnóstico rápido de ${datos.nombre}** (mes en curso)\n`,
    `Equipo: ${datos.equipoTotal} · Consultas realizadas: ${sc.procesos.consultasRealizadas} · Pacientes nuevos: ${sc.paciente.nuevos} · Ingresos cobrados: ${sc.financiera.ingresos.toFixed(2)} ${s.moneda}\n`,
  ]
  const alertas = alertasKpi(s)
  if (alertas.length > 0) {
    partes.push('**Alertas:**', ...alertas.map((a) => `- ${a}`), '')
  } else {
    partes.push('No hay indicadores esenciales en ámbar o rojo ahora mismo.\n')
  }
  partes.push('Tienes el detalle completo en la página **Indicadores**.')
  partes.push('\nPara respuestas más profundas y personalizadas a tu pregunta, configura la variable OPENROUTER_API_KEY en el servidor de la API.')
  return partes.join('\n')
}
