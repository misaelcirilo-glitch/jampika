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

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const TONE_CLASSES: Record<'ok' | 'warn' | 'bad', string> = {
  ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warn: 'bg-amber-50 text-amber-700 border-amber-200',
  bad: 'bg-red-50 text-red-700 border-red-200',
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
      <div className="flex items-center gap-2 rounded-2xl bg-white p-6 text-sm text-slate-500 shadow-sm border border-slate-100">
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> Cargando suscripción…
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-xl space-y-4">
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      </div>
    )
  }

  // Estado vacío: nunca se suscribió.
  if (!subscription) {
    return (
      <div className="max-w-xl space-y-5 rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-700">Suscripción</h2>
        </div>
        <p className="text-sm text-slate-500">Aún no tienes una suscripción activa.</p>
        <Link
          href="/planes"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Sparkles className="h-4 w-4" /> Ver planes
        </Link>
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <Wifi className="h-3.5 w-3.5" /> La gestión de la suscripción requiere conexión a internet.
        </p>
      </div>
    )
  }

  const badge = statusLabel(subscription.status)
  const periodLabel = subscription.billingPeriod === 'yearly' ? 'Anual' : 'Mensual'
  const isTrial = subscription.status === 'trialing'

  return (
    <div className="max-w-xl space-y-5 rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-700">Suscripción</h2>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${TONE_CLASSES[badge.tone]}`}
        >
          {badge.text}
        </span>
      </div>

      {/* Plan y periodo */}
      <div className="space-y-1">
        <div className="text-2xl font-bold text-slate-800">
          {planLabel(subscription.plan)}
          <span className="ml-2 align-middle text-sm font-medium text-slate-400">{periodLabel}</span>
        </div>
        <p className="flex items-center gap-1.5 text-sm text-slate-500">
          <Users className="h-4 w-4 text-slate-400" />
          {professionalsLabel(subscription.maxProfessionals)}
        </p>
      </div>

      {/* Fechas */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        {isTrial && subscription.trialEndsAt ? (
          <span>Prueba gratis hasta el {formatDate(subscription.trialEndsAt)}</span>
        ) : (
          <span>Próxima renovación: {formatDate(subscription.currentPeriodEnd)}</span>
        )}
      </div>

      {/* Aviso de cancelación programada */}
      {subscription.cancelAtPeriodEnd && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Tu suscripción se cancelará al final del periodo.</span>
        </div>
      )}

      {/* Acción: gestionar (solo admin) */}
      {isAdmin ? (
        <button
          onClick={handlePortal}
          disabled={redirecting}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {redirecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Abriendo…
            </>
          ) : (
            <>
              <ExternalLink className="h-4 w-4" /> Gestionar suscripción
            </>
          )}
        </button>
      ) : (
        <p className="text-sm text-slate-400">
          Solo el administrador puede gestionar la suscripción.
        </p>
      )}

      <p className="flex items-center gap-1.5 text-xs text-slate-400">
        <Wifi className="h-3.5 w-3.5" /> La gestión de la suscripción requiere conexión a internet.
      </p>
    </div>
  )
}
