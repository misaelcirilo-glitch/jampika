'use client'

import { useEffect } from 'react'
import { Cloud, CloudOff, RefreshCw } from 'lucide-react'
import { initSync, syncStatus } from '@/lib/sync/engine'
import { useSyncStore } from '@/stores/syncStore'
import { Badge } from '@/components/ui/badge'

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
  const variant =
    status === 'offline' ? 'destructive' : status === 'syncing' ? 'warning' : 'success'
  const label =
    status === 'offline' ? 'Sin conexión' : status === 'syncing' ? 'Sincronizando…' : 'Sincronizado'

  return (
    <Badge variant={variant} className="gap-2 px-3 py-1.5 uppercase tracking-wide">
      <Icon className={`h-3.5 w-3.5 ${status === 'syncing' ? 'animate-spin' : ''}`} />
      <span>{label}</span>
      {pending > 0 && (
        <span className="rounded-full bg-background/70 px-1.5 text-[10px] text-foreground">{pending}</span>
      )}
    </Badge>
  )
}
