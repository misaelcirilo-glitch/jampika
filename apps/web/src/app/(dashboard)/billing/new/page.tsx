'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { Patient } from '@jampika/shared'
import { listPatients } from '@/features/patients/patients.service'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type AfectacionIgv = 'gravado' | 'exonerado' | 'inafecto'

interface LineItem {
  description: string
  quantity: number
  unitPrice: number
  afectacionIgv: AfectacionIgv
  serviceCode?: string
}

const AFECTACION_OPCIONES: { value: AfectacionIgv; label: string }[] = [
  { value: 'gravado', label: 'Gravado (IGV)' },
  { value: 'exonerado', label: 'Exonerado' },
  { value: 'inafecto', label: 'Inafecto' },
]

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
    setItems([...items, { description: s.name, quantity: 1, unitPrice: Number(s.price), afectacionIgv: 'gravado' }])
  }

  function addBlankItem() {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0, afectacionIgv: 'gravado' }])
  }

  function updateItem(idx: number, patch: Partial<LineItem>) {
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx))
  }

  // Desglose por afectación IGV: solo los ítems gravados pagan IGV.
  const sumaAfectacion = (a: AfectacionIgv) =>
    items.filter((i) => i.afectacionIgv === a).reduce((acc, i) => acc + i.quantity * i.unitPrice, 0)
  const gravadoBruto = sumaAfectacion('gravado')
  const exonerado = sumaAfectacion('exonerado')
  const inafecto = sumaAfectacion('inafecto')
  const subtotal = gravadoBruto + exonerado + inafecto
  const baseGravada = Math.max(0, gravadoBruto - discount) // el descuento reduce la base gravada
  const taxAmount = Number((baseGravada * (taxRate / 100)).toFixed(2))
  const total = Number((baseGravada + taxAmount + exonerado + inafecto).toFixed(2))

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

  const selectClass =
    'flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Nuevo comprobante</h1>
      <Card>
        <CardContent className="p-6">
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Paciente</Label>
                <select
                  className={selectClass}
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
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <select
                  className={selectClass}
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
                <h2 className="text-sm font-semibold uppercase text-muted-foreground">Items</h2>
                <div className="flex gap-2">
                  <select
                    className="h-9 rounded-md border border-input bg-card px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  <Button type="button" variant="outline" size="sm" onClick={addBlankItem}>
                    + Libre
                  </Button>
                </div>
              </div>

              {items.length === 0 && (
                <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  Añade items desde el catálogo o manualmente.
                </p>
              )}

              <div className="space-y-2">
                {items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_70px_100px_120px_100px_40px] items-center gap-2">
                    <Input
                      placeholder="Descripción"
                      value={it.description}
                      onChange={(e) => updateItem(idx, { description: e.target.value })}
                    />
                    <Input
                      type="number"
                      min="1"
                      value={it.quantity}
                      onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={it.unitPrice}
                      onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value) })}
                    />
                    <select
                      className={selectClass}
                      value={it.afectacionIgv}
                      onChange={(e) => updateItem(idx, { afectacionIgv: e.target.value as AfectacionIgv })}
                    >
                      {AFECTACION_OPCIONES.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <span className="text-right text-sm font-medium text-foreground">
                      {formatCurrency(it.quantity * it.unitPrice)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>IGV %</Label>
                <Input
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Descuento</Label>
                <Input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Pago</Label>
                <select
                  className={selectClass}
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

            <div className="rounded-md bg-muted p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {exonerado > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Exonerado</span>
                  <span>{formatCurrency(exonerado)}</span>
                </div>
              )}
              {inafecto > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Inafecto</span>
                  <span>{formatCurrency(inafecto)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>IGV ({taxRate}%)</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-border pt-2 text-lg font-semibold text-foreground">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando…' : 'Emitir comprobante'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
