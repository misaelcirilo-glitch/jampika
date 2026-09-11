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
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

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
  first_visit: { label: 'NUEVO', className: 'border-transparent text-primary bg-secondary' },
  follow_up: { label: 'CONTROL', className: 'border-transparent text-primary bg-secondary' },
  emergency: { label: 'URGENTE', className: 'border-transparent text-warning-foreground bg-warning/15' },
  procedure: { label: 'PROCEDIMIENTO', className: 'border-transparent text-muted-foreground bg-muted' },
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
      iconBg: 'bg-secondary text-primary',
      trend: '+12%',
      trendUp: true,
    },
    {
      label: 'Pacientes Activos',
      value: summary?.patientsTotal ?? '—',
      icon: Users,
      iconBg: 'bg-secondary text-primary',
      trend: '+4%',
      trendUp: true,
    },
    {
      label: 'Ingresos Hoy',
      value: summary ? formatCurrency(summary.incomeToday) : '—',
      icon: DollarSign,
      iconBg: 'bg-secondary text-primary',
      trend: '+22%',
      trendUp: true,
    },
    {
      label: 'Stock Crítico',
      value: summary ? `${summary.lowStockItems} Art.` : '—',
      icon: AlertTriangle,
      iconBg: 'bg-destructive/10 text-destructive',
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
          <h1 className="text-2xl font-bold text-foreground">
            {getGreeting()}, {displayName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hoy es {formatDate()}. Tienes {summary?.appointmentsToday ?? 0} pacientes programados para hoy.
          </p>
        </div>
        <Button asChild>
          <Link href="/appointments/new">
            <Plus className="h-4 w-4" />
            Nueva Cita
          </Link>
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <div className="flex items-start justify-between">
              <div className={`rounded-xl p-2.5 ${c.iconBg}`}>
                <c.icon className="h-5 w-5" />
              </div>
              <div className={`flex items-center gap-1 text-xs font-semibold ${c.trendUp ? 'text-success' : 'text-destructive'}`}>
                {c.trendUp && <TrendingUp className="h-3 w-3" />}
                {c.trend}
              </div>
            </div>
            <p className="mt-3 text-xs font-medium text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{c.value}</p>
          </Card>
        ))}
      </div>

      {/* Agenda + Acciones Rápidas */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Agenda de Hoy */}
        <Card className="lg:col-span-2 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-1 rounded-full bg-primary" />
              <h2 className="text-base font-bold text-foreground">Agenda de Hoy</h2>
            </div>
            <Link href="/appointments" className="text-sm font-medium text-primary hover:text-primary/80">
              Ver calendario completo
            </Link>
          </div>

          {appointments.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No hay citas programadas para hoy.
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((apt) => {
                const badge = TYPE_BADGES[apt.appointmentType ?? ''] ?? { label: 'CONTROL', className: 'border-transparent text-primary bg-secondary' }
                return (
                  <div
                    key={apt.id}
                    className="flex items-center gap-4 rounded-xl border border-border p-4 hover:border-primary/40 transition-colors"
                  >
                    {/* Hora */}
                    <div className="min-w-[70px] text-center">
                      <p className="text-sm font-semibold text-foreground">{formatTime(apt.startTime)}</p>
                      <p className="text-[10px] font-medium uppercase text-muted-foreground">{apt.durationMinutes} min</p>
                    </div>

                    {/* Avatar */}
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                      {apt.patient.firstName[0]}{apt.patient.lastName[0]}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {apt.patient.firstName} {apt.patient.lastName}
                      </p>
                      {apt.reason && (
                        <p className="truncate text-xs text-muted-foreground">{apt.reason}</p>
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
        </Card>

        {/* Acciones Rápidas + Alerta */}
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-4 text-base font-bold text-foreground">Acciones Rápidas</h2>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex flex-col items-center gap-2 rounded-xl border border-border p-4 text-center hover:border-primary/40 hover:bg-secondary/40 transition-colors"
                >
                  <action.icon className="h-6 w-6 text-muted-foreground" />
                  <span className="text-[11px] font-semibold uppercase text-foreground">{action.label}</span>
                </Link>
              ))}
            </div>
          </Card>

          {/* Alerta de inventario */}
          {summary && summary.lowStockItems > 0 && (
            <Card className="border-destructive/20 bg-destructive/10 p-5 shadow-none">
              <h3 className="text-sm font-bold text-destructive">Alerta de Inventario</h3>
              <p className="mt-1 text-xs text-destructive/80">
                Tienes {summary.lowStockItems} productos con stock crítico que requieren reposición inmediata.
              </p>
              <Button asChild variant="destructive" size="sm" className="mt-3">
                <Link href="/inventory">Gestionar Inventario</Link>
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
