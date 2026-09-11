'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'
import {
  CURRENCY,
  PLAN_CARDS,
  PLAN_FEATURES,
  professionalsLabel,
  yearlySavings,
  type BillingPeriod,
  type PlanCard,
  type PlanKey,
} from '@/features/subscription/plans'
import { startCheckout } from '@/features/subscription/subscription.service'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

// CURRENCY viene como 'USD'; hoy solo mostramos el símbolo $. Si en el futuro
// hay otras monedas, mapear aquí en vez de asumir '$'.
const CURRENCY_SYMBOL = CURRENCY === 'USD' ? '$' : CURRENCY

export default function PlanesPage() {
  return (
    // useSearchParams exige un límite de Suspense en el App Router de Next.
    <Suspense fallback={null}>
      <PlanesContent />
    </Suspense>
  )
}

function PlanesContent() {
  const searchParams = useSearchParams()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'

  const [period, setPeriod] = useState<BillingPeriod>('monthly')
  // Guarda la key del plan cuyo checkout está en curso (para spinner/disabled puntual).
  const [pending, setPending] = useState<PlanKey | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canceled = searchParams.get('suscripcion') === 'cancel'

  async function handleSubscribe(plan: PlanKey) {
    setError(null)
    setPending(plan)
    try {
      await startCheckout(plan, period)
      // startCheckout redirige (window.location) en el caso feliz; no reseteamos pending.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar el checkout.')
      setPending(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Planes</h1>
        <p className="mt-1 text-sm text-slate-500">
          Elige el plan de Jampika para tu clínica. 30 días de prueba gratis, cancela cuando quieras.
        </p>
      </div>

      {/* Aviso de pago cancelado (vuelta desde Stripe con ?suscripcion=cancel) */}
      {canceled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Pago cancelado. Puedes intentarlo cuando quieras.
        </div>
      )}

      {/* Banner de error del checkout */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {/* Nota para no-admins */}
      {!isAdmin && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-500">
          Solo el administrador de la clínica puede gestionar la suscripción.
        </div>
      )}

      {/* Toggle Mensual / Anual */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            onClick={() => setPeriod('monthly')}
            className={cn(
              'rounded-lg px-5 py-2 text-sm font-semibold transition-colors',
              period === 'monthly' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            Mensual
          </button>
          <button
            onClick={() => setPeriod('yearly')}
            className={cn(
              'rounded-lg px-5 py-2 text-sm font-semibold transition-colors',
              period === 'yearly' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            Anual
          </button>
        </div>
      </div>

      {/* Tarjetas de planes */}
      <div className="grid gap-5 md:grid-cols-3">
        {PLAN_CARDS.map((card) => (
          <PlanCardView
            key={card.key}
            card={card}
            period={period}
            isAdmin={isAdmin}
            pending={pending === card.key}
            anyPending={pending !== null}
            onSubscribe={handleSubscribe}
          />
        ))}
      </div>
    </div>
  )
}

interface PlanCardViewProps {
  card: PlanCard
  period: BillingPeriod
  isAdmin: boolean
  pending: boolean
  anyPending: boolean
  onSubscribe: (plan: PlanKey) => void
}

function PlanCardView({ card, period, isAdmin, pending, anyPending, onSubscribe }: PlanCardViewProps) {
  const price = period === 'monthly' ? card.priceMonthly : card.priceYearly
  const priceSuffix = period === 'monthly' ? '/mes' : '/año'
  const savings = yearlySavings(card)

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-xl border bg-white p-6 shadow-sm',
        card.highlight ? 'border-blue-600 ring-2 ring-blue-600' : 'border-slate-200',
      )}
    >
      {/* Etiqueta "Más popular" en el plan destacado */}
      {card.highlight && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
          Más popular
        </span>
      )}

      <h2 className="text-lg font-bold text-slate-800">{card.label}</h2>
      <p className="mt-1 min-h-[40px] text-sm text-slate-500">{card.tagline}</p>

      {/* Precio grande */}
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-4xl font-bold text-slate-800">
          {CURRENCY_SYMBOL}
          {price}
        </span>
        <span className="text-sm font-medium text-slate-500">{priceSuffix}</span>
      </div>

      {/* Badge de ahorro anual */}
      {period === 'yearly' && savings > 0 && (
        <span className="mt-2 inline-flex w-fit rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
          Ahorra {CURRENCY_SYMBOL}
          {savings} al año
        </span>
      )}

      <p className="mt-3 text-sm font-semibold text-slate-700">
        {professionalsLabel(card.maxProfessionals)}
      </p>

      {/* Lista de features (mismo bundle para los 3) */}
      <ul className="mt-4 flex-1 space-y-2.5">
        {PLAN_FEATURES.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-slate-600">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {/* Botón Suscribirme */}
      <button
        onClick={() => onSubscribe(card.key)}
        disabled={!isAdmin || anyPending}
        className={cn(
          'mt-6 flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors',
          'bg-blue-600 hover:bg-blue-700',
          'disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:bg-slate-300',
        )}
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? 'Redirigiendo…' : 'Suscribirme'}
      </button>
    </div>
  )
}
