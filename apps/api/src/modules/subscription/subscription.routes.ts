import { Router, type Request } from 'express'
import { z } from 'zod'
import { env } from '../../config/env.js'
import { authMiddleware, requireRole } from '../../middleware/auth.js'
import { PaymentNotConfiguredError } from './client.js'
import { getPaymentProvider, PlanNotFoundError } from './provider.js'
import { getSubscription } from './service.js'
import { ACTIVE_SUBSCRIPTION_STATUSES, BILLING_PERIODS, PLANS } from './plans.js'

const router = Router()
router.use(authMiddleware)

const checkoutSchema = z.object({
  plan: z.enum(PLANS as [string, ...string[]]),
  billingPeriod: z.enum(BILLING_PERIODS as [string, ...string[]]),
})

/** Base URL para redirecciones (origen del navegador → APP_URL → local). */
function originOf(req: Request): string {
  return req.headers.origin || env.APP_URL || 'http://localhost:3001'
}

// Iniciar checkout de suscripción (solo el dueño/admin de la clínica).
router.post('/checkout', requireRole('admin'), async (req, res, next) => {
  try {
    const { plan, billingPeriod } = checkoutSchema.parse(req.body)
    const clinicId = req.auth!.clinicId

    // Una clínica solo puede tener UNA suscripción vigente → 409 + portal.
    const existing = await getSubscription(clinicId)
    if (existing && (ACTIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(existing.status)) {
      const portalUrl = await getPaymentProvider().getPortalUrl({ clinicId, origin: originOf(req) })
      return res.status(409).json({ error: 'La clínica ya tiene una suscripción activa', portalUrl })
    }

    const { url } = await getPaymentProvider().createCheckout({
      clinicId,
      plan: plan as never,
      billingPeriod: billingPeriod as never,
      origin: originOf(req),
    })
    res.json({ url })
  } catch (e) {
    if (e instanceof PlanNotFoundError) return res.status(400).json({ error: e.message })
    if (e instanceof PaymentNotConfiguredError) {
      return res.status(503).json({ error: 'Pagos no configurados. Contacta soporte.' })
    }
    next(e) // ZodError → 400 (errorHandler)
  }
})

// Portal de gestión (cambiar plan, actualizar tarjeta, cancelar).
router.post('/portal', requireRole('admin'), async (req, res, next) => {
  try {
    const url = await getPaymentProvider().getPortalUrl({ clinicId: req.auth!.clinicId, origin: originOf(req) })
    res.json({ url })
  } catch (e) {
    if (e instanceof PaymentNotConfiguredError) {
      return res.status(503).json({ error: 'Pagos no configurados. Contacta soporte.' })
    }
    next(e)
  }
})

// Estado de la suscripción de la clínica (para la web).
router.get('/subscription', async (req, res, next) => {
  try {
    const sub = await getSubscription(req.auth!.clinicId)
    res.json({
      subscription: sub
        ? {
            plan: sub.plan,
            billingPeriod: sub.billingPeriod,
            status: sub.status,
            maxProfessionals: sub.maxProfessionals,
            currentPeriodEnd: sub.currentPeriodEnd,
            trialEndsAt: sub.trialEndsAt,
            cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          }
        : null,
      active: !!sub && (ACTIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(sub.status),
    })
  } catch (e) {
    next(e)
  }
})

export default router
