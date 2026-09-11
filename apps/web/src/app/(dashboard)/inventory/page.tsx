'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AlertTriangle, Camera, ChevronLeft, ChevronRight, ClipboardCheck, Clock, Download, Filter, Plus, Search } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'

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
  if (!cat) return 'bg-muted text-muted-foreground'
  return CATEGORY_COLORS[cat] ?? 'bg-muted text-muted-foreground'
}

function stockBar(current: number, min: number): { width: string; color: string } {
  const ratio = min > 0 ? Math.min(current / (min * 3), 1) : 1
  const color = current <= min ? 'bg-destructive' : ratio < 0.5 ? 'bg-warning' : 'bg-primary'
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
        <div className="flex flex-1 items-center gap-2 rounded-md border border-input bg-card px-4 py-2.5 shadow-sm">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar insumos, fármacos o equipos…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
        <Button asChild variant="outline">
          <Link href="/inventory/scan">
            <Camera className="h-4 w-4 text-primary" /> Scan Invoice
          </Link>
        </Button>
        <Button asChild>
          <Link href="/inventory/new">
            <Plus className="h-4 w-4" /> New Item
          </Link>
        </Button>
      </div>

      {/* Alert + Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Low Stock Alert */}
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-5">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-destructive">Alerta de Stock</span>
            </div>
            <h3 className="text-lg font-bold text-destructive">Insumos Críticos</h3>
            <p className="mt-2 text-3xl font-black text-destructive">{lowStock.length}</p>
            <p className="text-xs text-destructive/80">ítems por debajo del mínimo</p>
            {lowStock.length > 0 && (
              <button className="mt-2 text-xs font-semibold text-destructive hover:underline">
                Ver Lista →
              </button>
            )}
          </CardContent>
        </Card>

        {/* Total Products */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2.5">
                <ClipboardCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Global</p>
                <p className="text-xs text-muted-foreground">Total Productos</p>
              </div>
            </div>
            <p className="mt-3 text-3xl font-black text-foreground">{items.length.toLocaleString()}</p>
          </CardContent>
        </Card>

        {/* Expiring */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-warning/15 p-2.5">
                <Clock className="h-5 w-5 text-warning-foreground" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Próximo Vencimiento</p>
                <p className="text-xs text-muted-foreground">Vencen en 30 días</p>
              </div>
            </div>
            <p className="mt-3 text-3xl font-black text-foreground">{String(expiringItems.length).padStart(2, '0')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">Catálogo de Suministros</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Stock Level</TableHead>
                <TableHead className="text-center">Min Stock</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    Sin items en inventario.
                  </TableCell>
                </TableRow>
              )}
              {paginated.map((i) => {
                const bar = stockBar(i.currentStock, i.minStock)
                const isLow = i.currentStock <= i.minStock
                const isExpiring = i.expirationDate && (new Date(i.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 30
                return (
                  <TableRow key={i.id}>
                    <TableCell>
                      <p className="font-semibold text-foreground">{i.name}</p>
                      {i.sku && <p className="text-[10px] text-muted-foreground">Ref: {i.sku}</p>}
                    </TableCell>
                    <TableCell>
                      {i.category && (
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${getCategoryColor(i.category)}`}>
                          {i.category}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${isLow ? 'text-destructive' : 'text-foreground'}`}>
                          {i.currentStock} {i.unit ?? 'Units'}
                        </span>
                        <div className="h-1.5 w-16 rounded-full bg-muted">
                          <div className={`h-full rounded-full ${bar.color}`} style={{ width: bar.width }} />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">{i.minStock}</TableCell>
                    <TableCell className={isExpiring ? 'font-semibold text-destructive' : 'text-muted-foreground'}>
                      {i.expirationDate ? new Date(i.expirationDate).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                    </TableCell>
                    <TableCell>
                      <button className="text-xs font-semibold text-primary hover:text-primary/80">Editar</button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <p className="text-xs text-muted-foreground">
              Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} items
            </p>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-8 w-8 text-muted-foreground">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-8 w-8 text-muted-foreground">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
