import { prisma } from '../../config/database.js'

// Reserva online (PRP-015). Sin migración: config en clinics.settings.booking,
// crea appointments/patients existentes. Público (sin auth) pero validado.

interface BookingConfig {
  enabled?: boolean
  doctorId?: string
  weekdays?: number[] // 0=Dom .. 6=Sáb
  startHour?: number
  endHour?: number
  slotMinutes?: number
  leadHours?: number
}

const pad = (n: number) => String(n).padStart(2, '0')

// Convierte fecha+hora LOCAL de la clínica a instante UTC (offset vía Intl; zonas LATAM sin DST).
function clinicLocalToUtc(dateStr: string, timeStr: string, tz: string): Date {
  const pretendUtc = new Date(`${dateStr}T${timeStr}:00Z`)
  const inTz = new Date(pretendUtc.toLocaleString('en-US', { timeZone: tz }))
  const inUtc = new Date(pretendUtc.toLocaleString('en-US', { timeZone: 'UTC' }))
  const offset = inUtc.getTime() - inTz.getTime()
  return new Date(pretendUtc.getTime() + offset)
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

async function resolveClinic(slug: string) {
  const clinic = await prisma.clinic.findUnique({ where: { slug } })
  if (!clinic) return null
  const s = (clinic.settings ?? {}) as Record<string, unknown>
  const mods = Array.isArray(s.enabledModules) ? (s.enabledModules as unknown[]) : []
  const hasModule = mods.includes('reservas')
  const booking = (s.booking ?? {}) as BookingConfig
  return { clinic, hasModule, booking }
}

export async function getPublicInfo(slug: string) {
  const r = await resolveClinic(slug)
  if (!r) return null
  const enabled = r.hasModule && !!r.booking.enabled
  return { clinicName: r.clinic.name, enabled, slotMinutes: r.booking.slotMinutes ?? 30 }
}

export async function getAvailability(slug: string, fromStr: string, days: number) {
  const r = await resolveClinic(slug)
  if (!r || !r.hasModule || !r.booking.enabled) return []
  const { clinic, booking } = r
  const tz = clinic.timezone || 'America/Lima'
  const doctorId = booking.doctorId || clinic.ownerId
  const slotMin = booking.slotMinutes ?? 30
  const startHour = booking.startHour ?? 9
  const endHour = booking.endHour ?? 18
  const weekdays = booking.weekdays ?? [1, 2, 3, 4, 5]
  const leadMs = (booking.leadHours ?? 2) * 3600 * 1000
  const now = Date.now()

  const out: { date: string; times: string[] }[] = []
  for (let i = 0; i < days; i++) {
    const date = addDays(fromStr, i)
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay()
    if (!weekdays.includes(weekday)) continue

    const dayStart = clinicLocalToUtc(date, '00:00', tz)
    const dayEnd = clinicLocalToUtc(date, '23:59', tz)
    const appts = await prisma.appointment.findMany({
      where: { clinicId: clinic.id, doctorId, startTime: { gte: dayStart, lte: dayEnd }, status: { not: 'cancelled' } },
      select: { startTime: true, endTime: true },
    })

    const times: string[] = []
    for (let t = startHour * 60; t + slotMin <= endHour * 60; t += slotMin) {
      const timeStr = `${pad(Math.floor(t / 60))}:${pad(t % 60)}`
      const slotStart = clinicLocalToUtc(date, timeStr, tz)
      const slotEnd = new Date(slotStart.getTime() + slotMin * 60000)
      if (slotStart.getTime() < now + leadMs) continue
      const taken = appts.some((a) => a.startTime < slotEnd && a.endTime > slotStart)
      if (!taken) times.push(timeStr)
    }
    if (times.length) out.push({ date, times })
  }
  return out
}

export interface BookingResult {
  ok: boolean
  error?: string
  when?: string
}

export async function createBooking(
  slug: string,
  input: { name: string; phone: string; date: string; time: string },
): Promise<BookingResult> {
  const r = await resolveClinic(slug)
  if (!r || !r.hasModule || !r.booking.enabled) return { ok: false, error: 'Las reservas no están disponibles' }
  const { clinic, booking } = r
  const tz = clinic.timezone || 'America/Lima'
  const doctorId = booking.doctorId || clinic.ownerId
  const slotMin = booking.slotMinutes ?? 30
  const leadMs = (booking.leadHours ?? 2) * 3600 * 1000

  const slotStart = clinicLocalToUtc(input.date, input.time, tz)
  const slotEnd = new Date(slotStart.getTime() + slotMin * 60000)
  if (isNaN(slotStart.getTime())) return { ok: false, error: 'Fecha u hora inválida' }
  if (slotStart.getTime() < Date.now() + leadMs) return { ok: false, error: 'Ese horario ya no está disponible' }

  // Revalidar que el slot siga libre (evita doble reserva por carrera).
  const clash = await prisma.appointment.findFirst({
    where: { clinicId: clinic.id, doctorId, status: { not: 'cancelled' }, startTime: { lt: slotEnd }, endTime: { gt: slotStart } },
    select: { id: true },
  })
  if (clash) return { ok: false, error: 'Ese horario acaba de reservarse. Elige otro.' }

  // Enlazar/crear paciente por teléfono.
  const digits = input.phone.replace(/\D/g, '')
  const last9 = digits.slice(-9)
  let patient =
    last9.length >= 6
      ? await prisma.patient.findFirst({ where: { clinicId: clinic.id, phone: { contains: last9 } }, select: { id: true } })
      : null
  if (!patient) {
    const parts = input.name.trim().split(/\s+/)
    const firstName = parts[0] || 'Paciente'
    const lastName = parts.slice(1).join(' ') || '—'
    patient = await prisma.patient.create({
      data: {
        clinicId: clinic.id,
        documentType: 'sin-documento',
        documentNumber: digits || `sd-${Date.now()}`,
        firstName,
        lastName,
        phone: digits,
      },
      select: { id: true },
    })
  }

  await prisma.appointment.create({
    data: {
      clinicId: clinic.id,
      patientId: patient.id,
      doctorId,
      startTime: slotStart,
      endTime: slotEnd,
      durationMinutes: slotMin,
      status: 'scheduled',
      appointmentType: 'reserva-online',
      reason: 'Reserva online',
    },
  })

  const when = new Intl.DateTimeFormat('es', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: tz,
  }).format(slotStart)
  return { ok: true, when }
}
