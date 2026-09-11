// Tipos de profesional soportados por Jampika (multi-profesión modular).
// Los módulos CORE están siempre activos (pacientes, agenda, notas/historia,
// archivos, facturación). Aquí solo se listan los módulos OPCIONALES que cada
// profesión enciende por defecto: 'inventario' | 'recetas' | 'cie10'.
// Se guarda en clinics.settings { professionType, enabledModules } (sin migración).

export type ProfessionType = 'medico' | 'psicologo' | 'terapeuta' | 'coach' | 'homeopata'

// Funciones INCLUIDAS en todos los planes (ya no son add-ons de pago; el precio
// se diferencia por tamaño de clínica, no por estas funciones).
const STANDARD = ['chat', 'reservas', 'telemedicina', 'cuestionarios']

export const PROFESSION_MODULES: Record<ProfessionType, string[]> = {
  medico: ['inventario', 'recetas', 'cie10', ...STANDARD],
  psicologo: [...STANDARD],
  terapeuta: [...STANDARD],
  coach: [...STANDARD],
  homeopata: ['recetas', ...STANDARD],
}

export const PROFESSION_TYPES = Object.keys(PROFESSION_MODULES) as ProfessionType[]

export function isProfessionType(t: unknown): t is ProfessionType {
  return typeof t === 'string' && (PROFESSION_TYPES as string[]).includes(t)
}

/** Módulos opcionales por profesión (fallback a médico = comportamiento actual). */
export function modulesForProfession(t: string): string[] {
  return PROFESSION_MODULES[t as ProfessionType] ?? PROFESSION_MODULES.medico
}
