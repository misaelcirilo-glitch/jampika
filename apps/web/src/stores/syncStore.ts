import { create } from 'zustand'
import type { ConnectionStatus } from '@jampika/shared'

interface SyncState {
  status: ConnectionStatus
  pending: number
  lastSync: string | null
  setStatus: (status: ConnectionStatus) => void
  setPending: (n: number) => void
  setLastSync: (ts: string | null) => void
}

export const useSyncStore = create<SyncState>((set) => ({
  status: 'offline',
  pending: 0,
  lastSync: null,
  setStatus: (status) => set({ status }),
  setPending: (pending) => set({ pending }),
  setLastSync: (lastSync) => set({ lastSync }),
}))
