'use client'

import { use, useEffect, useState } from 'react'
import { CheckCircle2, Printer } from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [invoice, setInvoice] = useState<any>(null)
  const [clinic, setClinic] = useState<any>(null)
  const [paying, setPaying] = useState(false)
  // SUNAT solo se muestra en clínicas de Perú.
  const showSunat = useAuthStore((s) => s.clinic)?.country === 'PE'

  async function load() {
    const [inv, c] = await Promise.all([
      api.get<any>(`/billing/invoices/${id}`),
      api.get<any>('/settings/clinic'),
    ])
    setInvoice(inv)
    setClinic(c)
  }

  useEffect(() => {
    void load()
  }, [id])

  async function markPaid(method: string) {
    setPaying(true)
    try {
      await api.post(`/billing/invoices/${id}/pay`, { paymentMethod: method })
      await load()
    } finally {
      setPaying(false)
    }
  }

  if (!invoice) return <p className="text-muted-foreground">Cargando…</p>

  const isPaid = invoice.status === 'paid'
  const tipoLabel =
    invoice.invoiceType === 'factura'
      ? 'Factura Electrónica'
      : invoice.invoiceType === 'boleta'
        ? 'Boleta de Venta Electrónica'
        : 'Nota de Venta'

  return (
    <div className="min-h-screen print:bg-white">
      <div className="mx-auto max-w-3xl py-2 print:py-0">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <h1 className="text-2xl font-semibold text-foreground">Comprobante {invoice.invoiceNumber}</h1>
          <div className="flex gap-2">
            {!isPaid && (
              <select
                disabled={paying}
                onChange={(e) => e.target.value && markPaid(e.target.value)}
                className="h-10 rounded-md border border-success/30 bg-success/10 px-4 py-2 text-sm font-medium text-success shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                defaultValue=""
              >
                <option value="">Marcar como pagado…</option>
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta</option>
                <option value="transfer">Transferencia</option>
                <option value="yape">Yape</option>
                <option value="plin">Plin</option>
              </select>
            )}
            {isPaid && (
              <span className="flex items-center gap-2 rounded-md bg-success/15 px-4 py-2 text-sm font-medium text-success">
                <CheckCircle2 className="h-4 w-4" /> Pagado
              </span>
            )}
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Imprimir
            </Button>
          </div>
        </div>

        <div className="rounded-lg bg-card p-8 shadow-card print:rounded-none print:p-4 print:shadow-none">
          {/* Header clínica */}
          <div className="mb-6 flex items-start justify-between border-b border-border pb-4">
            <div className="flex items-start gap-4">
              {clinic?.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={clinic.logoUrl}
                  alt="Logo"
                  className="h-20 w-20 flex-shrink-0 object-contain"
                />
              )}
              <div>
                <h2 className="text-lg font-bold text-foreground">{clinic?.name}</h2>
                {clinic?.taxId && <p className="text-xs text-muted-foreground">RUC/NIT: {clinic.taxId}</p>}
                {clinic?.address && <p className="text-xs text-muted-foreground">{clinic.address}</p>}
                {(clinic?.phone || clinic?.email) && (
                  <p className="text-xs text-muted-foreground">
                    {[clinic.phone, clinic.email].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            </div>
            <div className="rounded-md border-2 border-primary px-4 py-2 text-center">
              <div className="text-[10px] font-bold uppercase leading-tight text-muted-foreground">
                {tipoLabel}
              </div>
              {clinic?.taxId && <div className="text-[9px] text-muted-foreground">RUC {clinic.taxId}</div>}
              <div className="font-mono text-lg font-bold text-primary">
                {invoice.invoiceNumber}
              </div>
              <div className="text-[10px] text-muted-foreground">{formatDate(invoice.createdAt)}</div>
            </div>
          </div>

          {/* Cliente */}
          <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Cliente</p>
              <p className="font-semibold text-foreground">
                {invoice.patient?.firstName} {invoice.patient?.lastName}
              </p>
              <p className="text-xs text-muted-foreground">
                {invoice.patient?.documentType} {invoice.patient?.documentNumber}
              </p>
            </div>
            {invoice.customerTaxId && (
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">RUC/NIT</p>
                <p className="font-semibold text-foreground">{invoice.customerTaxId}</p>
              </div>
            )}
          </div>

          {/* Items */}
          <table className="mb-6 w-full text-sm">
            <thead>
              <tr className="border-b-2 border-border text-left text-[10px] uppercase text-muted-foreground">
                <th className="pb-2">Descripción</th>
                <th className="pb-2 text-center">Cant.</th>
                <th className="pb-2 text-right">P. Unit.</th>
                <th className="pb-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((it: any) => (
                <tr key={it.id} className="border-b border-border">
                  <td className="py-2 text-foreground">{it.description}</td>
                  <td className="py-2 text-center text-muted-foreground">{it.quantity}</td>
                  <td className="py-2 text-right text-muted-foreground">
                    {formatCurrency(Number(it.unitPrice), invoice.currency)}
                  </td>
                  <td className="py-2 text-right font-medium text-foreground">
                    {formatCurrency(Number(it.subtotal), invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totales */}
          <div className="ml-auto w-64 space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatCurrency(Number(invoice.subtotal), invoice.currency)}</span>
            </div>
            {Number(invoice.discount) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Descuento</span>
                <span>-{formatCurrency(Number(invoice.discount), invoice.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>IGV ({Number(invoice.taxRate)}%)</span>
              <span>{formatCurrency(Number(invoice.taxAmount), invoice.currency)}</span>
            </div>
            <div className="flex justify-between border-t-2 border-border pt-2 text-lg font-bold text-foreground">
              <span>TOTAL</span>
              <span>{formatCurrency(Number(invoice.total), invoice.currency)}</span>
            </div>
          </div>

          {/* Estado pago */}
          {isPaid && (
            <div className="mt-6 rounded-md border border-success/30 bg-success/10 p-3 text-sm text-success">
              <strong>Pagado</strong> el {formatDate(invoice.paidAt)} · Método:{' '}
              {invoice.paymentMethod}
            </div>
          )}

          {/* Pie del comprobante */}
          <div className="mt-8 border-t border-border pt-3 text-center text-[10px] leading-relaxed text-muted-foreground">
            {showSunat && invoice.sunatHash && <p>Resumen: {invoice.sunatHash}</p>}
            <p>Representación impresa del comprobante.</p>
            {showSunat && (
              <p className="mt-1 font-semibold text-warning-foreground">
                DOCUMENTO EN PRUEBAS (BETA) — sin validez tributaria hasta su envío a SUNAT.
              </p>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          nav, aside, header { display: none !important; }
          main { padding: 0 !important; overflow: visible !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  )
}
