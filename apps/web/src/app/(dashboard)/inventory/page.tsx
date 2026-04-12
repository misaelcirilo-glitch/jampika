'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AlertTriangle, Camera, ChevronLeft, ChevronRight, ClipboardCheck, Clock, Download, Filter, Plus, Search } from 'lucide-react'
import { api } from '@/lib/api'

const CATEGORY_COLORS: Record<string, string> = {
  'Antibiótico': 'bg-red-100 text-red-700',
  'Analgésico': 'bg-amber-100 text-amber-700',
  'Anestésico': 'bg-purple-100 text-purple-700',
  'Insumo - Protección': 'bg-blue-100 text-blue-700',
  'Insumo - Curación': 'bg-emerald-100 text-emerald-700',
  'Insumo - Inyección': 'bg-cyan-100 text-cyan-700',
  'Insumo - Quirúrgico': 'bg-rose-100 text-rose-700',
  'Insumo - Laboratorio': 'bg-indigo-100 text-indigo-700',
  'Insumo - Diagnóstico': 'bg-teal-100 text-teal-700',
  'Solución IV': 'bg-sky-100 text-sky-700',
  'Antiséptico': 'bg-orange-100 text-orange-700',
  'Gastrointestinal': 'bg-lime-100 text-lime-700',
  'Respiratorio': 'bg-cyan-100 text-cyan-700',
}

function getCategoryColor(cat: string | null): string {
  if (!cat) return 'bg-slate-100 text-slate-600'
  return CATEGORY_COLORS[cat] ?? 'bg-slate-100 text-slate-600'
}

function stockBar(current: number, min: number): { width: string; color: string } {
  const ratio = min > 0 ? Math.min(current / (min * 3), 1) : 1
  const color = current <= min ? 'bg-red-400' : ratio < 0.5 ? 'bg-amber-400' : 'bg-blue-500'
  return { width: `${ratio * 100}%`, color }
}

const PAGE_SIZE = 10

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    void api.get<{ data: any[] }>('/inventory/items').then((r) => setItems(r.data))
  }, [])

  const filtered = search
    ? items.filter(
        (i) =>
          i.name.toLowerCase().includes(search.toLowerCase()) ||
          (i.category && i.category.toLowerCase().includes(search.toLowerCase())),
      )
    : items

  const lowStock = items.filter((i) => i.currentStock <= i.minStock)
  const expiringItems = items.filter((i) => {
    if (!i.expirationDate) return false
    const diff = (new Date(i.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return diff >= 0 && diff <= 30
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Search + Actions */}
      <div className="flex items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar insumos, fármacos o equipos…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
          />
        </div>
        <Link
          href="/inventory/scan"
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Camera className="h-4 w-4 text-blue-600" /> Scan Invoice
        </Link>
        <Link
          href="/inventory/new"
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> New Item
        </Link>
      </div>

      {/* Alert + Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Low Stock Alert */}
        <div className="rounded-2xl bg-gradient-to-br from-red-50 to-red-100 border border-red-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">Alerta de Stock</span>
          </div>
          <h3 className="text-lg font-bold text-red-800">Insumos Críticos</h3>
          <p className="mt-2 text-3xl font-black text-red-700">{lowStock.length}</p>
          <p className="text-xs text-red-500">ítems por debajo del mínimo</p>
          {lowStock.length > 0 && (
            <button className="mt-2 text-xs font-semibold text-red-600 hover:underline">
              Ver Lista →
            </button>
          )}
        </div>

        {/* Total Products */}
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2.5">
              <ClipboardCheck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Global</p>
              <p className="text-xs text-slate-500">Total Productos</p>
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-slate-800">{items.length.toLocaleString()}</p>
        </div>

        {/* Expiring */}
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 p-2.5">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Próximo Vencimiento</p>
              <p className="text-xs text-slate-500">Vencen en 30 días</p>
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-slate-800">{String(expiringItems.length).padStart(2, '0')}</p>
        </div>
      </div>

      {/* Table */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">Catálogo de Suministros</h2>
          <div className="flex items-center gap-2">
            <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
              <Filter className="h-4 w-4" />
            </button>
            <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3.5">Product Name</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Stock Level</th>
                <th className="px-5 py-3.5 text-center">Min Stock</th>
                <th className="px-5 py-3.5">Expiry Date</th>
                <th className="px-5 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-slate-400">
                    Sin items en inventario.
                  </td>
                </tr>
              )}
              {paginated.map((i) => {
                const bar = stockBar(i.currentStock, i.minStock)
                const isLow = i.currentStock <= i.minStock
                const isExpiring = i.expirationDate && (new Date(i.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 30
                return (
                  <tr key={i.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800">{i.name}</p>
                      {i.sku && <p className="text-[10px] text-slate-400">Ref: {i.sku}</p>}
                    </td>
                    <td className="px-5 py-4">
                      {i.category && (
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${getCategoryColor(i.category)}`}>
                          {i.category}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${isLow ? 'text-red-600' : 'text-slate-800'}`}>
                          {i.currentStock} {i.unit ?? 'Units'}
                        </span>
                        <div className="h-1.5 w-16 rounded-full bg-slate-100">
                          <div className={`h-full rounded-full ${bar.color}`} style={{ width: bar.width }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center text-slate-500">{i.minStock}</td>
                    <td className={`px-5 py-4 ${isExpiring ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                      {i.expirationDate ? new Date(i.expirationDate).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <button className="text-xs font-semibold text-blue-600 hover:text-blue-700">Editar</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
            <p className="text-xs text-slate-400">
              Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} items
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
