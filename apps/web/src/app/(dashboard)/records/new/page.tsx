'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import type { Diagnosis, Prescription, RecordType, VitalSigns } from '@jampika/shared'
import { searchCie10 } from '@jampika/shared'
import { createRecord } from '@/features/records/records.service'
import { searchAllMedications, syncClinicMedications, type MedicationResult } from '@/features/medications/medications.service'
import { useAuthStore } from '@/stores/authStore'
import { getProfession, hasModule } from '@/lib/professions'
import { ArrowLeft, Clock, Pill, Printer, Send, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

function NewRecordForm() {
  const router = useRouter()
  const params = useSearchParams()
  const patientId = params.get('patientId') ?? ''
  const user = useAuthStore((s) => s.user)
  const clinic = useAuthStore((s) => s.clinic)
  const prof = getProfession(clinic?.professionType)
  const showCie10 = hasModule(clinic, 'cie10')
  const showRecetas = hasModule(clinic, 'recetas')

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

  // Crea el registro (append-only) y lo devuelve. null si falta contexto.
  async function save() {
    if (!user || !patientId) return null
    setSaving(true)
    try {
      return await createRecord({
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
    } finally {
      setSaving(false)
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const record = await save()
    if (record) router.replace(`/patients/${patientId}`)
  }

  // "Imprimir Receta": guarda la consulta y abre su vista de impresión.
  async function saveAndPrint() {
    const record = await save()
    if (record) router.push(`/records/${record.id}/print`)
  }

  const VITAL_FIELDS: { key: keyof VitalSigns; label: string; unit: string }[] = [
    { key: 'heartRate', label: 'Frecuencia Cardíaca', unit: 'lpm' },
    { key: 'bloodPressureSys', label: 'Presión Arterial', unit: 'mmHg' },
    { key: 'temperature', label: 'Temperatura', unit: '°C' },
    { key: 'spo2', label: 'Saturación O2', unit: '%' },
    { key: 'weight', label: 'Peso', unit: 'kg' },
    { key: 'height', label: 'Altura', unit: 'm' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-9 w-9 text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold text-foreground">
          Nueva {prof.session}: {user ? user.firstName : ''}
        </h1>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Vital Signs */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">💓</span>
            <h2 className="text-sm font-bold text-foreground">Signos Vitales</h2>
          </div>
          <div className="grid grid-cols-6 gap-3">
            {VITAL_FIELDS.map(({ key, label, unit }) => (
              <Card key={key} className="p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                <div className="mt-2 flex items-end justify-center gap-1">
                  <input
                    type="number"
                    step="0.1"
                    className="w-16 border-0 bg-transparent text-center text-2xl font-bold text-foreground focus:outline-none"
                    placeholder="—"
                    value={(vitals[key] as number | undefined) ?? ''}
                    onChange={(e) =>
                      setVitals({
                        ...vitals,
                        [key]: e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                  />
                  <span className="pb-1 text-xs text-muted-foreground">{unit}</span>
                </div>
              </Card>
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
              <Card key={key} className="overflow-hidden">
                <div className="border-b border-border px-5 py-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">{label}</h3>
                </div>
                <textarea
                  className="w-full resize-y border-0 bg-transparent px-5 py-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none min-h-[100px]"
                  placeholder={placeholder}
                  value={(form as any)[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </Card>
            ))}

            {/* Diagnoses (CIE-10) — solo si el módulo está activo */}
            {showCie10 && (
            <Card className="p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground">Diagnósticos (CIE-10)</h3>
              <Input
                type="text"
                placeholder="Buscar por código o descripción…"
                value={diagQuery}
                onChange={(e) => setDiagQuery(e.target.value)}
              />
              {suggestions.length > 0 && (
                <div className="mt-2 max-h-40 overflow-auto rounded-md border border-border">
                  {suggestions.map((s) => (
                    <button
                      key={s.code}
                      type="button"
                      onClick={() => addDiagnosis(s.code, s.description)}
                      className="block w-full px-4 py-2.5 text-left text-sm hover:bg-muted border-b border-border last:border-b-0"
                    >
                      <strong className="text-primary">{s.code}</strong>
                      <span className="text-muted-foreground"> · {s.description}</span>
                    </button>
                  ))}
                </div>
              )}
              {diagnoses.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {diagnoses.map((d) => (
                    <span key={d.code} className="flex items-center gap-1 rounded-lg bg-warning/10 border border-warning/20 px-2.5 py-1 text-xs font-medium text-warning-foreground">
                      {d.code}: {d.description}
                      <button type="button" onClick={() => setDiagnoses(diagnoses.filter((x) => x.code !== d.code))} className="ml-1 text-warning-foreground/60 hover:text-warning-foreground">×</button>
                    </span>
                  ))}
                </div>
              )}
            </Card>
            )}
          </div>

          {/* Right Column: Prescriptions + Files */}
          <div className="space-y-4">
            {/* Prescriptions — solo si el módulo 'recetas' está activo */}
            {showRecetas && (
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pill className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Prescripción</h3>
                </div>
                <button type="button" onClick={addBlankPrescription} className="text-xs font-semibold text-primary hover:text-primary/80">
                  + Nueva
                </button>
              </div>

              {/* Search */}
              <Input
                type="text"
                placeholder="Buscar medicamento…"
                className="mb-3"
                value={medQuery}
                onChange={(e) => onMedQueryChange(e.target.value)}
              />
              {medResults.length > 0 && (
                <div className="mb-3 max-h-40 overflow-auto rounded-md border border-border">
                  {medResults.map((m, idx) => (
                    <button
                      key={`${m.name}-${idx}`}
                      type="button"
                      onClick={() => addPrescriptionFromResult(m)}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-muted border-b border-border last:border-b-0"
                    >
                      <span className="font-medium text-foreground">{m.name}</span>
                      {m.presentation && <span className="text-muted-foreground"> · {m.presentation}</span>}
                      {m.source === 'clinic' && (
                        <span className="ml-2 rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-semibold text-success">recetado</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Prescription cards */}
              <div className="space-y-3">
                {prescriptions.map((p, idx) => (
                  <div key={idx} className="rounded-xl border-l-4 border-l-primary border border-border bg-muted/50 p-3">
                    <div className="flex items-start justify-between mb-2">
                      <input
                        className="flex-1 border-0 bg-transparent text-sm font-bold text-foreground focus:outline-none"
                        placeholder="Medicamento"
                        value={p.medication}
                        onChange={(e) => updatePrescription(idx, { medication: e.target.value })}
                      />
                      <button type="button" onClick={() => removePrescription(idx)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="space-y-1.5 text-xs text-muted-foreground">
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
            </Card>
            )}

            {/* Attachments */}
            <Card className="p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Archivos de Referencia</h3>
              <button
                type="button"
                className="w-full rounded-xl border-2 border-dashed border-border p-4 text-center text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
              >
                <Upload className="mx-auto mb-1 h-5 w-5" />
                + Adjuntar Archivo
              </button>
            </Card>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <Card className="sticky bottom-0 flex items-center justify-between p-4 shadow-lg">
          <div className="flex gap-3">
            {showRecetas && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={saveAndPrint}
                disabled={saving}
                className="text-muted-foreground"
              >
                <Printer className="h-4 w-4" /> Imprimir Receta
              </Button>
            )}
            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground">
              <Send className="h-4 w-4" /> Enviar a Correo
            </Button>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Guardar Borrador
            </Button>
            <Button type="submit" variant="destructive" disabled={saving}>
              {saving ? 'Guardando…' : 'Finalizar Consulta'}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  )
}

export default function NewRecordPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
      <NewRecordForm />
    </Suspense>
  )
}
