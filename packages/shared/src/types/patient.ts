export type DocumentType =
  | 'DNI'
  | 'CE'
  | 'RUC'
  | 'CC'
  | 'TI'
  | 'NIT'
  | 'CI'
  | 'RUT'
  | 'CURP'
  | 'INE'
  | 'RFC'
  | 'PASAPORTE'

export type Gender = 'M' | 'F' | 'other'

export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'

export interface Patient {
  id: string
  clinicId: string
  documentType: DocumentType
  documentNumber: string
  firstName: string
  lastName: string
  birthDate?: string | null
  gender?: Gender | null
  bloodType?: BloodType | null
  phone?: string | null
  email?: string | null
  address?: string | null
  emergencyContactName?: string | null
  emergencyContactPhone?: string | null
  insuranceProvider?: string | null
  insuranceNumber?: string | null
  allergies: string[]
  chronicConditions: string[]
  notes?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}
