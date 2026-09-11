import { prisma } from '../../config/database.js'
import { ACTIVE_SUBSCRIPTION_STATUSES, PROFESSIONAL_ROLES } from './plans.js'

/** Suscripción de la clínica (1:1). null si nunca se suscribió. */
export function getSubscription(clinicId: string) {
  return prisma.subscription.findUnique({ where: { clinicId } })
}

/** ¿La clínica tiene una suscripción en estado vigente (trial/active/past_due/paused)? */
export async function hasActiveSubscription(clinicId: string): Promise<boolean> {
  const sub = await getSubscription(clinicId)
  return !!sub && (ACTIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(sub.status)
}

/** Nº de profesionales (doctor/nurse) activos de la clínica. */
export function countProfessionals(clinicId: string): Promise<number> {
  return prisma.user.count({
    where: { clinicId, isActive: true, role: { in: [...PROFESSIONAL_ROLES] } },
  })
}
