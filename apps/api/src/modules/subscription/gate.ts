import { countProfessionals, getSubscription } from './service.js'

/** El límite de profesionales lo impone la APP, no Stripe. */
export class PlanLimitError extends Error {
  readonly status = 402
}

/**
 * Lanza si añadir un profesional superaría el límite del plan activo de la clínica.
 * - Sin suscripción todavía → no se bloquea (alta inicial antes de contratar).
 * - maxProfessionals NULL → ilimitado.
 */
export async function assertCanAddProfessional(clinicId: string): Promise<void> {
  const sub = await getSubscription(clinicId)
  if (!sub) return
  if (sub.maxProfessionals == null) return
  const current = await countProfessionals(clinicId)
  if (current >= sub.maxProfessionals) {
    throw new PlanLimitError(
      `Tu plan permite hasta ${sub.maxProfessionals} profesionales. Mejora tu plan para añadir más.`,
    )
  }
}
