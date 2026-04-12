'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@/lib/api'

export default function NewInventoryItemPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    genericName: '',
    category: 'medication',
    sku: '',
    currentStock: 0,
    minStock: 5,
    unit: 'unidad',
    purchasePrice: 0,
    salePrice: 0,
    expirationDate: '',
    supplier: '',
    location: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await api.post('/inventory/items', {
        ...form,
        expirationDate: form.expirationDate || null,
        purchasePrice: form.purchasePrice || null,
        salePrice: form.salePrice || null,
      })
      router.replace('/inventory')
    } catch (err: any) {
      setError(err?.message ?? 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500'
  const label = 'mb-1 block text-sm font-medium text-slate-700'

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-slate-800">Nuevo item de inventario</h1>
      <form onSubmit={onSubmit} className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={label}>Nombre</label>
            <input
              className={input}
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className={label}>Nombre genérico</label>
            <input
              className={input}
              value={form.genericName}
              onChange={(e) => setForm({ ...form, genericName: e.target.value })}
            />
          </div>
          <div>
            <label className={label}>Categoría</label>
            <select
              className={input}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="medication">Medicamento</option>
              <option value="supply">Insumo</option>
              <option value="equipment">Equipo</option>
            </select>
          </div>
          <div>
            <label className={label}>SKU</label>
            <input
              className={input}
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
            />
          </div>
          <div>
            <label className={label}>Unidad</label>
            <input
              className={input}
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
          </div>
          <div>
            <label className={label}>Stock inicial</label>
            <input
              type="number"
              min="0"
              className={input}
              value={form.currentStock}
              onChange={(e) => setForm({ ...form, currentStock: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className={label}>Stock mínimo</label>
            <input
              type="number"
              min="0"
              className={input}
              value={form.minStock}
              onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className={label}>Precio compra</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={input}
              value={form.purchasePrice}
              onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className={label}>Precio venta</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={input}
              value={form.salePrice}
              onChange={(e) => setForm({ ...form, salePrice: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className={label}>Vencimiento</label>
            <input
              type="date"
              className={input}
              value={form.expirationDate}
              onChange={(e) => setForm({ ...form, expirationDate: e.target.value })}
            />
          </div>
          <div>
            <label className={label}>Proveedor</label>
            <input
              className={input}
              value={form.supplier}
              onChange={(e) => setForm({ ...form, supplier: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <label className={label}>Ubicación</label>
            <input
              className={input}
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
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
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  )
}
