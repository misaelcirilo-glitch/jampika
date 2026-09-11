'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AlertTriangle, CreditCard, DollarSign, Download, Plus, Search } from 'lucide-react'
import { api, apiDownload, ApiError } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import type { BadgeProps } from '@/components/ui/badge'

const STATUS_BADGES: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  paid: { label: 'Pagado', variant: 'success' },
  pending: { label: 'Pendiente', variant: 'warning' },
  overdue: { label: 'Vencido', variant: 'destructive' },
  cancelled: { label: 'Anulado', variant: 'outline' },
}

export default function BillingPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [report, setReport] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [periodo, setPeriodo] = useState(() => new Date().toISOString().slice(0, 7)) // YYYY-MM
  const [exportando, setExportando] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  // SUNAT (autoridad tributaria de Perú) solo se muestra en clínicas de Perú.
  const isPeru = useAuthStore((s) => s.clinic)?.country === 'PE'

  const exportarRegistroVentas = async () => {
    setExportando(true)
    setExportError(null)
    try {
      await apiDownload(
        `/billing/registro-ventas?periodo=${periodo}&formato=csv`,
        `registro-ventas-${periodo}.csv`,
      )
    } catch (e) {
      setExportError(
        e instanceof ApiError ? e.message : 'No se pudo generar el registro de ventas.',
      )
    } finally {
      setExportando(false)
    }
  }

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
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-success/10 p-2.5">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ingresos Totales</p>
            </div>
            <p className="mt-3 text-2xl font-black text-foreground">
              {formatCurrency(report?.totalIncome ?? 0)}
            </p>
          </CardContent>
        </Card>

        {/* Pending */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-warning/15 p-2.5">
                <CreditCard className="h-5 w-5 text-warning-foreground" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pendiente de Pago</p>
            </div>
            <p className="mt-3 text-2xl font-black text-foreground">{formatCurrency(pendingTotal)}</p>
          </CardContent>
        </Card>

        {/* Quick Action */}
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="flex h-full items-center justify-between p-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-foreground/70">Acción Rápida</p>
              <p className="mt-1 text-lg font-bold">Nueva Factura</p>
            </div>
            <Link
              href="/billing/new"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/20 transition-colors hover:bg-primary-foreground/30"
            >
              <Plus className="h-5 w-5" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Registro de Ventas SUNAT (export para el contador) — solo Perú */}
      {isPeru && (
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-foreground">Registro de Ventas (SUNAT)</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Exporta el CSV del periodo para cargarlo en tu Facturador SUNAT o software contable.
                </p>
              </div>
              <div className="flex items-end gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Periodo</span>
                  <Input
                    type="month"
                    value={periodo}
                    onChange={(e) => setPeriodo(e.target.value)}
                    className="w-auto"
                  />
                </label>
                <Button onClick={exportarRegistroVentas} disabled={exportando || !periodo}>
                  <Download className="h-4 w-4" />
                  {exportando ? 'Generando…' : 'Exportar registro de ventas'}
                </Button>
              </div>
            </div>
            {exportError && <p className="mt-3 text-xs font-medium text-destructive">{exportError}</p>}
          </CardContent>
        </Card>
      )}

      {/* Search + Table */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">Historial de Facturas</h2>
          <div className="flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 shadow-sm">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-40 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </div>

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Factura #</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                    Sin comprobantes emitidos.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((i) => {
                const badge = STATUS_BADGES[i.status] ?? STATUS_BADGES.pending!
                return (
                  <TableRow
                    key={i.id}
                    onClick={() => (window.location.href = `/billing/${i.id}`)}
                    className="group cursor-pointer"
                  >
                    <TableCell>
                      <span className="font-semibold text-primary group-hover:underline">
                        {i.invoiceNumber}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                          {i.patient?.firstName?.[0]}{i.patient?.lastName?.[0]}
                        </div>
                        <span className="font-medium text-foreground">
                          {i.patient?.firstName} {i.patient?.lastName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(i.createdAt)}</TableCell>
                    <TableCell className="font-bold text-foreground">
                      {formatCurrency(Number(i.total), i.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Collection Alert */}
      {pendingCount > 0 && (
        <Card className="border-warning/40 bg-warning/10">
          <CardContent className="flex items-start gap-3 p-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning-foreground" />
            <div>
              <h3 className="text-sm font-bold text-warning-foreground">Alerta de Cobros</h3>
              <p className="mt-1 text-xs text-warning-foreground/80">
                Tienes {pendingCount} factura{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''} de cobro. Se recomienda enviar recordatorios.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
