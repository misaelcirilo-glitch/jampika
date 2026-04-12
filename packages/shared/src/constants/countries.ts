import type { CountryCode } from '../types/user'

export interface CountryConfig {
  name: string
  currency: string
  currencySymbol: string
  taxName: string
  taxRate: number
  documentTypes: string[]
  invoiceTypes: string[]
  taxIdLabel: string
  taxIdFormat?: RegExp
  patientIdLabel: string
  patientIdFormat?: RegExp
  doctorLicenseLabel: string
  timezone: string
  electronicInvoice?: {
    provider: string
    required: boolean
  }
  regulations: string[]
}

export const COUNTRY_CONFIG: Record<CountryCode, CountryConfig> = {
  PE: {
    name: 'Perú',
    currency: 'PEN',
    currencySymbol: 'S/',
    taxName: 'IGV',
    taxRate: 18,
    documentTypes: ['DNI', 'CE', 'RUC', 'PASAPORTE'],
    invoiceTypes: ['boleta', 'factura'],
    taxIdLabel: 'RUC',
    taxIdFormat: /^\d{11}$/,
    patientIdLabel: 'DNI',
    patientIdFormat: /^\d{8}$/,
    doctorLicenseLabel: 'CMP',
    timezone: 'America/Lima',
    electronicInvoice: { provider: 'SUNAT', required: true },
    regulations: ['RENHICE', 'Ley 29733'],
  },
  CO: {
    name: 'Colombia',
    currency: 'COP',
    currencySymbol: '$',
    taxName: 'IVA',
    taxRate: 19,
    documentTypes: ['CC', 'CE', 'TI', 'NIT', 'PASAPORTE'],
    invoiceTypes: ['factura'],
    taxIdLabel: 'NIT',
    taxIdFormat: /^\d{9}-\d{1}$/,
    patientIdLabel: 'Cédula',
    patientIdFormat: /^\d{6,10}$/,
    doctorLicenseLabel: 'RM',
    timezone: 'America/Bogota',
    electronicInvoice: { provider: 'DIAN', required: true },
    regulations: ['REPS', 'Ley 1581'],
  },
  EC: {
    name: 'Ecuador',
    currency: 'USD',
    currencySymbol: '$',
    taxName: 'IVA',
    taxRate: 15,
    documentTypes: ['CI', 'RUC', 'PASAPORTE'],
    invoiceTypes: ['factura', 'nota_venta'],
    taxIdLabel: 'RUC',
    taxIdFormat: /^\d{13}$/,
    patientIdLabel: 'Cédula',
    patientIdFormat: /^\d{10}$/,
    doctorLicenseLabel: 'MSP',
    timezone: 'America/Guayaquil',
    regulations: ['MSP', 'LOPD'],
  },
  BO: {
    name: 'Bolivia',
    currency: 'BOB',
    currencySymbol: 'Bs.',
    taxName: 'IVA',
    taxRate: 13,
    documentTypes: ['CI', 'NIT', 'PASAPORTE'],
    invoiceTypes: ['factura'],
    taxIdLabel: 'NIT',
    patientIdLabel: 'CI',
    doctorLicenseLabel: 'Mat. Prof.',
    timezone: 'America/La_Paz',
    regulations: ['ASUSS'],
  },
  MX: {
    name: 'México',
    currency: 'MXN',
    currencySymbol: '$',
    taxName: 'IVA',
    taxRate: 16,
    documentTypes: ['CURP', 'INE', 'RFC', 'PASAPORTE'],
    invoiceTypes: ['factura'],
    taxIdLabel: 'RFC',
    taxIdFormat: /^[A-Z]{3,4}\d{6}[A-Z0-9]{3}$/,
    patientIdLabel: 'CURP',
    doctorLicenseLabel: 'Cédula Prof.',
    timezone: 'America/Mexico_City',
    electronicInvoice: { provider: 'SAT', required: true },
    regulations: ['NOM-024', 'LFPDP'],
  },
  CL: {
    name: 'Chile',
    currency: 'CLP',
    currencySymbol: '$',
    taxName: 'IVA',
    taxRate: 19,
    documentTypes: ['RUT', 'PASAPORTE'],
    invoiceTypes: ['boleta', 'factura'],
    taxIdLabel: 'RUT',
    taxIdFormat: /^\d{7,8}-[\dkK]$/,
    patientIdLabel: 'RUT',
    doctorLicenseLabel: 'SIS',
    timezone: 'America/Santiago',
    regulations: ['Ley 20.584', 'Superintendencia de Salud'],
  },
}

export function getCountryConfig(code: CountryCode): CountryConfig {
  return COUNTRY_CONFIG[code]
}
