'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Search, Users, UserPlus, RotateCcw } from 'lucide-react'
import type { Patient } from '@jampika/shared'
import { listPatients } from '@/features/patients/patients.service'
import { formatDate } from '@/lib/utils'

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  active: { label: 'Activo', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  inactive: { label: 'Inactivo', className: 'bg-slate-50 text-slate-500 border-slate-200' },
  treatment: { label: 'En Tratamiento', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  follow_up: { label: 'Seguimiento', className: 'bg-amber-50 text-amber-700 border-amber-200' },
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
        <h1 className="text-2xl font-bold text-slate-800">Directorio Clínico</h1>
        <p className="mt-1 text-sm text-slate-500">
          Administra y consulta la información detallada de tus pacientes en una vista centralizada y segura.
        </p>
      </div>

      {/* Search + Filter + Button */}
      <div className="flex items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, documento o teléfono…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-600 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          <option value="all">Todos los Estados</option>
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </select>
        <Link
          href="/patients/new"
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Patient
        </Link>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3.5">Name</th>
              <th className="px-5 py-3.5">Document</th>
              <th className="px-5 py-3.5">Phone</th>
              <th className="px-5 py-3.5">Last Visit</th>
              <th className="px-5 py-3.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paginated.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm text-slate-400">
                  Sin pacientes registrados.
                </td>
              </tr>
            )}
            {paginated.map((p) => {
              const initials = getInitials(p.firstName, p.lastName)
              const color = avatarColor(`${p.firstName}${p.lastName}`)
              const badge = p.isActive ? STATUS_BADGES.active! : STATUS_BADGES.inactive!
              return (
                <tr key={p.id} className="group hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => window.location.href = `/patients/${p.id}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${color} text-xs font-bold text-white`}>
                        {initials}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">
                          {p.firstName} {p.lastName}
                        </p>
                        {p.email && (
                          <p className="text-xs text-slate-400">{p.email}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 tabular-nums">
                    {p.documentNumber}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {p.phone ?? '—'}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">
                    {p.updatedAt ? formatDate(p.updatedAt) : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badge.className}`}>
                      {badge.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
          <p className="text-xs text-slate-400">
            Mostrando {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}-{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} pacientes
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`h-8 w-8 rounded-lg text-xs font-semibold transition-colors ${
                  n === page
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
          <div className="rounded-xl bg-blue-50 p-2.5">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Pacientes</p>
            <p className="text-xl font-bold text-slate-800">{patients.length.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
          <div className="rounded-xl bg-emerald-50 p-2.5">
            <UserPlus className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Nuevos Hoy</p>
            <p className="text-xl font-bold text-slate-800">
              {patients.filter((p) => p.createdAt && new Date(p.createdAt).toDateString() === new Date().toDateString()).length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
          <div className="rounded-xl bg-amber-50 p-2.5">
            <RotateCcw className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Retorno Mensual</p>
            <p className="text-xl font-bold text-slate-800">—</p>
          </div>
        </div>
      </div>
    </div>
  )
}
