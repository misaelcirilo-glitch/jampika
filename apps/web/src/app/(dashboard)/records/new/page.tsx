'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import type { Diagnosis, Prescription, RecordType, VitalSigns } from '@jampika/shared'
import { searchCie10 } from '@jampika/shared'
import { createRecord } from '@/features/records/records.service'
import { searchAllMedications, syncClinicMedications, type MedicationResult } from '@/features/medications/medications.service'
import { useAuthStore } from '@/stores/authStore'
import { ArrowLeft, Clock, Pill, Printer, Send, Trash2, Upload } from 'lucide-react'

function NewRecordForm() {
  const router = useRouter()
  const params = useSearchParams()
  const patientId = params.get('patientId') ?? ''
  const user = useAuthStore((s) => s.user)

  const [form, setForm] = useState({
    recordType: 'consultation' as RecordType,
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
  })
  const [vitals, setVitals] = useState<VitalSigns>({})
  const [diagQuery, setDiagQuery] = useState('')
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([])
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [medQuery, setMedQuery] = useState('')
  const [medResults, setMedResults] = useState<MedicationResult[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => { syncClinicMedications() }, [])

  const suggestions = diagQuery ? searchCie10(diagQuery) : []

  function addDiagnosis(code: string, description: string) {
    if (diagnoses.find((d) => d.code === code)) return
    setDiagnoses([...diagnoses, { code, description }])
    setDiagQuery('')
  }

  async function onMedQueryChange(q: string) {
    setMedQuery(q)
    if (q.trim()) {
      const results = await searchAllMedications(q)
      setMedResults(results)
    } else {
      setMedResults([])
    }
  }

  function addPrescriptionFromResult(m: MedicationResult) {
    setPrescriptions([
      ...prescriptions,
      {
        medication: `${m.name}${m.presentation ? ' ' + m.presentation : ''}`,
        dosage: m.defaultDosage ?? '',
        frequency: m.defaultFrequency ?? '',
        duration: '5 días',
        instructions: '',
      },
    ])
    setMedQuery('')
    setMedResults([])
  }

  function addBlankPrescription() {
    setPrescriptions([
      ...prescriptions,
      { medication: '', dosage: '', frequency: '', duration: '', instructions: '' },
    ])
  }

  function updatePrescription(idx: number, patch: Partial<Prescription>) {
    setPrescriptions(prescriptions.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
  }

  function removePrescription(idx: number) {
    setPrescriptions(prescriptions.filter((_, i) => i !== idx))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !patientId) return
    setSaving(true)
    try {
      await createRecord({
        clinicId: user.clinicId,
        patientId,
        doctorId: user.id,
        appointmentId: null,
        recordType: form.recordType,
        recordDate: new Date().toISOString(),
        subjective: form.subjective,
        objective: form.objective,
        assessment: form.assessment,
        plan: form.plan,
        diagnoses,
        vitalSigns: vitals,
        prescriptions,
        attachments: [],
        notes: null,
        localId: null,
        syncedAt: null,
      })
      router.replace(`/patients/${patientId}`)
    } finally {
      setSaving(false)
    }
  }

  const input = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-colors'

  const VITAL_FIELDS: { key: keyof VitalSigns; label: string; unit: string }[] = [
    { key: 'heartRate', label: 'Frecuencia Cardíaca', unit: 'BPM' },
    { key: 'bloodPressureSys', label: 'Presión Arterial', unit: 'mmHg' },
    { key: 'temperature', label: 'Temperatura', unit: '°C' },
    { key: 'spo2', label: 'Saturación O2', unit: '%' },
    { key: 'weight', label: 'Peso', unit: 'kg' },
    { key: 'height', label: 'Altura', unit: 'mt' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-slate-800">
          Nueva Consulta: {user ? `Dr. ${user.firstName}` : ''}
        </h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Vital Signs */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">💓</span>
            <h2 className="text-sm font-bold text-slate-700">Signos Vitales</h2>
          </div>
          <div className="grid grid-cols-6 gap-3">
            {VITAL_FIELDS.map(({ key, label, unit }) => (
              <div key={key} className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                <div className="mt-2 flex items-end justify-center gap-1">
                  <input
                    type="number"
                    step="0.1"
                    className="w-16 border-0 bg-transparent text-center text-2xl font-bold text-slate-800 focus:outline-none"
                    placeholder="—"
                    value={(vitals[key] as number | undefined) ?? ''}
                    onChange={(e) =>
                      setVitals({
                        ...vitals,
                        [key]: e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                  />
                  <span className="pb-1 text-xs text-slate-400">{unit}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SOAP + Prescriptions Layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* SOAP (2/3) */}
          <div className="lg:col-span-2 space-y-4">
            {(
              [
                ['subjective', 'Subjetivo (S)', 'Escriba el motivo de consulta, síntomas reportados y antecedentes relevantes…'],
                ['objective', 'Objetivo (O)', 'Hallazgos del examen físico, resultados de laboratorio y observaciones clínicas…'],
                ['assessment', 'Análisis / Diagnóstico (A)', 'Impresión diagnóstica y análisis clínico…'],
                ['plan', 'Plan (P)', 'Tratamiento indicado, seguimiento y recomendaciones…'],
              ] as const
            ).map(([key, label, placeholder]) => (
              <div key={key} className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
                <div className="border-b border-slate-100 px-5 py-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">{label}</h3>
                </div>
                <textarea
                  className="w-full resize-y border-0 px-5 py-4 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none min-h-[100px]"
                  placeholder={placeholder}
                  value={(form as any)[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}

            {/* Diagnoses */}
            <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-700">Diagnósticos (CIE-10)</h3>
              <input
                type="text"
                placeholder="Buscar por código o descripción…"
                className={input}
                value={diagQuery}
                onChange={(e) => setDiagQuery(e.target.value)}
              />
              {suggestions.length > 0 && (
                <div className="mt-2 max-h-40 overflow-auto rounded-xl border border-slate-200">
                  {suggestions.map((s) => (
                    <button
                      key={s.code}
                      type="button"
                      onClick={() => addDiagnosis(s.code, s.description)}
                      className="block w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 border-b border-slate-50 last:border-b-0"
                    >
                      <strong className="text-blue-600">{s.code}</strong>
                      <span className="text-slate-600"> · {s.description}</span>
                    </button>
                  ))}
                </div>
              )}
              {diagnoses.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {diagnoses.map((d) => (
                    <span key={d.code} className="flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-700">
                      {d.code}: {d.description}
                      <button type="button" onClick={() => setDiagnoses(diagnoses.filter((x) => x.code !== d.code))} className="ml-1 text-amber-400 hover:text-amber-700">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Prescriptions + Files */}
          <div className="space-y-4">
            {/* Prescriptions */}
            <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pill className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-700">Prescripción</h3>
                </div>
                <button type="button" onClick={addBlankPrescription} className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                  + Nueva
                </button>
              </div>

              {/* Search */}
              <input
                type="text"
                placeholder="Buscar medicamento…"
                className={`${input} mb-3`}
                value={medQuery}
                onChange={(e) => onMedQueryChange(e.target.value)}
              />
              {medResults.length > 0 && (
                <div className="mb-3 max-h-40 overflow-auto rounded-xl border border-slate-200">
                  {medResults.map((m, idx) => (
                    <button
                      key={`${m.name}-${idx}`}
                      type="button"
                      onClick={() => addPrescriptionFromResult(m)}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 border-b border-slate-50 last:border-b-0"
                    >
                      <span className="font-medium text-slate-700">{m.name}</span>
                      {m.presentation && <span className="text-slate-400"> · {m.presentation}</span>}
                      {m.source === 'clinic' && (
                        <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">recetado</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Prescription cards */}
              <div className="space-y-3">
                {prescriptions.map((p, idx) => (
                  <div key={idx} className="rounded-xl border-l-4 border-l-blue-400 border border-slate-100 bg-slate-50/50 p-3">
                    <div className="flex items-start justify-between mb-2">
                      <input
                        className="flex-1 border-0 bg-transparent text-sm font-bold text-slate-800 focus:outline-none"
                        placeholder="Medicamento"
                        value={p.medication}
                        onChange={(e) => updatePrescription(idx, { medication: e.target.value })}
                      />
                      <button type="button" onClick={() => removePrescription(idx)} className="text-slate-300 hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="space-y-1.5 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        <input
                          className="flex-1 border-0 bg-transparent focus:outline-none"
                          placeholder="Cada 8 horas"
                          value={p.frequency}
                          onChange={(e) => updatePrescription(idx, { frequency: e.target.value })}
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        <input
                          className="flex-1 border-0 bg-transparent focus:outline-none"
                          placeholder="Por 7 días"
                          value={p.duration}
                          onChange={(e) => updatePrescription(idx, { duration: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Attachments */}
            <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Archivos de Referencia</h3>
              <button
                type="button"
                className="w-full rounded-xl border-2 border-dashed border-slate-200 p-4 text-center text-xs font-medium text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
              >
                <Upload className="mx-auto mb-1 h-5 w-5" />
                + Adjuntar Archivo
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="sticky bottom-0 flex items-center justify-between rounded-2xl bg-white p-4 shadow-lg border border-slate-100">
          <div className="flex gap-3">
            <button type="button" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700">
              <Printer className="h-4 w-4" /> Imprimir Receta
            </button>
            <button type="button" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700">
              <Send className="h-4 w-4" /> Enviar a Correo
            </button>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Guardar Borrador
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Guardando…' : 'Finalizar Consulta'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default function NewRecordPage() {
  return (
    <Suspense fallback={<p className="text-slate-500">Cargando…</p>}>
      <NewRecordForm />
    </Suspense>
  )
}
