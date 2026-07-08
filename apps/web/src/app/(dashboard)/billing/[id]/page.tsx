'use client'

import { use, useEffect, useState } from 'react'
import { CheckCircle2, Printer } from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [invoice, setInvoice] = useState<any>(null)
  const [clinic, setClinic] = useState<any>(null)
  const [paying, setPaying] = useState(false)

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

  if (!invoice) return <p className="text-slate-500">Cargando…</p>

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
          <h1 className="text-2xl font-semibold text-slate-800">Comprobante {invoice.invoiceNumber}</h1>
          <div className="flex gap-2">
            {!isPaid && (
              <select
                disabled={paying}
                onChange={(e) => e.target.value && markPaid(e.target.value)}
                className="rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700"
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
              <span className="flex items-center gap-2 rounded-lg bg-green-100 px-4 py-2 text-sm font-medium text-green-700">
                <CheckCircle2 className="h-4 w-4" /> Pagado
              </span>
            )}
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              <Printer className="h-4 w-4" /> Imprimir
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-white p-8 shadow-sm print:rounded-none print:p-4 print:shadow-none">
          {/* Header clínica */}
          <div className="mb-6 flex items-start justify-between border-b border-slate-300 pb-4">
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
                <h2 className="text-lg font-bold text-slate-800">{clinic?.name}</h2>
                {clinic?.taxId && <p className="text-xs text-slate-500">RUC/NIT: {clinic.taxId}</p>}
                {clinic?.address && <p className="text-xs text-slate-500">{clinic.address}</p>}
                {(clinic?.phone || clinic?.email) && (
                  <p className="text-xs text-slate-500">
                    {[clinic.phone, clinic.email].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            </div>
            <div className="rounded-lg border-2 border-primary-600 px-4 py-2 text-center">
              <div className="text-[10px] font-bold uppercase leading-tight text-slate-600">
                {tipoLabel}
              </div>
              {clinic?.taxId && <div className="text-[9px] text-slate-400">RUC {clinic.taxId}</div>}
              <div className="font-mono text-lg font-bold text-primary-700">
                {invoice.invoiceNumber}
              </div>
              <div className="text-[10px] text-slate-500">{formatDate(invoice.createdAt)}</div>
            </div>
          </div>

          {/* Cliente */}
          <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Cliente</p>
              <p className="font-semibold text-slate-800">
                {invoice.patient?.firstName} {invoice.patient?.lastName}
              </p>
              <p className="text-xs text-slate-500">
                {invoice.patient?.documentType} {invoice.patient?.documentNumber}
              </p>
            </div>
            {invoice.customerTaxId && (
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">RUC/NIT</p>
                <p className="font-semibold text-slate-800">{invoice.customerTaxId}</p>
              </div>
            )}
          </div>

          {/* Items */}
          <table className="mb-6 w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-300 text-left text-[10px] uppercase text-slate-500">
                <th className="pb-2">Descripción</th>
                <th className="pb-2 text-center">Cant.</th>
                <th className="pb-2 text-right">P. Unit.</th>
                <th className="pb-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((it: any) => (
                <tr key={it.id} className="border-b border-slate-100">
                  <td className="py-2 text-slate-800">{it.description}</td>
                  <td className="py-2 text-center text-slate-600">{it.quantity}</td>
                  <td className="py-2 text-right text-slate-600">
                    {formatCurrency(Number(it.unitPrice), invoice.currency)}
                  </td>
                  <td className="py-2 text-right font-medium text-slate-800">
                    {formatCurrency(Number(it.subtotal), invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totales */}
          <div className="ml-auto w-64 space-y-1 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>{formatCurrency(Number(invoice.subtotal), invoice.currency)}</span>
            </div>
            {Number(invoice.discount) > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Descuento</span>
                <span>-{formatCurrency(Number(invoice.discount), invoice.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>IGV ({Number(invoice.taxRate)}%)</span>
              <span>{formatCurrency(Number(invoice.taxAmount), invoice.currency)}</span>
            </div>
            <div className="flex justify-between border-t-2 border-slate-300 pt-2 text-lg font-bold text-slate-800">
              <span>TOTAL</span>
              <span>{formatCurrency(Number(invoice.total), invoice.currency)}</span>
            </div>
          </div>

          {/* Estado pago */}
          {isPaid && (
            <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              <strong>Pagado</strong> el {formatDate(invoice.paidAt)} · Método:{' '}
              {invoice.paymentMethod}
            </div>
          )}

          {/* Pie del comprobante */}
          <div className="mt-8 border-t border-slate-200 pt-3 text-center text-[10px] leading-relaxed text-slate-400">
            {invoice.sunatHash && <p>Resumen: {invoice.sunatHash}</p>}
            <p>Representación impresa del comprobante electrónico.</p>
            <p className="mt-1 font-semibold text-amber-600">
              DOCUMENTO EN PRUEBAS (BETA) — sin validez tributaria hasta su envío a SUNAT.
            </p>
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
