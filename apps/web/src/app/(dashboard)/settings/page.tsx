'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Building2, CalendarClock, Clock, CreditCard, MessageCircle, UserPlus, Users } from 'lucide-react'
import { ClinicTab } from './_tabs/ClinicTab'
import { UsersTab } from './_tabs/UsersTab'
import { ScheduleTab } from './_tabs/ScheduleTab'
import { RemindersTab } from './_tabs/RemindersTab'
import { BookingTab } from './_tabs/BookingTab'
import { SubscriptionTab } from './_tabs/SubscriptionTab'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'

type Tab = 'clinic' | 'users' | 'schedule' | 'reminders' | 'reservas' | 'suscripcion'

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsContent />
    </Suspense>
  )
}

function SettingsContent() {
  const searchParams = useSearchParams()
  const subParam = searchParams.get('suscripcion')
  const [tab, setTab] = useState<Tab>(subParam ? 'suscripcion' : 'users')
  const [checkoutBanner, setCheckoutBanner] = useState<boolean>(subParam === 'ok')
  const [clinic, setClinic] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])

  async function refresh() {
    const [c, u] = await Promise.all([
      api.get<any>('/settings/clinic'),
      api.get<{ data: any[] }>('/settings/users'),
    ])
    setClinic(c)
    setUsers(u.data)
  }

  useEffect(() => {
    void refresh()
  }, [])

  const tabs: { id: Tab; label: string; icon: typeof Building2 }[] = [
    { id: 'clinic', label: 'Clínica', icon: Building2 },
    { id: 'users', label: 'Profesionales', icon: Users },
    { id: 'schedule', label: 'Horarios', icon: Clock },
    { id: 'reminders', label: 'Recordatorios', icon: MessageCircle },
    { id: 'reservas', label: 'Reservas', icon: CalendarClock },
    { id: 'suscripcion', label: 'Suscripción', icon: CreditCard },
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Administración del Centro</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestiona la información de la clínica, el equipo médico y los horarios de atención.
          </p>
        </div>
        {tab === 'users' && (
          <Button>
            <UserPlus className="h-4 w-4" /> Invitar Profesional
          </Button>
        )}
      </div>

      {/* Banner de éxito tras el checkout */}
      {checkoutBanner && (
        <div className="flex items-center justify-between rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success">
          <span>¡Suscripción activada! Gracias.</span>
          <button
            onClick={() => setCheckoutBanner(false)}
            className="text-success hover:opacity-80"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'clinic' && clinic && <ClinicTab clinic={clinic} onSaved={refresh} />}
      {tab === 'users' && <UsersTab users={users} onChanged={refresh} />}
      {tab === 'schedule' && <ScheduleTab users={users} onChanged={refresh} />}
      {tab === 'reminders' && clinic && <RemindersTab clinic={clinic} onSaved={refresh} />}
      {tab === 'reservas' && clinic && <BookingTab clinic={clinic} users={users} onSaved={refresh} />}
      {tab === 'suscripcion' && <SubscriptionTab />}
    </div>
  )
}
