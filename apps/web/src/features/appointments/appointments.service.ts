import { v4 as uuid } from 'uuid'
import type { Appointment } from '@jampika/shared'
import { db } from '../../lib/db/schema'
import { enqueue } from '../../lib/sync/queue'

export async function listAppointments(from?: Date, to?: Date): Promise<Appointment[]> {
  const all = await db.appointments.toArray()
  return all
    .filter((a) => {
      const start = new Date(a.startTime)
      if (from && start < from) return false
      if (to && start > to) return false
      return true
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
}

export async function createAppointment(
  input: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt' | 'reminderSent'>,
): Promise<Appointment> {
  const now = new Date().toISOString()
  const appt: Appointment = {
    ...input,
    id: uuid(),
    reminderSent: false,
    createdAt: now,
    updatedAt: now,
  }
  await db.appointments.add(appt)
  await enqueue('appointments', appt.id, 'INSERT', appt as unknown as Record<string, unknown>)
  return appt
}

export async function updateAppointment(
  id: string,
  changes: Partial<Appointment>,
): Promise<void> {
  const existing = await db.appointments.get(id)
  if (!existing) throw new Error('Cita no encontrada')
  const updated = { ...existing, ...changes, updatedAt: new Date().toISOString() }
  await db.appointments.put(updated)
  await enqueue('appointments', id, 'UPDATE', updated as unknown as Record<string, unknown>)
}
