'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
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
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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
      setError(e instanceof Error ? e.message : 'No se pudo iniciar el pago.')
      setPending(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Planes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Elige el plan de Jampika para tu clínica. 30 días de prueba gratis, cancela cuando quieras.
        </p>
      </div>

      {/* Aviso de pago cancelado (vuelta desde Stripe con ?suscripcion=cancel) */}
      {canceled && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm font-medium text-warning-foreground">
          Pago cancelado. Puedes intentarlo cuando quieras.
        </div>
      )}

      {/* Banner de error del checkout */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </div>
      )}

      {/* Nota para no-admins */}
      {!isAdmin && (
        <div className="rounded-lg border border-border bg-muted px-4 py-3 text-sm font-medium text-muted-foreground">
          Solo el administrador de la clínica puede gestionar la suscripción.
        </div>
      )}

      {/* Toggle Mensual / Anual */}
      <div className="flex justify-center">
        <div className="inline-flex gap-1 rounded-xl border border-border bg-card p-1 shadow-sm">
          <Button
            variant={period === 'monthly' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPeriod('monthly')}
          >
            Mensual
          </Button>
          <Button
            variant={period === 'yearly' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPeriod('yearly')}
          >
            Anual
          </Button>
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

      {/* Nota legal previa al checkout */}
      <p className="text-center text-xs text-muted-foreground">
        La suscripción se renueva automáticamente; puedes cancelarla cuando quieras. Al suscribirte
        aceptas los{' '}
        <Link href="/terminos" className="font-medium text-primary hover:text-primary/80">
          Términos y Condiciones
        </Link>{' '}
        y la{' '}
        <Link href="/privacidad" className="font-medium text-primary hover:text-primary/80">
          Política de Privacidad
        </Link>
        .
      </p>
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
    <Card
      className={cn(
        'relative flex flex-col p-6',
        card.highlight ? 'border-primary ring-2 ring-primary' : '',
      )}
    >
      {/* Etiqueta "Más popular" en el plan destacado */}
      {card.highlight && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 shadow-sm">
          Más popular
        </Badge>
      )}

      <h2 className="text-lg font-bold text-foreground">{card.label}</h2>
      <p className="mt-1 min-h-[40px] text-sm text-muted-foreground">{card.tagline}</p>

      {/* Precio grande */}
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-4xl font-bold text-foreground">
          {CURRENCY_SYMBOL}
          {price}
        </span>
        <span className="text-sm font-medium text-muted-foreground">{priceSuffix}</span>
      </div>

      {/* Badge de ahorro anual */}
      {period === 'yearly' && savings > 0 && (
        <Badge variant="success" className="mt-2 w-fit">
          Ahorra {CURRENCY_SYMBOL}
          {savings} al año
        </Badge>
      )}

      <p className="mt-3 text-sm font-semibold text-foreground">
        {professionalsLabel(card.maxProfessionals)}
      </p>

      {/* Lista de features (mismo bundle para los 3) */}
      <ul className="mt-4 flex-1 space-y-2.5">
        {PLAN_FEATURES.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {/* Botón Suscribirme */}
      <Button
        onClick={() => onSubscribe(card.key)}
        disabled={!isAdmin || anyPending}
        className="mt-6 w-full"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? 'Redirigiendo…' : 'Suscribirme'}
      </Button>
    </Card>
  )
}
