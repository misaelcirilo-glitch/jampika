// Base de datos local con Dexie (IndexedDB).
// Cada tabla sincronizable mantiene una copia del registro + metadatos de sync.

import Dexie, { type Table } from 'dexie'
import type {
  Appointment,
  ClinicMedication,
  Invoice,
  MedicalRecord,
  Patient,
  SyncQueueItem,
} from '@jampika/shared'

export interface LocalMeta {
  key: string
  value: string
}

export class JampikaDB extends Dexie {
  patients!: Table<Patient, string>
  appointments!: Table<Appointment, string>
  medical_records!: Table<MedicalRecord, string>
  invoices!: Table<Invoice, string>
  services!: Table<any, string>
  inventory_items!: Table<any, string>
  inventory_movements!: Table<any, string>
  clinic_medications!: Table<ClinicMedication, string>
  sync_queue!: Table<SyncQueueItem, string>
  meta!: Table<LocalMeta, string>

  constructor() {
    super('jampika')
    this.version(1).stores({
      patients: 'id, clinicId, documentNumber, lastName, firstName, isActive, updatedAt',
      appointments: 'id, clinicId, patientId, doctorId, startTime, status',
      medical_records: 'id, clinicId, patientId, doctorId, recordDate',
      invoices: 'id, clinicId, patientId, invoiceNumber, status, createdAt',
      services: 'id, clinicId, name, isActive',
      inventory_items: 'id, clinicId, name, currentStock',
      inventory_movements: 'id, clinicId, itemId, createdAt',
      sync_queue: 'id, tableName, recordId, status, localTimestamp',
      meta: 'key',
    })
    this.version(2).stores({
      clinic_medications: 'id, clinicId, name, usageCount',
    })
  }
}

export const db = new JampikaDB()

export async function getMeta(key: string): Promise<string | null> {
  const row = await db.meta.get(key)
  return row?.value ?? null
}

export async function setMeta(key: string, value: string): Promise<void> {
  await db.meta.put({ key, value })
}
