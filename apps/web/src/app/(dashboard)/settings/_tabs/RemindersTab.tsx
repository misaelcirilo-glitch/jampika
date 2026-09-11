'use client'

import { useState } from 'react'
import { Bell, MessageCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

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
    <Card className="max-w-xl space-y-5 p-6">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-success" />
        <h2 className="text-sm font-bold text-foreground">Recordatorios por WhatsApp</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Enviamos un recordatorio automático al paciente antes de su cita para reducir las
        inasistencias. Requiere que el paciente tenga teléfono registrado.
      </p>

      <label className="flex items-center justify-between rounded-xl border border-border bg-muted px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Bell className="h-4 w-4 text-muted-foreground" /> Activar recordatorios
        </span>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </label>

      <div className="block">
        <Label className="mb-1 block text-xs">Enviar cuántas horas antes</Label>
        <div className="mt-1 flex items-center gap-2">
          <Input
            type="number"
            min={1}
            max={72}
            value={hoursBefore}
            disabled={!enabled}
            onChange={(e) => setHoursBefore(Math.max(1, Math.min(72, Number(e.target.value) || 24)))}
            className="w-24"
          />
          <span className="text-sm text-muted-foreground">horas antes de la cita</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
        {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
      </div>
    </Card>
  )
}
