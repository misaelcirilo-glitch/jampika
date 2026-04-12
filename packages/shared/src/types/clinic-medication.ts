export interface ClinicMedication {
  id: string
  clinicId: string
  name: string
  generic?: string | null
  presentation?: string | null
  defaultDosage?: string | null
  defaultFrequency?: string | null
  category?: string | null
  usageCount: number
  createdAt: string
  updatedAt: string
}
