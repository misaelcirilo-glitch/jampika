'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { DocumentType, Gender, Patient } from '@jampika/shared'

export interface PatientFormValues {
  documentType: DocumentType
  documentNumber: string
  firstName: string
  lastName: string
  birthDate: string
  gender: Gender
  bloodType: string
  phone: string
  email: string
  address: string
  emergencyContactName: string
  emergencyContactPhone: string
  insuranceProvider: string
  insuranceNumber: string
  allergies: string[]
  chronicConditions: string[]
  notes: string
}

export function emptyPatientForm(): PatientFormValues {
  return {
    documentType: 'DNI',
    documentNumber: '',
    firstName: '',
    lastName: '',
    birthDate: '',
    gender: 'M',
    bloodType: '',
    phone: '',
    email: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    insuranceProvider: '',
    insuranceNumber: '',
    allergies: [],
    chronicConditions: [],
    notes: '',
  }
}

export function patientToForm(p: Patient): PatientFormValues {
  return {
    documentType: p.documentType,
    documentNumber: p.documentNumber,
    firstName: p.firstName,
    lastName: p.lastName,
    birthDate: p.birthDate ?? '',
    gender: (p.gender as Gender) ?? 'M',
    bloodType: p.bloodType ?? '',
    phone: p.phone ?? '',
    email: p.email ?? '',
    address: p.address ?? '',
    emergencyContactName: p.emergencyContactName ?? '',
    emergencyContactPhone: p.emergencyContactPhone ?? '',
    insuranceProvider: p.insuranceProvider ?? '',
    insuranceNumber: p.insuranceNumber ?? '',
    allergies: p.allergies ?? [],
    chronicConditions: p.chronicConditions ?? [],
    notes: p.notes ?? '',
  }
}

export function PatientForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = 'Guardar',
}: {
  initial: PatientFormValues
  onSubmit: (values: PatientFormValues) => Promise<void>
  onCancel: () => void
  submitLabel?: string
}) {
  const [form, setForm] = useState<PatientFormValues>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newAllergy, setNewAllergy] = useState('')
  const [newCondition, setNewCondition] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSubmit(form)
    } catch (err: any) {
      setError(err?.message ?? 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  function addAllergy() {
    if (!newAllergy.trim()) return
    setForm({ ...form, allergies: [...form.allergies, newAllergy.trim()] })
    setNewAllergy('')
  }

  function addCondition() {
    if (!newCondition.trim()) return
    setForm({ ...form, chronicConditions: [...form.chronicConditions, newCondition.trim()] })
    setNewCondition('')
  }

  const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500'
  const label = 'mb-1 block text-sm font-medium text-slate-700'

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-xl bg-white p-6 shadow-sm">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">Datos personales</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Tipo de documento</label>
            <select
              className={input}
              value={form.documentType}
              onChange={(e) => setForm({ ...form, documentType: e.target.value as DocumentType })}
            >
              <option value="DNI">DNI</option>
              <option value="CE">CE</option>
              <option value="CC">CC</option>
              <option value="CI">CI</option>
              <option value="RUT">RUT</option>
              <option value="CURP">CURP</option>
              <option value="PASAPORTE">Pasaporte</option>
            </select>
          </div>
          <div>
            <label className={label}>Número</label>
            <input
              className={input}
              required
              value={form.documentNumber}
              onChange={(e) => setForm({ ...form, documentNumber: e.target.value })}
            />
          </div>
          <div>
            <label className={label}>Nombres</label>
            <input
              className={input}
              required
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
          </div>
          <div>
            <label className={label}>Apellidos</label>
            <input
              className={input}
              required
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </div>
          <div>
            <label className={label}>Fecha de nacimiento</label>
            <input
              type="date"
              className={input}
              value={form.birthDate}
              onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
            />
          </div>
          <div>
            <label className={label}>Género</label>
            <select
              className={input}
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value as Gender })}
            >
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
              <option value="other">Otro</option>
            </select>
          </div>
          <div>
            <label className={label}>Grupo sanguíneo</label>
            <select
              className={input}
              value={form.bloodType}
              onChange={(e) => setForm({ ...form, bloodType: e.target.value })}
            >
              <option value="">—</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">Contacto</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Teléfono</label>
            <input
              className={input}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <label className={label}>Correo</label>
            <input
              type="email"
              className={input}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <label className={label}>Dirección</label>
            <input
              className={input}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div>
            <label className={label}>Contacto de emergencia</label>
            <input
              className={input}
              value={form.emergencyContactName}
              onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })}
            />
          </div>
          <div>
            <label className={label}>Teléfono de emergencia</label>
            <input
              className={input}
              value={form.emergencyContactPhone}
              onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })}
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">Seguro</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Proveedor</label>
            <input
              className={input}
              value={form.insuranceProvider}
              onChange={(e) => setForm({ ...form, insuranceProvider: e.target.value })}
            />
          </div>
          <div>
            <label className={label}>Número de póliza</label>
            <input
              className={input}
              value={form.insuranceNumber}
              onChange={(e) => setForm({ ...form, insuranceNumber: e.target.value })}
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">Antecedentes</h2>

        <div className="mb-4">
          <label className={label}>Alergias</label>
          <div className="mb-2 flex flex-wrap gap-2">
            {form.allergies.map((a, idx) => (
              <span
                key={idx}
                className="flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs text-red-700"
              >
                {a}
                <button
                  type="button"
                  onClick={() =>
                    setForm({ ...form, allergies: form.allergies.filter((_, i) => i !== idx) })
                  }
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className={input}
              placeholder="Ej: Penicilina"
              value={newAllergy}
              onChange={(e) => setNewAllergy(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addAllergy()
                }
              }}
            />
            <button
              type="button"
              onClick={addAllergy}
              className="rounded-lg border border-slate-300 px-4 text-sm"
            >
              +
            </button>
          </div>
        </div>

        <div>
          <label className={label}>Condiciones crónicas</label>
          <div className="mb-2 flex flex-wrap gap-2">
            {form.chronicConditions.map((c, idx) => (
              <span
                key={idx}
                className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-700"
              >
                {c}
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      chronicConditions: form.chronicConditions.filter((_, i) => i !== idx),
                    })
                  }
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className={input}
              placeholder="Ej: Hipertensión"
              value={newCondition}
              onChange={(e) => setNewCondition(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addCondition()
                }
              }}
            />
            <button
              type="button"
              onClick={addCondition}
              className="rounded-lg border border-slate-300 px-4 text-sm"
            >
              +
            </button>
          </div>
        </div>
      </section>

      <section>
        <label className={label}>Notas</label>
        <textarea
          className={`${input} min-h-[80px]`}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </section>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {saving ? 'Guardando…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
