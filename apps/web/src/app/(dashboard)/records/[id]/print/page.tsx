'use client'

import { use, useEffect, useState } from 'react'
import { Printer } from 'lucide-react'
import type { MedicalRecord, Patient } from '@jampika/shared'
import { api } from '@/lib/api'
import { db } from '@/lib/db/schema'
import { useAuthStore } from '@/stores/authStore'
import { formatDate } from '@/lib/utils'

export default function PrintRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [record, setRecord] = useState<MedicalRecord | null>(null)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [clinicFull, setClinicFull] = useState<any>(null)
  const user = useAuthStore((s) => s.user)
  const clinic = useAuthStore((s) => s.clinic)

  useEffect(() => {
    void db.medical_records.get(id).then(async (r) => {
      if (!r) return
      setRecord(r)
      const p = await db.patients.get(r.patientId)
      setPatient(p ?? null)
    })
    void api.get<any>('/settings/clinic').then(setClinicFull).catch(() => {})
  }, [id])

  if (!record || !patient) return <p className="p-8 text-slate-500">Cargando…</p>

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <div className="mx-auto max-w-2xl py-6 print:py-0">
        <div className="mb-4 flex justify-end print:hidden">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <Printer className="h-4 w-4" /> Imprimir
          </button>
        </div>

        <div className="rounded-xl bg-white p-10 shadow-sm print:rounded-none print:p-6 print:shadow-none">
          {/* Encabezado clínica */}
          <div className="mb-6 flex items-start gap-4 border-b border-slate-300 pb-4">
            {clinicFull?.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={clinicFull.logoUrl}
                alt="Logo"
                className="h-20 w-20 flex-shrink-0 object-contain"
              />
            )}
            <div className="flex-1 text-center">
              <h1 className="text-2xl font-bold text-slate-800">
                {clinicFull?.name ?? clinic?.name ?? 'Clínica'}
              </h1>
              {clinicFull?.taxId && (
                <p className="text-xs text-slate-500">RUC/NIT: {clinicFull.taxId}</p>
              )}
              {clinicFull?.address && (
                <p className="text-xs text-slate-500">{clinicFull.address}</p>
              )}
              {(clinicFull?.phone || clinicFull?.email) && (
                <p className="text-xs text-slate-500">
                  {[clinicFull.phone, clinicFull.email].filter(Boolean).join(' · ')}
                </p>
              )}
              <p className="mt-1 text-sm font-bold uppercase tracking-wider text-primary-700">
                Receta médica
              </p>
            </div>
          </div>

          {/* Datos paciente */}
          <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Paciente</p>
              <p className="font-semibold text-slate-800">
                {patient.lastName}, {patient.firstName}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Documento</p>
              <p className="font-semibold text-slate-800">
                {patient.documentType} {patient.documentNumber}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400">Fecha</p>
              <p className="font-semibold text-slate-800">{formatDate(record.recordDate)}</p>
            </div>
            {patient.birthDate && (
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Nacimiento</p>
                <p className="font-semibold text-slate-800">{formatDate(patient.birthDate)}</p>
              </div>
            )}
          </div>

          {/* Diagnósticos */}
          {record.diagnoses.length > 0 && (
            <div className="mb-6">
              <p className="mb-2 text-[10px] font-bold uppercase text-slate-400">Diagnóstico</p>
              <ul className="list-disc pl-5 text-sm">
                {record.diagnoses.map((d) => (
                  <li key={d.code}>
                    <span className="font-mono text-slate-500">{d.code}</span>{' '}
                    {d.description}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Rx */}
          <div className="mb-6">
            <div className="mb-3 flex items-baseline gap-3 border-b border-slate-300 pb-2">
              <span className="text-3xl font-bold text-primary-700">℞</span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Indicaciones
              </span>
            </div>
            {record.prescriptions.length === 0 ? (
              <p className="italic text-slate-400">Sin medicación prescrita.</p>
            ) : (
              <ol className="space-y-3 text-sm">
                {record.prescriptions.map((p, idx) => (
                  <li key={idx} className="border-b border-dashed border-slate-200 pb-2 last:border-b-0">
                    <div className="font-semibold text-slate-800">
                      {idx + 1}. {p.medication}
                    </div>
                    <div className="text-slate-600">
                      {[p.dosage, p.frequency, p.duration].filter(Boolean).join(' · ')}
                    </div>
                    {p.instructions && (
                      <div className="mt-0.5 text-xs italic text-slate-500">{p.instructions}</div>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Plan */}
          {record.plan && (
            <div className="mb-6">
              <p className="mb-2 text-[10px] font-bold uppercase text-slate-400">Plan / recomendaciones</p>
              <p className="whitespace-pre-wrap text-sm text-slate-700">{record.plan}</p>
            </div>
          )}

          {/* Firma */}
          <div className="mt-16 text-center">
            <div className="mx-auto mb-1 w-64 border-t border-slate-400" />
            <p className="text-sm font-semibold text-slate-800">
              {user ? `${user.firstName} ${user.lastName}` : 'Médico'}
            </p>
            <p className="text-xs text-slate-500">Firma y sello</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          nav, aside, header { display: none !important; }
          main { padding: 0 !important; overflow: visible !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  )
}
