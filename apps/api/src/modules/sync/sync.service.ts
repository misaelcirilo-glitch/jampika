import type { ConflictItem, ServerChange, SyncPushRequest, SyncableTable } from '@jampika/shared'
import { prisma } from '../../config/database.js'
import { resolveConflict } from './conflict-resolver.js'

// Mapea nombre de tabla → delegate de Prisma.
// Única fuente de verdad para el sync engine.
const TABLE_DELEGATES: Record<SyncableTable, keyof typeof prisma> = {
  patients: 'patient',
  appointments: 'appointment',
  medical_records: 'medicalRecord',
  invoices: 'invoice',
  invoice_items: 'invoiceItem',
  services: 'service',
  inventory_items: 'inventoryItem',
  inventory_movements: 'inventoryMovement',
}

// Convierte camelCase (payload del cliente) a la forma que espera Prisma.
// Los IDs, timestamps y campos date llegan como string ISO.
function normalizePayload(payload: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined) continue
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      out[key] = new Date(value)
    } else {
      out[key] = value
    }
  }
  return out
}

export async function push(clinicId: string, body: SyncPushRequest) {
  const applied: string[] = []
  const conflicts: ConflictItem[] = []

  for (const change of body.changes) {
    const delegateName = TABLE_DELEGATES[change.tableName]
    if (!delegateName) {
      conflicts.push({
        recordId: change.recordId,
        tableName: change.tableName,
        reason: 'Tabla desconocida',
        resolution: 'server_wins',
      })
      continue
    }

    const delegate = (prisma as any)[delegateName]
    const payload = normalizePayload({ ...change.payload, clinicId })
    const localTimestamp = new Date(change.localTimestamp)

    try {
      const existing = await delegate.findUnique({ where: { id: change.recordId } })

      if (existing && existing.clinicId !== clinicId) {
        conflicts.push({
          recordId: change.recordId,
          tableName: change.tableName,
          reason: 'Registro de otra clínica',
          resolution: 'server_wins',
        })
        continue
      }

      const resolution = resolveConflict({
        table: change.tableName,
        localTimestamp,
        serverTimestamp: existing?.updatedAt ?? existing?.createdAt ?? new Date(0),
        localPayload: change.payload,
        serverPayload: existing,
      })

      if (change.operation === 'INSERT' || resolution === 'append') {
        await delegate.upsert({
          where: { id: change.recordId },
          create: { ...payload, id: change.recordId, syncedAt: new Date() },
          update: { ...payload, syncedAt: new Date() },
        })
        applied.push(change.recordId)
      } else if (change.operation === 'UPDATE') {
        if (resolution === 'local_wins') {
          await delegate.update({
            where: { id: change.recordId },
            data: { ...payload, syncedAt: new Date() },
          })
          applied.push(change.recordId)
        } else {
          conflicts.push({
            recordId: change.recordId,
            tableName: change.tableName,
            reason: 'Versión del servidor más reciente',
            resolution: 'server_wins',
          })
        }
      } else if (change.operation === 'DELETE') {
        // Soft delete: marca is_active = false si existe esa columna; si no, elimina.
        if (existing && 'isActive' in existing) {
          await delegate.update({
            where: { id: change.recordId },
            data: { isActive: false, syncedAt: new Date() },
          })
        } else {
          await delegate.delete({ where: { id: change.recordId } }).catch(() => {})
        }
        applied.push(change.recordId)
      }

      await prisma.syncLog.create({
        data: {
          clinicId,
          deviceId: body.deviceId,
          tableName: change.tableName,
          recordId: change.recordId,
          operation: change.operation,
          payload: change.payload as any,
          localTimestamp,
          conflictResolved: resolution !== 'local_wins' && resolution !== 'append',
          conflictResolution: resolution,
        },
      })
    } catch (err) {
      conflicts.push({
        recordId: change.recordId,
        tableName: change.tableName,
        reason: err instanceof Error ? err.message : 'Error desconocido',
        resolution: 'server_wins',
      })
    }
  }

  return {
    applied,
    conflicts,
    serverTimestamp: new Date().toISOString(),
  }
}

// Tablas append-only o sin columna updatedAt: solo se filtra por createdAt.
const APPEND_ONLY_TABLES = new Set<SyncableTable>([
  'medical_records',
  'invoice_items',
  'inventory_movements',
])

export async function pull(clinicId: string, since: Date, tables: SyncableTable[]) {
  const changes: ServerChange[] = []

  for (const table of tables) {
    const delegateName = TABLE_DELEGATES[table]
    if (!delegateName) continue
    const delegate = (prisma as any)[delegateName]

    const where = APPEND_ONLY_TABLES.has(table)
      ? { clinicId, createdAt: { gt: since } }
      : { clinicId, OR: [{ updatedAt: { gt: since } }, { createdAt: { gt: since } }] }

    const records = await delegate.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: 500,
    })

    for (const record of records) {
      changes.push({
        tableName: table,
        operation: 'UPDATE',
        recordId: record.id,
        payload: record,
        serverTimestamp: (record.updatedAt ?? record.createdAt).toISOString(),
      })
    }
  }

  return {
    changes,
    serverTimestamp: new Date().toISOString(),
  }
}
