// Motor de sincronización bidireccional con backoff exponencial.

import type {
  ServerChange,
  SyncPullResponse,
  SyncPushResponse,
  SyncableTable,
} from '@jampika/shared'
import { api } from '../api'
import { db, getMeta, setMeta } from '../db/schema'
import { countPending, getPending, incrementRetry, markConflict, markSynced } from './queue'

const SYNC_TABLES: SyncableTable[] = [
  'patients',
  'appointments',
  'medical_records',
  'invoices',
  'services',
  'inventory_items',
  'inventory_movements',
]

const BACKOFF_MS = [5_000, 15_000, 45_000, 120_000, 300_000]
let syncing = false
let retryTimeout: ReturnType<typeof setTimeout> | null = null

function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server'
  let id = localStorage.getItem('jampika_device_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('jampika_device_id', id)
  }
  return id
}

export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

export async function push(): Promise<SyncPushResponse | null> {
  const pending = await getPending()
  if (pending.length === 0) return null

  const deviceId = getDeviceId()
  try {
    const result = await api.post<SyncPushResponse>('/sync/push', {
      deviceId,
      changes: pending,
    })
    await markSynced(result.applied.map((id) => {
      const item = pending.find((p) => p.recordId === id)
      return item?.id ?? ''
    }).filter(Boolean))

    for (const conflict of result.conflicts) {
      const item = pending.find((p) => p.recordId === conflict.recordId)
      if (item) await markConflict(item.id, conflict.reason)
    }
    return result
  } catch (err) {
    for (const item of pending) {
      await incrementRetry(item.id)
    }
    throw err
  }
}

export async function pull(): Promise<SyncPullResponse> {
  const since = (await getMeta('last_sync')) ?? '1970-01-01T00:00:00Z'
  const result = await api.get<SyncPullResponse>(
    `/sync/pull?since=${encodeURIComponent(since)}&tables=${SYNC_TABLES.join(',')}`,
  )
  await applyServerChanges(result.changes)
  await setMeta('last_sync', result.serverTimestamp)
  return result
}

async function applyServerChanges(changes: ServerChange[]): Promise<void> {
  for (const change of changes) {
    const table = (db as any)[change.tableName]
    if (!table) continue
    if (change.operation === 'DELETE') {
      await table.delete(change.recordId)
    } else {
      await table.put(change.payload)
    }
  }
}

export async function syncAll(): Promise<void> {
  if (syncing || !isOnline()) return
  syncing = true
  try {
    await push()
    await pull()
    if (retryTimeout) {
      clearTimeout(retryTimeout)
      retryTimeout = null
    }
  } catch (err) {
    const item = (await getPending())[0]
    const attempt = Math.min(item?.retryCount ?? 0, BACKOFF_MS.length - 1)
    const delay = BACKOFF_MS[attempt] ?? 300_000
    retryTimeout = setTimeout(() => void syncAll(), delay)
    console.warn('[sync] fallo, reintentando en', delay, 'ms', err)
  } finally {
    syncing = false
  }
}

export function initSync(): () => void {
  if (typeof window === 'undefined') return () => {}

  void syncAll()
  const interval = setInterval(() => void syncAll(), 30_000)
  const onOnline = () => void syncAll()
  window.addEventListener('online', onOnline)

  const onMessage = (event: MessageEvent) => {
    if (event.data?.type === 'SYNC_TRIGGER') void syncAll()
  }
  navigator.serviceWorker?.addEventListener('message', onMessage)

  return () => {
    clearInterval(interval)
    window.removeEventListener('online', onOnline)
    navigator.serviceWorker?.removeEventListener('message', onMessage)
  }
}

export async function syncStatus() {
  return {
    online: isOnline(),
    pending: await countPending(),
    lastSync: await getMeta('last_sync'),
  }
}
