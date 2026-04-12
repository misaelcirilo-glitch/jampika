'use client'

import { useEffect, useState } from 'react'
import { Building2, Clock, UserPlus, Users } from 'lucide-react'
import { ClinicTab } from './_tabs/ClinicTab'
import { UsersTab } from './_tabs/UsersTab'
import { ScheduleTab } from './_tabs/ScheduleTab'
import { api } from '@/lib/api'

type Tab = 'clinic' | 'users' | 'schedule'

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('users')
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
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Administración del Centro</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gestiona la información de la clínica, el equipo médico y los horarios de atención.
          </p>
        </div>
        {tab === 'users' && (
          <button className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors">
            <UserPlus className="h-4 w-4" /> Invitar Profesional
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
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
    </div>
  )
}
