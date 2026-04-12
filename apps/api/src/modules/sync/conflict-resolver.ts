// Estrategia de resolución de conflictos por tabla.
// - medical_records: append-only, nunca hay conflicto.
// - Resto: last-write-wins comparando timestamps.

import type { SyncableTable } from '@jampika/shared'

export type Resolution = 'local_wins' | 'server_wins' | 'merged' | 'append'

export interface ConflictContext {
  table: SyncableTable
  localTimestamp: Date
  serverTimestamp: Date
  localPayload: Record<string, unknown>
  serverPayload: Record<string, unknown> | null
}

export function resolveConflict(ctx: ConflictContext): Resolution {
  // Append-only: nunca hay conflicto
  if (ctx.table === 'medical_records') return 'append'

  // No existe en servidor → el local gana automáticamente
  if (!ctx.serverPayload) return 'local_wins'

  // Last write wins
  return ctx.localTimestamp >= ctx.serverTimestamp ? 'local_wins' : 'server_wins'
}
