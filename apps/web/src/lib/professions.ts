// Config de PROFESIONES de Jampika (multi-profesión modular) — client-safe.
// Módulos CORE siempre activos: pacientes, agenda, notas/historia, archivos, facturación.
// Módulos OPCIONALES gateados: 'inventario' | 'recetas' | 'cie10'.
// La clínica guarda { professionType, enabledModules } en settings; el login los
// devuelve y se leen aquí para gatear UI y resolver terminología.

export type ProfessionType = 'medico' | 'psicologo' | 'terapeuta' | 'coach' | 'homeopata'

export interface ProfessionConfig {
  key: ProfessionType
  label: string
  modules: string[] // opcionales activados por defecto
  patient: string // singular: Paciente | Consultante | Cliente
  patients: string // plural
  session: string // Consulta | Sesión
  noteStyle: 'soap' | 'libre' | 'objetivos'
}

export const PROFESSIONS: Record<ProfessionType, ProfessionConfig> = {
  medico: {
    key: 'medico', label: 'Médico / Clínica', modules: ['inventario', 'recetas', 'cie10'],
    patient: 'Paciente', patients: 'Pacientes', session: 'Consulta', noteStyle: 'soap',
  },
  psicologo: {
    key: 'psicologo', label: 'Psicólogo/a', modules: [],
    patient: 'Consultante', patients: 'Consultantes', session: 'Sesión', noteStyle: 'libre',
  },
  terapeuta: {
    key: 'terapeuta', label: 'Terapeuta', modules: [],
    patient: 'Consultante', patients: 'Consultantes', session: 'Sesión', noteStyle: 'libre',
  },
  coach: {
    key: 'coach', label: 'Coach', modules: [],
    patient: 'Cliente', patients: 'Clientes', session: 'Sesión', noteStyle: 'objetivos',
  },
  homeopata: {
    key: 'homeopata', label: 'Homeópata', modules: ['recetas'],
    patient: 'Paciente', patients: 'Pacientes', session: 'Consulta', noteStyle: 'soap',
  },
}

export const PROFESSION_LIST = Object.values(PROFESSIONS)

/** Config de una profesión (fallback a médico = comportamiento actual). */
export function getProfession(type?: string | null): ProfessionConfig {
  return (type && PROFESSIONS[type as ProfessionType]) || PROFESSIONS.medico
}

/** Módulos opcionales activos de una clínica (settings). Fallback: los de su profesión. */
export function clinicModules(clinic?: { professionType?: string; enabledModules?: string[] } | null): string[] {
  if (clinic?.enabledModules) return clinic.enabledModules
  return getProfession(clinic?.professionType).modules
}

/** ¿La clínica tiene activo un módulo opcional? */
export function hasModule(
  clinic: { professionType?: string; enabledModules?: string[] } | null | undefined,
  module: string,
): boolean {
  return clinicModules(clinic).includes(module)
}

/** Terminología resuelta para la clínica. */
export function terms(clinic?: { professionType?: string } | null): ProfessionConfig {
  return getProfession(clinic?.professionType)
}
