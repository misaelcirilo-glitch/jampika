import crypto from 'node:crypto'
import { prisma } from '../../config/database.js'

// Telemedicina (PRP-016): videoconsulta por cita usando Jitsi (meet.jit.si, sin API key).
// Sala = jampika-<appointmentId> (UUID → no adivinable). Token HMAC extra para el
// enlace público del paciente. Sin migración.

const secret = () => process.env.VIDEO_SECRET || 'jampika-video-dev-secret'
const appUrl = () => process.env.APP_URL || 'https://jampika.com'

export function roomName(appointmentId: string): string {
  return `jampika-${appointmentId}`
}
export function roomUrl(appointmentId: string): string {
  return `https://meet.jit.si/${roomName(appointmentId)}`
}
export function videoToken(appointmentId: string): string {
  return crypto.createHmac('sha256', secret()).update(appointmentId).digest('hex').slice(0, 20)
}
export function patientJoinUrl(appointmentId: string): string {
  return `${appUrl()}/consulta/${appointmentId}?t=${videoToken(appointmentId)}`
}

// Profesional (autenticado, tenant-scoped): datos de la sala de una cita suya.
export async function getForClinic(clinicId: string, appointmentId: string) {
  const appt = await prisma.appointment.findFirst({ where: { id: appointmentId, clinicId }, select: { id: true } })
  if (!appt) return null
  return { roomUrl: roomUrl(appointmentId), patientJoinUrl: patientJoinUrl(appointmentId) }
}

// Paciente (público): valida token HMAC + módulo telemedicina activo → datos de la sala.
export async function getPublic(appointmentId: string, token: string) {
  if (!token || token !== videoToken(appointmentId)) return null
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { startTime: true, clinicId: true },
  })
  if (!appt) return null
  const clinic = await prisma.clinic.findUnique({
    where: { id: appt.clinicId },
    select: { name: true, settings: true },
  })
  const s = (clinic?.settings ?? {}) as Record<string, unknown>
  const mods = Array.isArray(s.enabledModules) ? (s.enabledModules as unknown[]) : []
  if (!mods.includes('telemedicina')) return null
  return { roomUrl: roomUrl(appointmentId), clinicName: clinic?.name ?? '', when: appt.startTime }
}
