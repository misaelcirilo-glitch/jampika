'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { AppointmentType, Patient } from '@jampika/shared'
import { createAppointment } from '@/features/appointments/appointments.service'
import { listPatients } from '@/features/patients/patients.service'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default function NewAppointmentPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const [patients, setPatients] = useState<Patient[]>([])
  const [form, setForm] = useState({
    patientId: '',
    startDate: new Date().toISOString().slice(0, 10),
    startTime: '10:00',
    durationMinutes: 30,
    appointmentType: 'first_visit' as AppointmentType,
    reason: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void listPatients().then(setPatients)
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    try {
      const start = new Date(`${form.startDate}T${form.startTime}:00`)
      const end = new Date(start.getTime() + form.durationMinutes * 60000)
      await createAppointment({
        clinicId: user.clinicId,
        patientId: form.patientId,
        doctorId: user.id,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        durationMinutes: form.durationMinutes,
        status: 'scheduled',
        appointmentType: form.appointmentType,
        specialty: null,
        reason: form.reason || null,
        notes: null,
        reminderSentAt: null,
        localId: null,
        syncedAt: null,
      })
      router.replace('/appointments')
    } finally {
      setSaving(false)
    }
  }

  const selectClass =
    'flex h-10 w-full items-center rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Nueva cita</h1>
      <Card className="p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Paciente</Label>
            <select
              className={selectClass}
              required
              value={form.patientId}
              onChange={(e) => setForm({ ...form, patientId: e.target.value })}
            >
              <option value="">— Selecciona un paciente —</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.lastName}, {p.firstName} · {p.documentNumber}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Fecha</Label>
              <Input
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Hora</Label>
              <Input
                type="time"
                required
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Duración (min)</Label>
              <Input
                type="number"
                min="10"
                step="5"
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Tipo</Label>
            <select
              className={selectClass}
              value={form.appointmentType}
              onChange={(e) => setForm({ ...form, appointmentType: e.target.value as AppointmentType })}
            >
              <option value="first_visit">Primera visita</option>
              <option value="follow_up">Control</option>
              <option value="emergency">Emergencia</option>
              <option value="procedure">Procedimiento</option>
              <option value="telemedicine">Telemedicina</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label>Motivo</Label>
            <Textarea
              className="min-h-[60px]"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

