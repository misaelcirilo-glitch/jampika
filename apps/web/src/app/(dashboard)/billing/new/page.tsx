'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { Patient } from '@jampika/shared'
import { listPatients } from '@/features/patients/patients.service'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

interface LineItem {
  description: string
  quantity: number
  unitPrice: number
  serviceCode?: string
}

interface Service {
  id: string
  name: string
  price: number
}

export default function NewInvoicePage() {
  const router = useRouter()
  const [patients, setPatients] = useState<Patient[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [patientId, setPatientId] = useState('')
  const [invoiceType, setInvoiceType] = useState<'boleta' | 'factura'>('boleta')
  const [taxRate, setTaxRate] = useState(18)
  const [discount, setDiscount] = useState(0)
  const [items, setItems] = useState<LineItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void listPatients().then(setPatients)
    void api.get<{ data: Service[] }>('/billing/services').then((r) => setServices(r.data))
  }, [])

  function addServiceAsItem(serviceId: string) {
    const s = services.find((x) => x.id === serviceId)
    if (!s) return
    setItems([...items, { description: s.name, quantity: 1, unitPrice: Number(s.price) }])
  }

  function addBlankItem() {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0 }])
  }

  function updateItem(idx: number, patch: Partial<LineItem>) {
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx))
  }

  const subtotal = items.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0)
  const taxBase = Math.max(0, subtotal - discount)
  const taxAmount = Number((taxBase * (taxRate / 100)).toFixed(2))
  const total = Number((taxBase + taxAmount).toFixed(2))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!patientId || items.length === 0) {
      setError('Selecciona un paciente y añade al menos un item')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await api.post('/billing/invoices', {
        patientId,
        invoiceType,
        taxRate,
        discount,
        currency: 'PEN',
        paymentMethod,
        items,
      })
      router.replace('/billing')
    } catch (err: any) {
      setError(err?.message ?? 'Error al crear comprobante')
    } finally {
      setSaving(false)
    }
  }

  const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500'
  const label = 'mb-1 block text-sm font-medium text-slate-700'

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold text-slate-800">Nuevo comprobante</h1>
      <form onSubmit={onSubmit} className="space-y-5 rounded-xl bg-white p-6 shadow-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Paciente</label>
            <select
              className={input}
              required
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
            >
              <option value="">— Selecciona —</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.lastName}, {p.firstName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Tipo</label>
            <select
              className={input}
              value={invoiceType}
              onChange={(e) => setInvoiceType(e.target.value as any)}
            >
              <option value="boleta">Boleta</option>
              <option value="factura">Factura</option>
            </select>
          </div>
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase text-slate-500">Items</h2>
            <div className="flex gap-2">
              <select
                className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                onChange={(e) => {
                  if (e.target.value) {
                    addServiceAsItem(e.target.value)
                    e.target.value = ''
                  }
                }}
              >
                <option value="">+ Desde catálogo</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {formatCurrency(Number(s.price))}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addBlankItem}
                className="rounded-lg border border-slate-300 px-3 py-1 text-sm"
              >
                + Libre
              </button>
            </div>
          </div>

          {items.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">
              Añade items desde el catálogo o manualmente.
            </p>
          )}

          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_80px_110px_110px_40px] items-center gap-2">
                <input
                  className={input}
                  placeholder="Descripción"
                  value={it.description}
                  onChange={(e) => updateItem(idx, { description: e.target.value })}
                />
                <input
                  type="number"
                  min="1"
                  className={input}
                  value={it.quantity}
                  onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={input}
                  value={it.unitPrice}
                  onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value) })}
                />
                <span className="text-right text-sm font-medium text-slate-700">
                  {formatCurrency(it.quantity * it.unitPrice)}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="text-slate-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={label}>IGV %</label>
            <input
              type="number"
              className={input}
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value))}
            />
          </div>
          <div>
            <label className={label}>Descuento</label>
            <input
              type="number"
              className={input}
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
            />
          </div>
          <div>
            <label className={label}>Pago</label>
            <select
              className={input}
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="transfer">Transferencia</option>
              <option value="yape">Yape</option>
              <option value="plin">Plin</option>
            </select>
          </div>
        </div>

        <div className="rounded-lg bg-slate-50 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>IGV ({taxRate}%)</span>
            <span>{formatCurrency(taxAmount)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-lg font-semibold text-slate-800">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Emitir comprobante'}
          </button>
        </div>
      </form>
    </div>
  )
}
