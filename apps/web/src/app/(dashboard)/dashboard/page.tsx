'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Calendar,
  ClipboardPlus,
  DollarSign,
  FileText,
  Package,
  Plus,
  Receipt,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

interface Summary {
  appointmentsToday: number
  patientsTotal: number
  incomeToday: number
  invoicesToday: number
  lowStockItems: number
}

interface TodayAppointment {
  id: string
  startTime: string
  endTime: string
  durationMinutes: number
  status: string
  appointmentType: string | null
  reason: string | null
  patient: { firstName: string; lastName: string }
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function formatDate(): string {
  return new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()
}

const TYPE_BADGES: Record<string, { label: string; className: string }> = {
  first_visit: { label: 'NUEVO', className: 'border-blue-200 text-blue-600 bg-blue-50' },
  follow_up: { label: 'CONTROL', className: 'border-blue-200 text-blue-600 bg-blue-50' },
  emergency: { label: 'URGENTE', className: 'border-orange-200 text-orange-600 bg-orange-50' },
  procedure: { label: 'PROCEDIMIENTO', className: 'border-purple-200 text-purple-600 bg-purple-50' },
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [appointments, setAppointments] = useState<TodayAppointment[]>([])

  useEffect(() => {
    api
      .get<Summary>('/dashboard/summary')
      .then(setSummary)
      .catch(() =>
        setSummary({ appointmentsToday: 0, patientsTotal: 0, incomeToday: 0, invoicesToday: 0, lowStockItems: 0 }),
      )

    // Cargar citas de hoy
    const today = new Date().toISOString().slice(0, 10)
    api
      .get<{ data: TodayAppointment[] }>(`/appointments?date=${today}`)
      .then((r) => setAppointments(r.data?.slice(0, 5) ?? []))
      .catch(() => {})
  }, [])

  const cards = [
    {
      label: 'Citas Hoy',
      value: summary?.appointmentsToday ?? '—',
      icon: Calendar,
      iconBg: 'bg-blue-50 text-blue-600',
      trend: '+12%',
      trendUp: true,
    },
    {
      label: 'Pacientes Activos',
      value: summary?.patientsTotal ?? '—',
      icon: Users,
      iconBg: 'bg-blue-50 text-blue-600',
      trend: '+4%',
      trendUp: true,
    },
    {
      label: 'Ingresos Hoy',
      value: summary ? formatCurrency(summary.incomeToday) : '—',
      icon: DollarSign,
      iconBg: 'bg-blue-50 text-blue-600',
      trend: '+22%',
      trendUp: true,
    },
    {
      label: 'Stock Crítico',
      value: summary ? `${summary.lowStockItems} Art.` : '—',
      icon: AlertTriangle,
      iconBg: 'bg-red-50 text-red-500',
      trend: 'Bajo',
      trendUp: false,
    },
  ]

  const quickActions = [
    { label: 'Registrar Paciente', icon: UserPlus, href: '/patients/new' },
    { label: 'Nueva Historia', icon: FileText, href: '/records' },
    { label: 'Generar Receta', icon: ClipboardPlus, href: '/records' },
    { label: 'Emitir Factura', icon: Receipt, href: '/billing/new' },
  ]

  const displayName = user?.role === 'doctor'
    ? `Dr. ${user.firstName}`
    : user?.firstName ?? ''

  return (
    <div className="space-y-6">
      {/* Welcome + Nueva Cita */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {getGreeting()}, {displayName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Hoy es {formatDate()}. Tienes {summary?.appointmentsToday ?? 0} pacientes programados para hoy.
          </p>
        </div>
        <Link
          href="/appointments/new"
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nueva Cita
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
            <div className="flex items-start justify-between">
              <div className={`rounded-xl p-2.5 ${c.iconBg}`}>
                <c.icon className="h-5 w-5" />
              </div>
              <div className={`flex items-center gap-1 text-xs font-semibold ${c.trendUp ? 'text-emerald-600' : 'text-red-500'}`}>
                {c.trendUp && <TrendingUp className="h-3 w-3" />}
                {c.trend}
              </div>
            </div>
            <p className="mt-3 text-xs font-medium text-slate-500">{c.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Agenda + Acciones Rápidas */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Agenda de Hoy */}
        <div className="lg:col-span-2 rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-1 rounded-full bg-blue-600" />
              <h2 className="text-base font-bold text-slate-800">Agenda de Hoy</h2>
            </div>
            <Link href="/appointments" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              Ver calendario completo
            </Link>
          </div>

          {appointments.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              No hay citas programadas para hoy.
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((apt) => {
                const badge = TYPE_BADGES[apt.appointmentType ?? ''] ?? { label: 'CONTROL', className: 'border-blue-200 text-blue-600 bg-blue-50' }
                return (
                  <div
                    key={apt.id}
                    className="flex items-center gap-4 rounded-xl border border-slate-100 p-4 hover:border-blue-200 transition-colors"
                  >
                    {/* Hora */}
                    <div className="min-w-[70px] text-center">
                      <p className="text-sm font-semibold text-slate-700">{formatTime(apt.startTime)}</p>
                      <p className="text-[10px] font-medium uppercase text-slate-400">{apt.durationMinutes} min</p>
                    </div>

                    {/* Avatar */}
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-xs font-bold text-slate-600">
                      {apt.patient.firstName[0]}{apt.patient.lastName[0]}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">
                        {apt.patient.firstName} {apt.patient.lastName}
                      </p>
                      {apt.reason && (
                        <p className="truncate text-xs text-slate-400">{apt.reason}</p>
                      )}
                    </div>

                    {/* Badge */}
                    <span className={`rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Acciones Rápidas + Alerta */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
            <h2 className="mb-4 text-base font-bold text-slate-800">Acciones Rápidas</h2>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex flex-col items-center gap-2 rounded-xl border border-slate-150 p-4 text-center hover:border-blue-200 hover:bg-blue-50/30 transition-colors"
                >
                  <action.icon className="h-6 w-6 text-slate-500" />
                  <span className="text-[11px] font-semibold uppercase text-slate-600">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Alerta de inventario */}
          {summary && summary.lowStockItems > 0 && (
            <div className="rounded-2xl bg-red-50 border border-red-100 p-5">
              <h3 className="text-sm font-bold text-red-800">Alerta de Inventario</h3>
              <p className="mt-1 text-xs text-red-600">
                Tienes {summary.lowStockItems} productos con stock crítico que requieren reposición inmediata.
              </p>
              <Link
                href="/inventory"
                className="mt-3 inline-block rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800 transition-colors"
              >
                Gestionar Inventario
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
