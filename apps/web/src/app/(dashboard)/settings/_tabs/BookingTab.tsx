'use client'

import { useState } from 'react'
import { CalendarClock, Copy } from 'lucide-react'
import { api } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
    <Card className="max-w-xl space-y-5 p-6">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-5 w-5 text-success" />
        <h2 className="text-sm font-bold text-foreground">Reserva online</h2>
      </div>

      {/* Enlace público */}
      <div className="rounded-xl border border-border bg-muted p-3">
        <p className="text-[11px] font-medium text-muted-foreground">Enlace para tus pacientes</p>
        <div className="mt-1 flex items-center gap-2">
          <code className="flex-1 truncate rounded bg-card px-2 py-1 text-xs text-foreground border border-border">{publicUrl}</code>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigator.clipboard?.writeText(publicUrl)}
            className="h-8 w-8"
            title="Copiar"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <label className="flex items-center justify-between rounded-xl border border-border bg-muted px-4 py-3">
        <span className="text-sm font-medium text-foreground">Activar reservas online</span>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </label>

      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">Días de atención</p>
        <div className="flex gap-1.5">
          {WEEKDAYS.map((d) => (
            <button
              key={d.n}
              type="button"
              onClick={() => toggleDay(d.n)}
              className={`h-9 w-9 rounded-lg text-xs font-bold ${
                weekdays.includes(d.n) ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {d.l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="block">
          <Label className="mb-1 block text-xs">Desde (h)</Label>
          <Input type="number" min={0} max={23} value={startHour} onChange={(e) => setStartHour(Number(e.target.value))} className="mt-1" />
        </div>
        <div className="block">
          <Label className="mb-1 block text-xs">Hasta (h)</Label>
          <Input type="number" min={1} max={24} value={endHour} onChange={(e) => setEndHour(Number(e.target.value))} className="mt-1" />
        </div>
        <div className="block">
          <Label className="mb-1 block text-xs">Duración (min)</Label>
          <Input type="number" min={10} max={180} step={5} value={slotMinutes} onChange={(e) => setSlotMinutes(Number(e.target.value))} className="mt-1" />
        </div>
      </div>

      <div className="block">
        <Label className="mb-1 block text-xs">Profesional que recibe las reservas</Label>
        <Select value={doctorId || 'default'} onValueChange={(v) => setDoctorId(v === 'default' ? '' : v)}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">(Predeterminado)</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
