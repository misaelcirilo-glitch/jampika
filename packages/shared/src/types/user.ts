export type UserRole = 'admin' | 'doctor' | 'receptionist' | 'nurse'

export interface User {
  id: string
  clinicId: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  specialty?: string | null
  licenseNumber?: string | null
  phone?: string | null
  avatarUrl?: string | null
  isActive: boolean
  lastLogin?: string | null
  createdAt: string
  updatedAt: string
}

export interface Clinic {
  id: string
  name: string
  slug: string
  ownerId: string
  plan: 'starter' | 'professional' | 'premium'
  country: CountryCode
  timezone: string
  taxId?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  logoUrl?: string | null
  settings: Record<string, unknown>
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type CountryCode = 'PE' | 'CO' | 'EC' | 'BO' | 'MX' | 'CL'
