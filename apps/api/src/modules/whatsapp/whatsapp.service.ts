import { prisma } from '../../config/database.js'
import { sendText, type WhatsAppConfig } from '../reminders/whatsapp.js'

// Resuelve la clínica dueña de un número (phone_number_id) por settings.whatsapp.phoneId.
export async function resolveClinicByPhoneId(phoneId: string) {
  return prisma.clinic.findFirst({
    where: { settings: { path: ['whatsapp', 'phoneId'], equals: phoneId } },
    select: { id: true, name: true, settings: true },
  })
}

function clinicWaConfig(settings: unknown): WhatsAppConfig | undefined {
  const s = (settings ?? {}) as Record<string, unknown>
  return (s.whatsapp ?? undefined) as WhatsAppConfig | undefined
}

// Enlace best-effort del teléfono entrante a un paciente de la clínica (por últimos 9 dígitos).
async function findPatientId(clinicId: string, phone: string): Promise<string | null> {
  const last9 = phone.replace(/\D/g, '').slice(-9)
  if (last9.length < 6) return null
  const p = await prisma.patient.findFirst({
    where: { clinicId, phone: { contains: last9 } },
    select: { id: true },
  })
  return p?.id ?? null
}

interface InboundInput {
  phoneId: string
  from: string
  text: string
  type?: string
  waMessageId?: string
}

// Ingesta de un mensaje entrante: enruta al tenant por phoneId, upsert conversación,
// guarda el mensaje. Si el phoneId no pertenece a ninguna clínica, se ignora.
export async function ingestInbound(m: InboundInput): Promise<{ ok: boolean; ignored?: boolean }> {
  const clinic = await resolveClinicByPhoneId(m.phoneId)
  if (!clinic) return { ok: true, ignored: true }
  const phone = m.from.replace(/\D/g, '')
  const preview = m.text.slice(0, 120)
  const patientId = await findPatientId(clinic.id, phone)

  const conv = await prisma.whatsappConversation.upsert({
    where: { clinicId_phone: { clinicId: clinic.id, phone } },
    create: {
      clinicId: clinic.id,
      phone,
      patientId,
      lastMessagePreview: preview,
      unreadCount: 1,
    },
    update: {
      lastMessageAt: new Date(),
      lastMessagePreview: preview,
      unreadCount: { increment: 1 },
      ...(patientId ? { patientId } : {}),
    },
  })

  await prisma.whatsappMessage.create({
    data: {
      conversationId: conv.id,
      clinicId: clinic.id,
      direction: 'in',
      type: m.type ?? 'text',
      body: m.text,
      waMessageId: m.waMessageId ?? null,
    },
  })
  return { ok: true }
}

export async function listConversations(clinicId: string) {
  const convs = await prisma.whatsappConversation.findMany({
    where: { clinicId },
    orderBy: { lastMessageAt: 'desc' },
    take: 100,
  })
  // Enriquecer con nombre del paciente (sin relación Prisma).
  const ids = convs.map((c) => c.patientId).filter((x): x is string => !!x)
  const patients = ids.length
    ? await prisma.patient.findMany({ where: { id: { in: ids } }, select: { id: true, firstName: true, lastName: true } })
    : []
  const nameById = new Map(patients.map((p) => [p.id, `${p.firstName} ${p.lastName}`]))
  return convs.map((c) => ({ ...c, patientName: c.patientId ? nameById.get(c.patientId) ?? null : null }))
}

export async function getMessages(clinicId: string, conversationId: string) {
  const conv = await prisma.whatsappConversation.findFirst({ where: { id: conversationId, clinicId } })
  if (!conv) return null
  const messages = await prisma.whatsappMessage.findMany({
    where: { conversationId, clinicId },
    orderBy: { createdAt: 'asc' },
  })
  if (conv.unreadCount > 0) {
    await prisma.whatsappConversation.update({ where: { id: conv.id }, data: { unreadCount: 0 } })
  }
  return { conversation: conv, messages }
}

export async function sendMessage(clinicId: string, conversationId: string, body: string) {
  const conv = await prisma.whatsappConversation.findFirst({ where: { id: conversationId, clinicId } })
  if (!conv) return null
  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId }, select: { settings: true } })
  const cfg = clinicWaConfig(clinic?.settings)

  const result = await sendText(conv.phone, body, cfg)
  const msg = await prisma.whatsappMessage.create({
    data: {
      conversationId: conv.id,
      clinicId,
      direction: 'out',
      type: 'text',
      body,
      status: result.simulated ? 'simulated' : 'sent',
    },
  })
  await prisma.whatsappConversation.update({
    where: { id: conv.id },
    data: { lastMessageAt: new Date(), lastMessagePreview: body.slice(0, 120) },
  })
  return msg
}
