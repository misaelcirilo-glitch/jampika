'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Search, Users, UserPlus, RotateCcw } from 'lucide-react'
import type { Patient } from '@jampika/shared'
import { listPatients } from '@/features/patients/patients.service'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const STATUS_BADGES: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  active: { label: 'Activo', variant: 'success' },
  inactive: { label: 'Inactivo', variant: 'secondary' },
  treatment: { label: 'En Tratamiento', variant: 'default' },
  follow_up: { label: 'Seguimiento', variant: 'warning' },
}

const PAGE_SIZE = 10

function getInitials(first: string, last: string): string {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase()
}

const AVATAR_COLORS = [
  'from-blue-400 to-blue-600',
  'from-rose-400 to-rose-600',
  'from-emerald-400 to-emerald-600',
  'from-amber-400 to-amber-600',
  'from-purple-400 to-purple-600',
  'from-cyan-400 to-cyan-600',
]

function avatarColor(name: string): string {
  let hash = 0
  for (const ch of name) hash = ch.charCodeAt(0) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)

  useEffect(() => {
    void listPatients(search).then(setPatients)
    setPage(1)
  }, [search])

  const filtered = statusFilter === 'all'
    ? patients
    : patients.filter((p) => (p.isActive ? 'active' : 'inactive') === statusFilter)

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Directorio Clínico</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Administra y consulta la información detallada de tus pacientes en una vista centralizada y segura.
        </p>
      </div>

      {/* Search + Filter + Button */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por nombre, documento o teléfono…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => { setStatusFilter(v); setPage(1) }}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los Estados</SelectItem>
            <SelectItem value="active">Activo</SelectItem>
            <SelectItem value="inactive">Inactivo</SelectItem>
          </SelectContent>
        </Select>
        <Button asChild>
          <Link href="/patients/new">
            <Plus className="h-4 w-4" />
            New Patient
          </Link>
        </Button>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Document</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Last Visit</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  Sin pacientes registrados.
                </TableCell>
              </TableRow>
            )}
            {paginated.map((p) => {
              const initials = getInitials(p.firstName, p.lastName)
              const color = avatarColor(`${p.firstName}${p.lastName}`)
              const badge = p.isActive ? STATUS_BADGES.active! : STATUS_BADGES.inactive!
              return (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => window.location.href = `/patients/${p.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${color} text-xs font-bold text-white`}>
                        {initials}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          {p.firstName} {p.lastName}
                        </p>
                        {p.email && (
                          <p className="text-xs text-muted-foreground">{p.email}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {p.documentNumber}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.phone ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.updatedAt ? formatDate(p.updatedAt) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">
            Mostrando {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}-{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} pacientes
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((n) => (
              <Button
                key={n}
                variant={n === page ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8 text-xs"
                onClick={() => setPage(n)}
              >
                {n}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Bottom Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-xl bg-secondary p-2.5">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total Pacientes</p>
              <p className="text-xl font-bold text-foreground">{patients.length.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-xl bg-success/10 p-2.5">
              <UserPlus className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Nuevos Hoy</p>
              <p className="text-xl font-bold text-foreground">
                {patients.filter((p) => p.createdAt && new Date(p.createdAt).toDateString() === new Date().toDateString()).length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-xl bg-warning/15 p-2.5">
              <RotateCcw className="h-5 w-5 text-warning-foreground" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Retorno Mensual</p>
              <p className="text-xl font-bold text-foreground">—</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
