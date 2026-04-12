'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { AppointmentType, Patient } from '@jampika/shared'
import { createAppointment } from '@/features/appointments/appointments.service'
import { listPatients } from '@/features/patients/patients.service'
import { useAuthStore } from '@/stores/authStore'

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

  const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500'
  const label = 'mb-1 block text-sm font-medium text-slate-700'

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-slate-800">Nueva cita</h1>
      <form onSubmit={onSubmit} className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
        <div>
          <label className={label}>Paciente</label>
          <select
            className={input}
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
          <div>
            <label className={label}>Fecha</label>
            <input
              type="date"
              className={input}
              required
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </div>
          <div>
            <label className={label}>Hora</label>
            <input
              type="time"
              className={input}
              required
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            />
          </div>
          <div>
            <label className={label}>Duración (min)</label>
            <input
              type="number"
              min="10"
              step="5"
              className={input}
              value={form.durationMinutes}
              onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
            />
          </div>
        </div>

        <div>
          <label className={label}>Tipo</label>
          <select
            className={input}
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

        <div>
          <label className={label}>Motivo</label>
          <textarea
            className={`${input} min-h-[60px]`}
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  )
}
