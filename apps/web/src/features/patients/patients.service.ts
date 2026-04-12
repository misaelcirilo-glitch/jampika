// Capa offline-first: escribe en DB local + cola de sync.
// Las lecturas siempre vienen de la DB local.

import { v4 as uuid } from 'uuid'
import type { Patient } from '@jampika/shared'
import { db } from '../../lib/db/schema'
import { enqueue } from '../../lib/sync/queue'

export async function listPatients(search?: string): Promise<Patient[]> {
  const all = await db.patients.filter((p) => p.isActive !== false).toArray()
  if (!search) return all.sort((a, b) => a.lastName.localeCompare(b.lastName))
  const q = search.toLowerCase()
  return all
    .filter(
      (p) =>
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        p.documentNumber.includes(search),
    )
    .sort((a, b) => a.lastName.localeCompare(b.lastName))
}

export async function getPatient(id: string): Promise<Patient | undefined> {
  return db.patients.get(id)
}

export async function createPatient(
  input: Omit<Patient, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>,
): Promise<Patient> {
  const now = new Date().toISOString()
  const patient: Patient = {
    ...input,
    id: uuid(),
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }
  await db.patients.add(patient)
  await enqueue('patients', patient.id, 'INSERT', patient as unknown as Record<string, unknown>)
  return patient
}

export async function updatePatient(id: string, changes: Partial<Patient>): Promise<void> {
  const existing = await db.patients.get(id)
  if (!existing) throw new Error('Paciente no encontrado')
  const updated = { ...existing, ...changes, updatedAt: new Date().toISOString() }
  await db.patients.put(updated)
  await enqueue('patients', id, 'UPDATE', updated as unknown as Record<string, unknown>)
}

export async function deletePatient(id: string): Promise<void> {
  const existing = await db.patients.get(id)
  if (!existing) return
  const updated = { ...existing, isActive: false, updatedAt: new Date().toISOString() }
  await db.patients.put(updated)
  await enqueue('patients', id, 'UPDATE', updated as unknown as Record<string, unknown>)
}
