// Catálogo de planes de Jampika para la UI (client-safe). Los precios aquí son SOLO
// para mostrar; el cobro real lo resuelve el backend por lookup_key en Stripe
// (jampika_<plan>_<monthly|yearly>). Si cambian importes en Stripe, actualiza también
// estos valores de display. Todos los planes incluyen TODOS los módulos; el precio
// se diferencia por tamaño de la clínica (nº de profesionales).

export type PlanKey = 'consultorio' | 'clinica' | 'institucion'
export type BillingPeriod = 'monthly' | 'yearly'

export interface PlanCard {
  key: PlanKey
  label: string
  tagline: string
  priceMonthly: number // USD/mes
  priceYearly: number // USD/año
  maxProfessionals: number | null // null = ilimitado
  highlight?: boolean // plan destacado ("Popular")
}

export const CURRENCY = 'USD'

export const PLAN_CARDS: PlanCard[] = [
  {
    key: 'consultorio',
    label: 'Consultorio',
    tagline: 'Para profesionales independientes y consultorios pequeños.',
    priceMonthly: 39,
    priceYearly: 390,
    maxProfessionals: 5,
  },
  {
    key: 'clinica',
    label: 'Clínica',
    tagline: 'Para clínicas en crecimiento con varios profesionales.',
    priceMonthly: 79,
    priceYearly: 790,
    maxProfessionals: 15,
    highlight: true,
  },
  {
    key: 'institucion',
    label: 'Institución',
    tagline: 'Para centros grandes y redes de clínicas.',
    priceMonthly: 149,
    priceYearly: 1490,
    maxProfessionals: null,
  },
]

// Todo lo que incluye CUALQUIER plan (bundle completo). Se muestra igual en los 3.
export const PLAN_FEATURES: string[] = [
  'Pacientes, agenda e historia clínica',
  'Facturación y comprobantes',
  'Funciona sin internet y se sincroniza sola',
  'Chat con pacientes por WhatsApp',
  'Recordatorios de cita automáticos',
  'Reserva online pública',
  'Telemedicina (videoconsulta)',
  'Cuestionarios y tareas para el paciente',
  'Inventario, recetas y CIE-10 (perfil médico)',
  '30 días de prueba gratis',
]

/** Nº de profesionales legible para la UI. */
export function professionalsLabel(max: number | null): string {
  return max == null ? 'Profesionales ilimitados' : `Hasta ${max} profesionales`
}

/** Ahorro anual vs pagar 12 meses (para el badge "-2 meses"/"ahorra X"). */
export function yearlySavings(card: PlanCard): number {
  return card.priceMonthly * 12 - card.priceYearly
}

export function planCard(key: string): PlanCard | undefined {
  return PLAN_CARDS.find((p) => p.key === key)
}

export function planLabel(key: string): string {
  return planCard(key)?.label ?? key
}
