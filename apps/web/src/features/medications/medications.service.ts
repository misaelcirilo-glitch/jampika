import type { ClinicMedication } from '@jampika/shared'
import { searchMedications, type Medication } from '@jampika/shared'
import { db } from '../../lib/db/schema'
import { api } from '../../lib/api'

export interface MedicationResult {
  name: string
  generic?: string
  presentation?: string
  defaultDosage?: string
  defaultFrequency?: string
  category?: string
  source: 'catalog' | 'clinic'
}

/** Busca en catálogo estático + medicamentos de la clínica (Dexie local) */
export async function searchAllMedications(query: string): Promise<MedicationResult[]> {
  const q = query.toLowerCase().trim()
  if (!q) return staticToResults(searchMedications(''))

  // Catálogo estático
  const staticResults = staticToResults(searchMedications(q))

  // Medicamentos de la clínica (local Dexie)
  const clinicAll = await db.clinic_medications.toArray()
  const clinicFiltered = clinicAll
    .filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.generic && m.generic.toLowerCase().includes(q)) ||
        (m.category && m.category.toLowerCase().includes(q)),
    )
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 20)
    .map(clinicToResult)

  // Deduplicar: si el nombre+presentación ya está en estáticos, no repetir
  const seen = new Set(staticResults.map((r) => `${r.name}|${r.presentation ?? ''}`))
  const unique = clinicFiltered.filter((r) => !seen.has(`${r.name}|${r.presentation ?? ''}`))

  return [...unique, ...staticResults]
}

/** Sincroniza medicamentos de la clínica desde el servidor a Dexie */
export async function syncClinicMedications(): Promise<void> {
  try {
    const res = await api.get<{ data: ClinicMedication[] }>('/medications')
    await db.clinic_medications.clear()
    if (res.data.length > 0) {
      await db.clinic_medications.bulkPut(res.data)
    }
  } catch {
    // Offline — se usa lo que haya en Dexie
  }
}

function staticToResults(meds: Medication[]): MedicationResult[] {
  return meds.map((m) => ({
    name: m.name,
    generic: m.generic,
    presentation: m.presentation,
    defaultDosage: m.defaultDosage,
    defaultFrequency: m.defaultFrequency,
    category: m.category,
    source: 'catalog' as const,
  }))
}

function clinicToResult(m: ClinicMedication): MedicationResult {
  return {
    name: m.name,
    generic: m.generic ?? undefined,
    presentation: m.presentation ?? undefined,
    defaultDosage: m.defaultDosage ?? undefined,
    defaultFrequency: m.defaultFrequency ?? undefined,
    category: m.category ?? undefined,
    source: 'clinic',
  }
}
