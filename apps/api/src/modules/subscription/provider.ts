// Abstracción DELGADA del proveedor de cobro (PRP-012). Solo operaciones de
// pay-in/gestión; los WEBHOOKS NO se abstraen (cada proveedor tiene sus eventos y
// firma → su propio handler, todos escriben en la misma tabla `subscriptions`).
// Hoy: Stripe. Futuro: Rebill (métodos locales LATAM) se enchufa aquí.

import { prisma } from '../../config/database.js'
import { getStripe } from './client.js'
import { planLookupKey, type BillingPeriod, type Plan } from './plans.js'

const TRIAL_DAYS = 30

export interface CheckoutInput {
  clinicId: string
  plan: Plan
  billingPeriod: BillingPeriod
  origin: string
}

export interface PaymentProvider {
  readonly nombre: string
  createCheckout(input: CheckoutInput): Promise<{ url: string }>
  getPortalUrl(input: { clinicId: string; origin: string }): Promise<string>
  cancelSubscription(clinicId: string): Promise<void>
}

/** Plan/lookup_key inexistente en Stripe → 400 (no 500). */
export class PlanNotFoundError extends Error {}

export class StripeProvider implements PaymentProvider {
  readonly nombre = 'stripe'

  async createCheckout({ clinicId, plan, billingPeriod, origin }: CheckoutInput): Promise<{ url: string }> {
    const stripe = getStripe()
    const lookupKey = planLookupKey(plan, billingPeriod)

    const prices = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 })
    const price = prices.data[0]
    if (!price) throw new PlanNotFoundError(`No existe el precio ${lookupKey} en Stripe`)

    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      include: { subscription: true },
    })
    if (!clinic) throw new Error('Clínica no encontrada')

    // Reutilizar el customer si la clínica ya tuvo suscripción.
    let customerId = clinic.subscription?.stripeCustomerId ?? null
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: clinic.email ?? undefined,
        name: clinic.name,
        metadata: { clinic_id: clinicId, app: 'jampika' },
      })
      customerId = customer.id
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: price.id, quantity: 1 }],
      client_reference_id: clinicId,
      allow_promotion_codes: true,
      payment_method_collection: 'always', // pedimos tarjeta antes del trial
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        trial_settings: { end_behavior: { missing_payment_method: 'pause' } },
        metadata: { clinic_id: clinicId, app: 'jampika' },
      },
      success_url: `${origin}/settings?suscripcion=ok&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/planes?suscripcion=cancel`,
    })
    if (!session.url) throw new Error('No se pudo crear la sesión de pago')
    return { url: session.url }
  }

  async getPortalUrl({ clinicId, origin }: { clinicId: string; origin: string }): Promise<string> {
    const stripe = getStripe()
    const sub = await prisma.subscription.findUnique({ where: { clinicId } })
    if (!sub?.stripeCustomerId) throw new Error('La clínica aún no tiene suscripción')
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${origin}/settings?suscripcion=portal`,
    })
    return session.url
  }

  async cancelSubscription(clinicId: string): Promise<void> {
    const stripe = getStripe()
    const sub = await prisma.subscription.findUnique({ where: { clinicId } })
    if (!sub?.stripeSubscriptionId) throw new Error('La clínica no tiene suscripción activa')
    await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true })
  }
}

export function getPaymentProvider(): PaymentProvider {
  // Futuro: case 'rebill' → new RebillProvider() (su propio webhook aparte).
  return new StripeProvider()
}
