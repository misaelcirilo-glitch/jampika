// Planes de suscripción de plataforma (PRP-012). Precio por CLÍNICA, USD, 3 planes
// por tamaño. Los productos/precios YA existen en Stripe; se resuelven por LOOKUP KEY
// (nunca por price_id). El nombre comercial puede cambiar en Stripe sin tocar el código;
// las lookup keys son el contrato y NO se renombran.

export type Plan = 'consultorio' | 'clinica' | 'institucion'
export type BillingPeriod = 'monthly' | 'yearly'

export const PLANS: Plan[] = ['consultorio', 'clinica', 'institucion']
export const BILLING_PERIODS: BillingPeriod[] = ['monthly', 'yearly']

/** lookup_key que debe existir en Stripe. Ej: jampika_clinica_monthly. */
export function planLookupKey(plan: Plan, period: BillingPeriod): string {
  return `jampika_${plan}_${period}`
}

/** Deriva el plan desde un lookup_key (fallback si falta en metadata). */
export function planFromLookupKey(lookupKey: string | null | undefined): Plan | null {
  if (!lookupKey) return null
  return PLANS.find((p) => lookupKey.includes(`_${p}_`) || lookupKey.endsWith(`_${p}`)) ?? null
}

/** metadata.max_professionals: '5' | '15' | 'unlimited' → 5 | 15 | null (ilimitado). */
export function parseMaxProfessionals(v: string | null | undefined): number | null {
  if (!v || v === 'unlimited') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// Roles que cuentan para el límite de "profesionales" del plan (practicantes clínicos).
// admin/receptionist son personal de apoyo y no consumen cupo de profesional.
export const PROFESSIONAL_ROLES = ['doctor', 'nurse'] as const

// Estados de Stripe que consideramos "con plan vigente" (para 409 y gating).
export const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due', 'paused'] as const
