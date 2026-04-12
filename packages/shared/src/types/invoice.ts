export type InvoiceType = 'boleta' | 'factura' | 'nota_venta'
export type InvoiceStatus = 'pending' | 'paid' | 'partial' | 'cancelled' | 'refunded'
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'yape' | 'plin' | 'nequi'
export type Currency = 'PEN' | 'COP' | 'USD' | 'BOB' | 'MXN' | 'CLP'

export interface InvoiceItem {
  id: string
  invoiceId: string
  description: string
  quantity: number
  unitPrice: number
  subtotal: number
  serviceCode?: string | null
  createdAt: string
}

export interface Invoice {
  id: string
  clinicId: string
  patientId: string
  appointmentId?: string | null
  invoiceNumber: string
  invoiceType: InvoiceType
  customerTaxId?: string | null
  customerName?: string | null
  customerAddress?: string | null
  subtotal: number
  taxRate: number
  taxAmount: number
  discount: number
  total: number
  currency: Currency
  status: InvoiceStatus
  paymentMethod?: PaymentMethod | null
  paidAt?: string | null
  electronicInvoiceId?: string | null
  electronicInvoiceStatus?: string | null
  localId?: string | null
  syncedAt?: string | null
  createdAt: string
  updatedAt: string
  items?: InvoiceItem[]
}
