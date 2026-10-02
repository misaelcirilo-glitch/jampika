// Capa de acceso al backend de suscripción (PRP-012, Fase 3). Todas las llamadas
// pegan al API real (requieren estar online; la suscripción no vive en Dexie).
import { api, ApiError } from '@/lib/api'
import type { BillingPeriod, PlanKey } from './plans'

export interface SubscriptionState {
  plan: PlanKey
  billingPeriod: BillingPeriod
  status: string // trialing | active | past_due | paused | canceled | ...
  maxProfessionals: number | null
  currentPeriodEnd: string | null
  trialEndsAt: string | null
  cancelAtPeriodEnd: boolean
}

export interface SubscriptionResponse {
  subscription: SubscriptionState | null
  active: boolean
}

/** Estado de la suscripción de la clínica (null si nunca se suscribió). */
export function getSubscription(): Promise<SubscriptionResponse> {
  return api.get<SubscriptionResponse>('/stripe/subscription')
}

/**
 * Inicia el checkout y redirige a Stripe. Si la clínica YA tiene suscripción activa,
 * el backend responde 409 con { portalUrl } → redirigimos al portal en su lugar.
 */
export async function startCheckout(plan: PlanKey, billingPeriod: BillingPeriod): Promise<void> {
  try {
    const { url } = await api.post<{ url: string }>('/stripe/checkout', { plan, billingPeriod })
    window.location.href = url
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) {
      const portalUrl = (e.body as { portalUrl?: string } | undefined)?.portalUrl
      if (portalUrl) {
        window.location.href = portalUrl
        return
      }
    }
    throw e
  }
}

/** Abre el portal de Stripe (cambiar plan, tarjeta, cancelar) y redirige. */
export async function openPortal(): Promise<void> {
  const { url } = await api.post<{ url: string }>('/stripe/portal', {})
  window.location.href = url
}

/** Etiqueta legible del estado de la suscripción (para badges en la UI). */
export function statusLabel(status: string): { text: string; tone: 'ok' | 'warn' | 'bad' } {
  switch (status) {
    case 'active':
      return { text: 'Activa', tone: 'ok' }
    case 'trialing':
      return { text: 'Prueba gratis', tone: 'ok' }
    case 'past_due':
      return { text: 'Pago pendiente', tone: 'warn' }
    case 'paused':
      return { text: 'Pausada', tone: 'warn' }
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      return { text: 'Cancelada', tone: 'bad' }
    case 'incomplete':
      return { text: 'Pago incompleto', tone: 'warn' }
    default:
      return { text: 'Estado desconocido', tone: 'warn' }
  }
}
