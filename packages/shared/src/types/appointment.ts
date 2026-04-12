export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export type AppointmentType =
  | 'first_visit'
  | 'follow_up'
  | 'emergency'
  | 'procedure'
  | 'telemedicine'

export interface Appointment {
  id: string
  clinicId: string
  patientId: string
  doctorId: string
  startTime: string
  endTime: string
  durationMinutes: number
  status: AppointmentStatus
  appointmentType?: AppointmentType | null
  specialty?: string | null
  reason?: string | null
  notes?: string | null
  reminderSent: boolean
  reminderSentAt?: string | null
  localId?: string | null
  syncedAt?: string | null
  createdAt: string
  updatedAt: string
}
