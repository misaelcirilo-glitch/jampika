'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  CreditCard,
  ExternalLink,
  Loader2,
  Sparkles,
  Users,
  Wifi,
} from 'lucide-react'
import {
  getSubscription,
  openPortal,
  statusLabel,
  type SubscriptionState,
} from '@/features/subscription/subscription.service'
import { planLabel, professionalsLabel } from '@/features/subscription/plans'
import { useAuthStore } from '@/stores/authStore'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const TONE_VARIANTS: Record<'ok' | 'warn' | 'bad', 'success' | 'warning' | 'destructive'> = {
  ok: 'success',
  warn: 'warning',
  bad: 'destructive',
}

export function SubscriptionTab() {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null)
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    getSubscription()
      .then((res) => {
        if (!alive) return
        setSubscription(res.subscription)
      })
      .catch((e: unknown) => {
        if (!alive) return
        setError(e instanceof Error ? e.message : 'No se pudo cargar la suscripción.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  async function handlePortal() {
    setRedirecting(true)
    try {
      await openPortal()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir el portal de suscripción.')
      setRedirecting(false)
    }
  }

  if (loading) {
    return (
      <Card className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> Cargando suscripción…
      </Card>
    )
  }

  if (error) {
    return (
      <div className="max-w-xl space-y-4">
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      </div>
    )
  }

  // Estado vacío: nunca se suscribió.
  if (!subscription) {
    return (
      <Card className="max-w-xl space-y-5 p-6">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Suscripción</h2>
        </div>
        <p className="text-sm text-muted-foreground">Aún no tienes una suscripción activa.</p>
        <Button asChild>
          <Link href="/planes">
            <Sparkles className="h-4 w-4" /> Ver planes
          </Link>
        </Button>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Wifi className="h-3.5 w-3.5" /> La gestión de la suscripción requiere conexión a internet.
        </p>
      </Card>
    )
  }

  const badge = statusLabel(subscription.status)
  const periodLabel = subscription.billingPeriod === 'yearly' ? 'Anual' : 'Mensual'
  const isTrial = subscription.status === 'trialing'

  return (
    <Card className="max-w-xl space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Suscripción</h2>
        </div>
        <Badge variant={TONE_VARIANTS[badge.tone]} className="rounded-full px-3 py-1">
          {badge.text}
        </Badge>
      </div>

      {/* Plan y periodo */}
      <div className="space-y-1">
        <div className="text-2xl font-bold text-foreground">
          {planLabel(subscription.plan)}
          <span className="ml-2 align-middle text-sm font-medium text-muted-foreground">{periodLabel}</span>
        </div>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="h-4 w-4 text-muted-foreground" />
          {professionalsLabel(subscription.maxProfessionals)}
        </p>
      </div>

      {/* Fechas */}
      <div className="rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground">
        {isTrial && subscription.trialEndsAt ? (
          <span>Prueba gratis hasta el {formatDate(subscription.trialEndsAt)}</span>
        ) : (
          <span>Próxima renovación: {formatDate(subscription.currentPeriodEnd)}</span>
        )}
      </div>

      {/* Aviso de cancelación programada */}
      {subscription.cancelAtPeriodEnd && (
        <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/15 px-4 py-3 text-sm text-warning-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Tu suscripción se cancelará al final del periodo.</span>
        </div>
      )}

      {/* Acción: gestionar (solo admin) */}
      {isAdmin ? (
        <Button onClick={handlePortal} disabled={redirecting}>
          {redirecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Abriendo…
            </>
          ) : (
            <>
              <ExternalLink className="h-4 w-4" /> Gestionar suscripción
            </>
          )}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          Solo el administrador puede gestionar la suscripción.
        </p>
      )}

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Wifi className="h-3.5 w-3.5" /> La gestión de la suscripción requiere conexión a internet.
      </p>
    </Card>
  )
}
