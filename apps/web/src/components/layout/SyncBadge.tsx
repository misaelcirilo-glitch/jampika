'use client'

import { useEffect } from 'react'
import { Cloud, CloudOff, RefreshCw } from 'lucide-react'
import { initSync, syncStatus } from '@/lib/sync/engine'
import { useSyncStore } from '@/stores/syncStore'

export function SyncBadge() {
  const { status, pending, lastSync, setStatus, setPending, setLastSync } = useSyncStore()

  useEffect(() => {
    const cleanup = initSync()
    const refresh = async () => {
      const s = await syncStatus()
      setStatus(s.online ? (s.pending > 0 ? 'syncing' : 'online') : 'offline')
      setPending(s.pending)
      setLastSync(s.lastSync)
    }
    void refresh()
    const t = setInterval(refresh, 5_000)
    return () => {
      cleanup()
      clearInterval(t)
    }
  }, [setStatus, setPending, setLastSync])

  const Icon = status === 'offline' ? CloudOff : status === 'syncing' ? RefreshCw : Cloud
  const color =
    status === 'offline'
      ? 'text-red-600'
      : status === 'syncing'
      ? 'text-amber-600'
      : 'text-emerald-600'
  const bgColor =
    status === 'offline'
      ? 'bg-red-50'
      : status === 'syncing'
      ? 'bg-amber-50'
      : 'bg-emerald-50'
  const label =
    status === 'offline' ? 'Sin conexión' : status === 'syncing' ? 'Sincronizando…' : 'Sincronizado'

  return (
    <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${color} ${bgColor}`}>
      <Icon className={`h-3.5 w-3.5 ${status === 'syncing' ? 'animate-spin' : ''}`} />
      <span>{label}</span>
      {pending > 0 && (
        <span className="rounded-full bg-white/70 px-1.5 text-[10px]">{pending}</span>
      )}
    </div>
  )
}
