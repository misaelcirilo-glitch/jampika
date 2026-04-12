'use client'

import Link from 'next/link'
import { use, useEffect, useState } from 'react'
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Mail,
  MapPin,
  Phone,
  Printer,
  Scissors,
  Stethoscope,
  User,
} from 'lucide-react'
import type { MedicalRecord, Patient } from '@jampika/shared'
import { getPatient } from '@/features/patients/patients.service'
import { listRecordsByPatient } from '@/features/records/records.service'
import { formatDate, formatDateTime } from '@/lib/utils'

const ALLERGY_COLORS = [
  'bg-rose-100 text-rose-700 border-rose-200',
  'bg-amber-100 text-amber-700 border-amber-200',
  'bg-purple-100 text-purple-700 border-purple-200',
  'bg-cyan-100 text-cyan-700 border-cyan-200',
]

type Tab = 'resumen' | 'historia' | 'citas' | 'facturacion'

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('historia')

  useEffect(() => {
    void getPatient(id).then((p) => setPatient(p ?? null))
    void listRecordsByPatient(id).then((r) => {
      setRecords(r)
      if (r.length > 0) setExpanded(r[0]!.id)
    })
  }, [id])

  if (!patient) return <p className="text-slate-500">Cargando paciente…</p>

  const age = patient.birthDate
    ? Math.floor((Date.now() - new Date(patient.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null

  const initials = `${patient.firstName[0]}${patient.lastName[0]}`.toUpperCase()
  const genderLabel = patient.gender === 'M' ? 'Masculino' : patient.gender === 'F' ? 'Femenino' : patient.gender ?? ''

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'resumen', label: 'Resumen' },
    { key: 'historia', label: 'Historia Médica' },
    { key: 'citas', label: 'Citas', count: records.length },
    { key: 'facturacion', label: 'Facturación' },
  ]

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/patients" className="hover:text-blue-600">Pacientes</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-slate-600">Detalle del Paciente</span>
      </div>

      {/* Patient Header Card */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 text-2xl font-bold text-white">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {patient.firstName} {patient.lastName}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                {patient.documentNumber && (
                  <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
                    ID: {patient.documentNumber}
                  </span>
                )}
                {age !== null && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> {age} años
                  </span>
                )}
                {patient.bloodType && (
                  <span className="flex items-center gap-1">
                    {patient.bloodType}
                  </span>
                )}
                {genderLabel && (
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" /> {genderLabel}
                  </span>
                )}
              </div>
              {/* Allergies */}
              {patient.allergies.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold uppercase text-slate-400">Alergias:</span>
                  {patient.allergies.map((a, i) => (
                    <span
                      key={a}
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${ALLERGY_COLORS[i % ALLERGY_COLORS.length]}`}
                    >
                      {a}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/records/new?patientId=${patient.id}`}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Nueva Consulta
            </Link>
            <button className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
              Expediente PDF
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 ${
              tab === t.key
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className="ml-1.5 text-xs text-slate-400">({t.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'historia' && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Timeline */}
          <div className="lg:col-span-2 space-y-1">
            <div className="flex items-center gap-2 mb-4">
              <Stethoscope className="h-5 w-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-800">Cronología Clínica</h2>
            </div>

            {records.length === 0 && (
              <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-400 shadow-sm border border-slate-100">
                Sin registros. Crea la primera consulta.
              </p>
            )}

            <div className="relative">
              {/* Timeline line */}
              {records.length > 0 && (
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
              )}

              <div className="space-y-4">
                {records.map((r) => {
                  const isOpen = expanded === r.id
                  const typeLabel = r.recordType === 'consultation' ? 'Consulta General'
                    : r.recordType === 'follow_up' ? 'Control'
                    : r.recordType === 'emergency' ? 'Emergencia'
                    : r.recordType === 'procedure' ? 'Procedimiento'
                    : r.recordType
                  return (
                    <div key={r.id} className="relative pl-10">
                      {/* Timeline dot */}
                      <div className="absolute left-2.5 top-5 h-3 w-3 rounded-full border-2 border-blue-500 bg-white" />

                      <div className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
                        <button
                          onClick={() => setExpanded(isOpen ? null : r.id)}
                          className="flex w-full items-center justify-between p-4 text-left hover:bg-slate-50/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-slate-800">{typeLabel}</span>
                              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-600">
                                {r.recordType}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDateTime(r.recordDate)}
                              </span>
                            </div>
                          </div>
                          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isOpen && (
                          <div className="border-t border-slate-100 p-4 space-y-4">
                            {/* SOAP columns */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              {r.subjective && (
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Subjetivo</p>
                                  <p className="whitespace-pre-wrap text-slate-600">{r.subjective}</p>
                                </div>
                              )}
                              {r.objective && (
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Objetivo</p>
                                  <p className="whitespace-pre-wrap text-slate-600">{r.objective}</p>
                                </div>
                              )}
                            </div>

                            {/* Diagnoses */}
                            {r.diagnoses.length > 0 && (
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Diagnósticos</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {r.diagnoses.map((d) => (
                                    <span key={d.code} className="rounded-lg bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-700">
                                      {d.code}: {d.description}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Prescriptions */}
                            {r.prescriptions.length > 0 && (
                              <div>
                                <div className="mb-2 flex items-center justify-between">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Receta ({r.prescriptions.length})
                                  </p>
                                  <Link
                                    href={`/records/${r.id}/print`}
                                    target="_blank"
                                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                                  >
                                    <Printer className="h-3 w-3" /> Imprimir
                                  </Link>
                                </div>
                                <div className="space-y-2">
                                  {r.prescriptions.map((p, idx) => (
                                    <div key={idx} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                                      <p className="text-sm font-semibold text-slate-800">{p.medication}</p>
                                      <p className="text-xs text-slate-500">
                                        {[p.dosage, p.frequency, p.duration].filter(Boolean).join(' · ')}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <Link
                              href="#"
                              className="inline-block text-xs font-semibold text-blue-600 hover:text-blue-700"
                            >
                              Ver detalles completos →
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 text-center">
                <p className="text-2xl font-bold text-blue-600">{records.length}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Visitas</p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {records.filter((r) => r.recordType === 'procedure').length}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Cirugías</p>
              </div>
            </div>

            {/* Contact Info */}
            <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Información de Contacto</h3>
              <div className="space-y-3 text-sm">
                {patient.phone && (
                  <div className="flex items-center gap-3 text-slate-600">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span>{patient.phone}</span>
                  </div>
                )}
                {patient.email && (
                  <div className="flex items-center gap-3 text-slate-600">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span>{patient.email}</span>
                  </div>
                )}
                {patient.address && (
                  <div className="flex items-center gap-3 text-slate-600">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <span>{patient.address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Emergency Contact */}
            {patient.emergencyContactName && (
              <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Acompañante Sugerido</h3>
                <p className="font-semibold text-slate-800">{patient.emergencyContactName}</p>
                {patient.emergencyContactPhone && (
                  <p className="mt-1 text-sm text-slate-500">{patient.emergencyContactPhone}</p>
                )}
              </div>
            )}

            {/* Insurance */}
            {patient.insuranceProvider && (
              <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-200">Seguro de Salud</p>
                <p className="mt-1 text-lg font-bold">{patient.insuranceProvider}</p>
                {patient.insuranceNumber && (
                  <p className="mt-0.5 text-sm text-blue-200">N°: {patient.insuranceNumber}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'resumen' && (
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-100 text-center text-slate-400">
          Resumen del paciente — próximamente
        </div>
      )}

      {tab === 'citas' && (
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-100 text-center text-slate-400">
          Historial de citas — próximamente
        </div>
      )}

      {tab === 'facturacion' && (
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-100 text-center text-slate-400">
          Facturación del paciente — próximamente
        </div>
      )}
    </div>
  )
}
