'use client'

import { useState } from 'react'
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
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Agrega profesionales con rol <strong>doctor</strong> para configurar sus horarios.
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <Label className="mb-1 block">Profesional</Label>
        <Select value={selected} onValueChange={selectDoctor}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {doctors.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.firstName} {d.lastName}
                {d.specialty && ` · ${d.specialty}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {DAYS.map(({ key, label }) => {
          const slot = schedule[key]
          const active = !!slot
          return (
            <div
              key={key}
              className="flex items-center gap-4 rounded-lg border border-border p-3"
            >
              <label className="flex w-28 items-center gap-2 text-sm font-medium text-foreground">
                <Switch checked={active} onCheckedChange={() => toggleDay(key)} />
                {label}
              </label>
              {active ? (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">De</span>
                  <Input
                    type="time"
                    className="h-9 w-auto"
                    value={slot!.start}
                    onChange={(e) => updateSlot(key, 'start', e.target.value)}
                  />
                  <span className="text-muted-foreground">a</span>
                  <Input
                    type="time"
                    className="h-9 w-auto"
                    value={slot!.end}
                    onChange={(e) => updateSlot(key, 'end', e.target.value)}
                  />
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">No atiende</span>
              )}
            </div>
          )
        })}
      </div>

      {msg && <p className="mt-4 text-sm text-muted-foreground">{msg}</p>}

      <div className="mt-6 flex justify-end">
        <Button onClick={onSave} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar horario'}
        </Button>
      </div>
    </Card>
  )
}
