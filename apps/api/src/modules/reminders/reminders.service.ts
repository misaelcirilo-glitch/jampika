import { prisma } from '../../config/database.js'
import { sendAppointmentReminder, type WhatsAppConfig } from './whatsapp.js'

// Códigos de país (calling code) para normalizar teléfonos locales.
const CALLING_CODE: Record<string, string> = {
  PE: '51', CO: '57', EC: '593', BO: '591', MX: '52', CL: '56',
}

// Deja solo dígitos; si el número parece local (sin prefijo internacional),
// antepone el código de la clínica. Devuelve null si no hay dígitos suficientes.
export function normalizePhone(raw: string, country: string | null | undefined): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 6) return null
  const cc = country ? CALLING_CODE[country] : undefined
  if (!cc) return digits
  if (digits.startsWith(cc) && digits.length > cc.length + 5) return digits
  return cc + digits
}

function formatWhen(date: Date, timezone: string | null | undefined): string {
  try {
    return new Intl.DateTimeFormat('es', {
      weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
      timeZone: timezone || 'America/Lima',
    }).format(date)
  } catch {
    return date.toISOString()
  }
}

interface ReminderConfig {
  enabled?: boolean
  hoursBefore?: number
}

export interface RunResult {
  processed: number
  sent: number
  simulated: number
  skipped: number
}

/**
 * Procesa citas próximas y envía el recordatorio a las que entren en la ventana
 * (startTime <= now + hoursBefore de su clínica), con paciente con teléfono y
 * clínica con reminders.enabled. Idempotente vía appointments.reminderSent.
 */
export async function runReminders(): Promise<RunResult> {
  const now = new Date()
  const horizon = new Date(now.getTime() + 48 * 3600 * 1000) // cota superior amplia

  const appts = await prisma.appointment.findMany({
    where: {
      status: 'scheduled',
      reminderSent: false,
      startTime: { gt: now, lte: horizon },
      patient: { phone: { not: null } },
    },
    include: { patient: true, clinic: true },
  })

  let sent = 0
  let simulated = 0
  let skipped = 0

  for (const a of appts) {
    const settings = (a.clinic.settings ?? {}) as Record<string, unknown>
    const rem = (settings.reminders ?? {}) as ReminderConfig
    if (!rem.enabled) { skipped++; continue }

    const hoursBefore = typeof rem.hoursBefore === 'number' ? rem.hoursBefore : 24
    const threshold = new Date(now.getTime() + hoursBefore * 3600 * 1000)
    if (a.startTime > threshold) { skipped++; continue } // aún no entra en su ventana

    const phone = a.patient.phone ? normalizePhone(a.patient.phone, a.clinic.country) : null
    if (!phone) { skipped++; continue }

    // Config WhatsApp por clínica (modelo por tenant); si no la tiene, cae al número compartido (env).
    const waConfig = (settings.whatsapp ?? undefined) as WhatsAppConfig | undefined

    try {
      const r = await sendAppointmentReminder(
        {
          to: phone,
          patientName: a.patient.firstName,
          clinicName: a.clinic.name,
          whenText: formatWhen(a.startTime, a.clinic.timezone),
        },
        waConfig,
      )
      await prisma.appointment.update({
        where: { id: a.id },
        data: { reminderSent: true, reminderSentAt: new Date() },
      })
      if (r.simulated) simulated++
      else sent++
    } catch (e) {
      console.error('reminder fail', a.id, e)
      skipped++
    }
  }

  return { processed: appts.length, sent, simulated, skipped }
}
