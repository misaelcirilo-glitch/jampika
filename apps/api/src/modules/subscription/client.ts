import Stripe from 'stripe'
import { env } from '../../config/env.js'

// Versión de API de Stripe FIJADA explícitamente (requisito): así el comportamiento
// no cambia cuando Stripe actualiza su versión por defecto.
export const STRIPE_API_VERSION = '2025-10-29.clover'

/** Se lanza cuando faltan las claves de Stripe → las rutas lo traducen a 503. */
export class PaymentNotConfiguredError extends Error {}

let client: Stripe | null = null
export function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) throw new PaymentNotConfiguredError('STRIPE_SECRET_KEY no configurada')
  if (!client) {
    client = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: STRIPE_API_VERSION as Stripe.LatestApiVersion,
    })
  }
  return client
}
