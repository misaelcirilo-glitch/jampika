export type SyncOperation = 'INSERT' | 'UPDATE' | 'DELETE'
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'conflict'
export type ConnectionStatus = 'online' | 'offline' | 'syncing'

export type SyncableTable =
  | 'patients'
  | 'appointments'
  | 'medical_records'
  | 'invoices'
  | 'invoice_items'
  | 'services'
  | 'inventory_items'
  | 'inventory_movements'

export interface SyncQueueItem {
  id: string
  tableName: SyncableTable
  recordId: string
  operation: SyncOperation
  payload: Record<string, unknown>
  localTimestamp: string
  retryCount: number
  status: SyncStatus
  errorMessage?: string
}

export interface SyncPushRequest {
  deviceId: string
  changes: SyncQueueItem[]
}

export interface ConflictItem {
  recordId: string
  tableName: SyncableTable
  reason: string
  resolution: 'local_wins' | 'server_wins' | 'merged'
}

export interface SyncPushResponse {
  applied: string[]
  conflicts: ConflictItem[]
  serverTimestamp: string
}

export interface ServerChange {
  tableName: SyncableTable
  operation: SyncOperation
  recordId: string
  payload: Record<string, unknown>
  serverTimestamp: string
}

export interface SyncPullResponse {
  changes: ServerChange[]
  serverTimestamp: string
}

export interface SyncStatusResponse {
  lastSync: string | null
  pendingChanges: number
  status: ConnectionStatus
}
