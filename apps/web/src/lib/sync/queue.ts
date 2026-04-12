// Cola local de cambios pendientes de sincronizar.

import { v4 as uuid } from 'uuid'
import type { SyncableTable, SyncOperation, SyncQueueItem } from '@jampika/shared'
import { db } from '../db/schema'

export async function enqueue(
  tableName: SyncableTable,
  recordId: string,
  operation: SyncOperation,
  payload: Record<string, unknown>,
): Promise<void> {
  const item: SyncQueueItem = {
    id: uuid(),
    tableName,
    recordId,
    operation,
    payload,
    localTimestamp: new Date().toISOString(),
    retryCount: 0,
    status: 'pending',
  }
  await db.sync_queue.add(item)
}

export async function getPending(): Promise<SyncQueueItem[]> {
  return db.sync_queue.where('status').equals('pending').toArray()
}

export async function markSynced(ids: string[]): Promise<void> {
  await db.sync_queue.bulkDelete(ids)
}

export async function markConflict(id: string, error: string): Promise<void> {
  await db.sync_queue.update(id, { status: 'conflict', errorMessage: error })
}

export async function incrementRetry(id: string): Promise<void> {
  const item = await db.sync_queue.get(id)
  if (item) {
    await db.sync_queue.update(id, { retryCount: item.retryCount + 1, status: 'pending' })
  }
}

export async function countPending(): Promise<number> {
  return db.sync_queue.where('status').equals('pending').count()
}
