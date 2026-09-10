'use client'

import { useState } from 'react'
import { Bell, MessageCircle } from 'lucide-react'
import { api } from '@/lib/api'

interface ReminderCfg {
  enabled?: boolean
  hoursBefore?: number
}

export function RemindersTab({ clinic, onSaved }: { clinic: any; onSaved: () => void }) {
  const settings = (clinic.settings ?? {}) as Record<string, unknown>
  const current = (settings.reminders ?? {}) as ReminderCfg

  const [enabled, setEnabled] = useState<boolean>(!!current.enabled)
  const [hoursBefore, setHoursBefore] = useState<number>(current.hoursBefore ?? 24)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setMsg(null)
    try {
      // Fusionar sobre settings actuales para no pisar professionType/enabledModules.
      const mergedSettings = { ...settings, reminders: { enabled, hoursBefore } }
      await api.put('/settings/clinic', {
        name: clinic.name,
        taxId: clinic.taxId ?? null,
        address: clinic.address ?? null,
        phone: clinic.phone ?? null,
        email: clinic.email ?? null,
        timezone: clinic.timezone ?? undefined,
        country: clinic.country ?? undefined,
        logoUrl: clinic.logoUrl ?? null,
        settings: mergedSettings,
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
        <MessageCircle className="h-5 w-5 text-emerald-600" />
        <h2 className="text-sm font-bold text-slate-700">Recordatorios por WhatsApp</h2>
      </div>
      <p className="text-sm text-slate-500">
        Enviamos un recordatorio automático al paciente antes de su cita para reducir las
        inasistencias. Requiere que el paciente tenga teléfono registrado.
      </p>

      <label className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Bell className="h-4 w-4 text-slate-400" /> Activar recordatorios
        </span>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-5 w-5 accent-emerald-600"
        />
      </label>

      <label className="block">
        <span className="text-xs font-medium text-slate-600">Enviar cuántas horas antes</span>
        <div className="mt-1 flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={72}
            value={hoursBefore}
            disabled={!enabled}
            onChange={(e) => setHoursBefore(Math.max(1, Math.min(72, Number(e.target.value) || 24)))}
            className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
          />
          <span className="text-sm text-slate-400">horas antes de la cita</span>
        </div>
      </label>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        {msg && <span className="text-sm text-slate-500">{msg}</span>}
      </div>
    </div>
  )
}
