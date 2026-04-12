export type RecordType =
  | 'consultation'
  | 'follow_up'
  | 'emergency'
  | 'procedure'
  | 'lab_result'

export interface Diagnosis {
  code: string // CIE-10
  description: string
}

export interface VitalSigns {
  temperature?: number
  bloodPressureSys?: number
  bloodPressureDia?: number
  heartRate?: number
  respiratoryRate?: number
  weight?: number
  height?: number
  spo2?: number
}

export interface Prescription {
  medication: string
  dosage: string
  frequency: string
  duration: string
  instructions?: string
}

export interface Attachment {
  fileUrl: string
  fileType: string
  description?: string
}

export interface MedicalRecord {
  id: string
  clinicId: string
  patientId: string
  doctorId: string
  appointmentId?: string | null
  recordType: RecordType
  recordDate: string
  subjective?: string | null
  objective?: string | null
  assessment?: string | null
  plan?: string | null
  diagnoses: Diagnosis[]
  vitalSigns: VitalSigns
  prescriptions: Prescription[]
  attachments: Attachment[]
  isSigned: boolean
  signedAt?: string | null
  notes?: string | null
  localId?: string | null
  syncedAt?: string | null
  createdAt: string
}
