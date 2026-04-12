'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AlertTriangle, CreditCard, DollarSign, Plus, Search } from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  paid: { label: 'Pagado', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending: { label: 'Pendiente', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  overdue: { label: 'Vencido', className: 'bg-red-50 text-red-700 border-red-200' },
  cancelled: { label: 'Anulado', className: 'bg-slate-50 text-slate-500 border-slate-200' },
}

export default function BillingPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [report, setReport] = useState<any>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    void api.get<{ data: any[] }>('/billing/invoices').then((r) => setInvoices(r.data))
    void api.get('/billing/reports/daily').then(setReport).catch(() => {})
  }, [])

  const filtered = search
    ? invoices.filter(
        (i) =>
          i.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
          `${i.patient?.firstName} ${i.patient?.lastName}`.toLowerCase().includes(search.toLowerCase()),
      )
    : invoices

  const pendingTotal = invoices
    .filter((i) => i.status === 'pending')
    .reduce((sum, i) => sum + Number(i.total ?? 0), 0)

  const pendingCount = invoices.filter((i) => i.status === 'pending').length

  return (
    <div className="space-y-6">
      {/* Stats + Action */}
      <div className="grid grid-cols-3 gap-4">
        {/* Total Income */}
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-2.5">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ingresos Totales</p>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-800">
            {formatCurrency(report?.totalIncome ?? 0)}
          </p>
        </div>

        {/* Pending */}
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 p-2.5">
              <CreditCard className="h-5 w-5 text-amber-600" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pendiente de Pago</p>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-800">{formatCurrency(pendingTotal)}</p>
        </div>

        {/* Quick Action */}
        <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-200">Acción Rápida</p>
            <p className="mt-1 text-lg font-bold">Nueva Factura</p>
          </div>
          <Link
            href="/billing/new"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <Plus className="h-5 w-5 text-white" />
          </Link>
        </div>
      </div>

      {/* Search + Table */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">Historial de Facturas</h2>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-40 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3.5">Factura #</th>
                <th className="px-5 py-3.5">Paciente</th>
                <th className="px-5 py-3.5">Fecha</th>
                <th className="px-5 py-3.5">Monto</th>
                <th className="px-5 py-3.5">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm text-slate-400">
                    Sin comprobantes emitidos.
                  </td>
                </tr>
              )}
              {filtered.map((i) => {
                const badge = STATUS_BADGES[i.status] ?? STATUS_BADGES.pending!
                return (
                  <tr
                    key={i.id}
                    onClick={() => (window.location.href = `/billing/${i.id}`)}
                    className="group cursor-pointer hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <span className="font-semibold text-blue-600 group-hover:underline">
                        {i.invoiceNumber}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                          {i.patient?.firstName?.[0]}{i.patient?.lastName?.[0]}
                        </div>
                        <span className="font-medium text-slate-700">
                          {i.patient?.firstName} {i.patient?.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{formatDate(i.createdAt)}</td>
                    <td className="px-5 py-4 font-bold text-slate-800">
                      {formatCurrency(Number(i.total), i.currency)}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Collection Alert */}
      {pendingCount > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-amber-800">Alerta de Cobros</h3>
            <p className="mt-1 text-xs text-amber-600">
              Tienes {pendingCount} factura{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''} de cobro. Se recomienda enviar recordatorios.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
