export type FileCategory = 'photo' | 'rx' | 'lab' | 'document'

export interface PatientFile {
  id: string
  clinicId: string
  patientId: string
  uploadedBy: string | null
  category: FileCategory
  fileName: string
  mimeType: string
  size: number
  url: string
  createdAt: string
}

export const FILE_CATEGORIES: FileCategory[] = ['photo', 'rx', 'lab', 'document']

export const CATEGORY_LABELS: Record<FileCategory, string> = {
  photo: 'Foto',
  rx: 'Radiografía',
  lab: 'Analítica',
  document: 'Documento',
}
