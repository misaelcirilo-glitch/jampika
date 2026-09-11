import type { Request, Response } from 'express'
import type Stripe from 'stripe'
import { prisma } from '../../config/database.js'
import { env } from '../../config/env.js'
import { getStripe } from './client.js'
import { parseMaxProfessionals, planFromLookupKey, type Plan } from './plans.js'

// Handler del webhook de Stripe. Se monta con express.raw (cuerpo CRUDO) ANTES del
// express.json global: la verificación de firma necesita el body sin parsear.

// Tipos auxiliares para leer campos que cambian de sitio entre versiones de API,
// evitando `any` (usamos `unknown` + forma concreta).
interface WithPeriodEnd {
  current_period_end?: number
}
interface InvoiceSubRef {
  subscription?: string | { id: string } | null
  parent?: { subscription_details?: { subscription?: string | { id: string } | null } | null } | null
}

function secToDate(sec: number | null | undefined): Date | null {
  return sec ? new Date(sec * 1000) : null
}

/** Crea o actualiza la fila `subscriptions` a partir de una Subscription de Stripe. */
async function upsertFromSubscription(sub: Stripe.Subscription): Promise<void> {
  const clinicId = sub.metadata?.clinic_id
  if (!clinicId) {
    console.warn('[billing] Subscription sin clinic_id en metadata:', sub.id)
    return
  }
  const item = sub.items.data[0]
  const price = item?.price
  const md = (price?.metadata ?? {}) as Record<string, string>
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
  const plan = ((md.plan as Plan) || planFromLookupKey(price?.lookup_key) || 'consultorio') as Plan
  const billingPeriod = md.billing_period || (price?.recurring?.interval === 'year' ? 'yearly' : 'monthly')
  const maxProfessionals = parseMaxProfessionals(md.max_professionals)
  const currentPeriodEnd = secToDate(
    (sub as unknown as WithPeriodEnd).current_period_end ??
      (item as unknown as WithPeriodEnd | undefined)?.current_period_end,
  )
  const trialEndsAt = secToDate(sub.trial_end)

  const data = {
    stripeCustomerId: customerId,
    stripeSubscriptionId: sub.id,
    plan,
    billingPeriod,
    status: sub.status,
    maxProfessionals,
    currentPeriodEnd,
    trialEndsAt,
    cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
  }
  await prisma.subscription.upsert({
    where: { clinicId },
    create: { clinicId, ...data },
    update: data,
  })
}

function subscriptionIdFromInvoice(inv: Stripe.Invoice): string | null {
  const ref = inv as unknown as InvoiceSubRef
  const direct = ref.subscription ?? ref.parent?.subscription_details?.subscription
  if (!direct) return null
  return typeof direct === 'string' ? direct : direct.id
}

async function setStatusBySubId(subscriptionId: string, status: string): Promise<void> {
  await prisma.subscription.updateMany({ where: { stripeSubscriptionId: subscriptionId }, data: { status } })
}

export async function stripeWebhookHandler(req: Request, res: Response): Promise<void> {
  const signature = req.headers['stripe-signature']
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    res.status(503).json({ error: 'Webhook no configurado' })
    return
  }
  if (!signature || typeof signature !== 'string') {
    res.status(400).json({ error: 'Falta la firma del webhook' })
    return
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(req.body as Buffer, signature, env.STRIPE_WEBHOOK_SECRET)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'firma inválida'
    res.status(400).json({ error: `Webhook inválido: ${msg}` })
    return
  }

  // Idempotencia: marcar el evento ANTES de procesar. Si ya existía, 200 y salir.
  try {
    await prisma.stripeEvent.create({ data: { eventId: event.id } })
  } catch {
    res.json({ received: true, duplicate: true })
    return
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const subId =
          typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
        if (subId) {
          const sub = await getStripe().subscriptions.retrieve(subId)
          await upsertFromSubscription(sub)
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        // deleted llega con status 'canceled' → el upsert lo refleja y revoca acceso.
        await upsertFromSubscription(event.data.object as Stripe.Subscription)
        break
      }
      case 'invoice.paid': {
        const subId = subscriptionIdFromInvoice(event.data.object as Stripe.Invoice)
        if (subId) await setStatusBySubId(subId, 'active')
        break
      }
      case 'invoice.payment_failed': {
        const subId = subscriptionIdFromInvoice(event.data.object as Stripe.Invoice)
        if (subId) {
          await setStatusBySubId(subId, 'past_due')
          console.warn('[billing] Pago fallido — avisar al cliente. subscription=', subId)
        }
        break
      }
      case 'customer.subscription.trial_will_end': {
        const sub = event.data.object as Stripe.Subscription
        console.warn(
          '[billing] Trial termina en ~3 días — avisar. subscription=',
          sub.id,
          'clinic=',
          sub.metadata?.clinic_id,
        )
        break
      }
      default:
        console.log('[billing] Evento no manejado:', event.type)
    }
  } catch (e) {
    // El evento ya quedó marcado (idempotencia). Log y 200 para no reintentar en bucle.
    console.error('[billing] Error procesando webhook', event.type, e)
  }

  res.json({ received: true })
}
