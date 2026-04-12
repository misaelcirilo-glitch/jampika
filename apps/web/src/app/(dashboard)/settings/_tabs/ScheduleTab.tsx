'use client'

import { useState } from 'react'
import { api } from '@/lib/api'

const DAYS: { key: string; label: string }[] = [
  { key: 'mon', label: 'Lunes' },
  { key: 'tue', label: 'Martes' },
  { key: 'wed', label: 'Miércoles' },
  { key: 'thu', label: 'Jueves' },
  { key: 'fri', label: 'Viernes' },
  { key: 'sat', label: 'Sábado' },
  { key: 'sun', label: 'Domingo' },
]

type DaySlot = { start: string; end: string } | null
type Schedule = Record<string, DaySlot>

const DEFAULT_SCHEDULE: Schedule = {
  mon: { start: '08:00', end: '18:00' },
  tue: { start: '08:00', end: '18:00' },
  wed: { start: '08:00', end: '18:00' },
  thu: { start: '08:00', end: '18:00' },
  fri: { start: '08:00', end: '18:00' },
  sat: { start: '08:00', end: '13:00' },
  sun: null,
}

export function ScheduleTab({ users, onChanged }: { users: any[]; onChanged: () => void }) {
  const doctors = users.filter((u) => u.role === 'doctor' && u.isActive !== false)
  const [selected, setSelected] = useState<string>(doctors[0]?.id ?? '')

  const current = doctors.find((d) => d.id === selected)
  const initialSchedule: Schedule =
    (current?.schedule as Schedule | null) ?? DEFAULT_SCHEDULE

  const [schedule, setSchedule] = useState<Schedule>(initialSchedule)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  function toggleDay(day: string) {
    setSchedule({
      ...schedule,
      [day]: schedule[day] ? null : { start: '08:00', end: '18:00' },
    })
  }

  function updateSlot(day: string, field: 'start' | 'end', value: string) {
    const slot = schedule[day]
    if (!slot) return
    setSchedule({ ...schedule, [day]: { ...slot, [field]: value } })
  }

  async function onSave() {
    if (!current) return
    setSaving(true)
    setMsg(null)
    try {
      await api.put(`/settings/users/${current.id}`, { schedule })
      setMsg('Guardado')
      onChanged()
    } catch (err: any) {
      setMsg(err?.message ?? 'Error')
    } finally {
      setSaving(false)
    }
  }

  function selectDoctor(id: string) {
    setSelected(id)
    const d = doctors.find((x) => x.id === id)
    setSchedule((d?.schedule as Schedule | null) ?? DEFAULT_SCHEDULE)
  }

  if (doctors.length === 0) {
    return (
      <div className="rounded-xl bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Agrega profesionales con rol <strong>doctor</strong> para configurar sus horarios.
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-6">
        <label className="mb-1 block text-sm font-medium text-slate-700">Profesional</label>
        <select
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
          value={selected}
          onChange={(e) => selectDoctor(e.target.value)}
        >
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.firstName} {d.lastName}
              {d.specialty && ` · ${d.specialty}`}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {DAYS.map(({ key, label }) => {
          const slot = schedule[key]
          const active = !!slot
          return (
            <div
              key={key}
              className="flex items-center gap-4 rounded-lg border border-slate-200 p-3"
            >
              <label className="flex w-28 items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggleDay(key)}
                  className="h-4 w-4"
                />
                {label}
              </label>
              {active ? (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500">De</span>
                  <input
                    type="time"
                    className="rounded-lg border border-slate-300 px-2 py-1"
                    value={slot!.start}
                    onChange={(e) => updateSlot(key, 'start', e.target.value)}
                  />
                  <span className="text-slate-500">a</span>
                  <input
                    type="time"
                    className="rounded-lg border border-slate-300 px-2 py-1"
                    value={slot!.end}
                    onChange={(e) => updateSlot(key, 'end', e.target.value)}
                  />
                </div>
              ) : (
                <span className="text-sm text-slate-400">No atiende</span>
              )}
            </div>
          )
        })}
      </div>

      {msg && <p className="mt-4 text-sm text-slate-600">{msg}</p>}

      <div className="mt-6 flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar horario'}
        </button>
      </div>
    </div>
  )
}
