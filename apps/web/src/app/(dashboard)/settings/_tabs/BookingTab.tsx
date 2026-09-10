'use client'

import { useState } from 'react'
import { CalendarClock, Copy } from 'lucide-react'
import { api } from '@/lib/api'

interface BookingCfg {
  enabled?: boolean
  doctorId?: string
  weekdays?: number[]
  startHour?: number
  endHour?: number
  slotMinutes?: number
  leadHours?: number
}

const WEEKDAYS: { n: number; l: string }[] = [
  { n: 1, l: 'L' }, { n: 2, l: 'M' }, { n: 3, l: 'X' }, { n: 4, l: 'J' },
  { n: 5, l: 'V' }, { n: 6, l: 'S' }, { n: 0, l: 'D' },
]

interface DoctorOpt { id: string; firstName: string; lastName: string; role: string }

export function BookingTab({ clinic, users, onSaved }: { clinic: any; users: DoctorOpt[]; onSaved: () => void }) {
  const settings = (clinic.settings ?? {}) as Record<string, unknown>
  const current = (settings.booking ?? {}) as BookingCfg

  const [enabled, setEnabled] = useState<boolean>(!!current.enabled)
  const [weekdays, setWeekdays] = useState<number[]>(current.weekdays ?? [1, 2, 3, 4, 5])
  const [startHour, setStartHour] = useState<number>(current.startHour ?? 9)
  const [endHour, setEndHour] = useState<number>(current.endHour ?? 18)
  const [slotMinutes, setSlotMinutes] = useState<number>(current.slotMinutes ?? 30)
  const [doctorId, setDoctorId] = useState<string>(current.doctorId ?? '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/reservar/${clinic.slug}` : `/reservar/${clinic.slug}`

  function toggleDay(n: number) {
    setWeekdays((w) => (w.includes(n) ? w.filter((x) => x !== n) : [...w, n].sort()))
  }

  async function save() {
    setSaving(true)
    setMsg(null)
    try {
      const booking: BookingCfg = { enabled, weekdays, startHour, endHour, slotMinutes, doctorId: doctorId || undefined }
      await api.put('/settings/clinic', {
        name: clinic.name,
        taxId: clinic.taxId ?? null,
        address: clinic.address ?? null,
        phone: clinic.phone ?? null,
        email: clinic.email ?? null,
        timezone: clinic.timezone ?? undefined,
        country: clinic.country ?? undefined,
        logoUrl: clinic.logoUrl ?? null,
        settings: { ...settings, booking },
      })
      setMsg('Guardado ✓')
      onSaved()
    } catch {
      setMsg('No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-xl space-y-5 rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-5 w-5 text-emerald-600" />
        <h2 className="text-sm font-bold text-slate-700">Reserva online</h2>
      </div>

      {/* Enlace público */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
        <p className="text-[11px] font-medium text-slate-500">Enlace para tus pacientes</p>
        <div className="mt-1 flex items-center gap-2">
          <code className="flex-1 truncate rounded bg-white px-2 py-1 text-xs text-slate-700 border border-slate-200">{publicUrl}</code>
          <button
            onClick={() => navigator.clipboard?.writeText(publicUrl)}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100"
            title="Copiar"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </div>

      <label className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
        <span className="text-sm font-medium text-slate-700">Activar reservas online</span>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-5 w-5 accent-emerald-600" />
      </label>

      <div>
        <p className="mb-1 text-xs font-medium text-slate-600">Días de atención</p>
        <div className="flex gap-1.5">
          {WEEKDAYS.map((d) => (
            <button
              key={d.n}
              type="button"
              onClick={() => toggleDay(d.n)}
              className={`h-9 w-9 rounded-lg text-xs font-bold ${
                weekdays.includes(d.n) ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {d.l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Desde (h)</span>
          <input type="number" min={0} max={23} value={startHour} onChange={(e) => setStartHour(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Hasta (h)</span>
          <input type="number" min={1} max={24} value={endHour} onChange={(e) => setEndHour(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Duración (min)</span>
          <input type="number" min={10} max={180} step={5} value={slotMinutes} onChange={(e) => setSlotMinutes(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-medium text-slate-600">Profesional que recibe las reservas</span>
        <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">(Predeterminado)</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        {msg && <span className="text-sm text-slate-500">{msg}</span>}
      </div>
    </div>
  )
}
