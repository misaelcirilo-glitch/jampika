import { v4 as uuid } from 'uuid'
import type { MedicalRecord } from '@jampika/shared'
import { db } from '../../lib/db/schema'
import { enqueue } from '../../lib/sync/queue'

export async function listRecordsByPatient(patientId: string): Promise<MedicalRecord[]> {
  const all = await db.medical_records.where('patientId').equals(patientId).toArray()
  return all.sort((a, b) => b.recordDate.localeCompare(a.recordDate))
}

// Append-only: solo se crea, nunca se modifica.
export async function createRecord(
  input: Omit<MedicalRecord, 'id' | 'createdAt' | 'isSigned' | 'signedAt'>,
): Promise<MedicalRecord> {
  const record: MedicalRecord = {
    ...input,
    id: uuid(),
    isSigned: false,
    signedAt: null,
    createdAt: new Date().toISOString(),
  }
  await db.medical_records.add(record)
  await enqueue(
    'medical_records',
    record.id,
    'INSERT',
    record as unknown as Record<string, unknown>,
  )
  return record
}
