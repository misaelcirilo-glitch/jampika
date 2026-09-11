'use client'

import Link from 'next/link'
import { use, useEffect, useState } from 'react'
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Mail,
  MapPin,
  Phone,
  Printer,
  Stethoscope,
  User,
} from 'lucide-react'
import type { MedicalRecord, Patient } from '@jampika/shared'
import { getPatient } from '@/features/patients/patients.service'
import { listRecordsByPatient } from '@/features/records/records.service'
import FilesTab from '@/features/files/FilesTab'
import QuestionnairesTab from '@/features/questionnaires/QuestionnairesTab'
import { useAuthStore } from '@/stores/authStore'
import { hasModule } from '@/lib/professions'
import { formatDateTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

const ALLERGY_COLORS = [
  'bg-rose-100 text-rose-700 border-rose-200',
  'bg-amber-100 text-amber-700 border-amber-200',
  'bg-purple-100 text-purple-700 border-purple-200',
  'bg-cyan-100 text-cyan-700 border-cyan-200',
]

type Tab = 'resumen' | 'historia' | 'citas' | 'facturacion' | 'archivos' | 'cuestionarios'

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const clinic = useAuthStore((s) => s.clinic)
  const hasCuestionarios = hasModule(clinic, 'cuestionarios')
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

  if (!patient) return <p className="text-muted-foreground">Cargando paciente…</p>

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
    { key: 'archivos', label: 'Archivos' },
    ...(hasCuestionarios ? [{ key: 'cuestionarios' as Tab, label: 'Cuestionarios' }] : []),
  ]

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/patients" className="hover:text-primary">Pacientes</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">Detalle del Paciente</span>
      </div>

      {/* Patient Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-5">
              {/* Avatar */}
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 text-2xl font-bold text-white">
                {initials}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {patient.firstName} {patient.lastName}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {patient.documentNumber && (
                    <Badge variant="secondary" className="text-primary">
                      ID: {patient.documentNumber}
                    </Badge>
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
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground">Alergias:</span>
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
              <Button asChild>
                <Link href={`/records/new?patientId=${patient.id}`}>
                  Nueva Consulta
                </Link>
              </Button>
              <Button variant="outline">
                Expediente PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className="ml-1.5 text-xs text-muted-foreground">({t.count})</span>
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
              <Stethoscope className="h-5 w-5 text-primary" />
              <h2 className="text-base font-bold text-foreground">Cronología Clínica</h2>
            </div>

            {records.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  Sin registros. Crea la primera consulta.
                </CardContent>
              </Card>
            )}

            <div className="relative">
              {/* Timeline line */}
              {records.length > 0 && (
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
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
                      <div className="absolute left-2.5 top-5 h-3 w-3 rounded-full border-2 border-primary bg-card" />

                      <Card className="overflow-hidden">
                        <button
                          onClick={() => setExpanded(isOpen ? null : r.id)}
                          className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-foreground">{typeLabel}</span>
                              <Badge variant="secondary" className="text-primary uppercase">
                                {r.recordType}
                              </Badge>
                            </div>
                            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDateTime(r.recordDate)}
                              </span>
                            </div>
                          </div>
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isOpen && (
                          <div className="border-t border-border p-4 space-y-4">
                            {/* SOAP columns */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              {r.subjective && (
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Subjetivo</p>
                                  <p className="whitespace-pre-wrap text-muted-foreground">{r.subjective}</p>
                                </div>
                              )}
                              {r.objective && (
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Objetivo</p>
                                  <p className="whitespace-pre-wrap text-muted-foreground">{r.objective}</p>
                                </div>
                              )}
                            </div>

                            {/* Diagnoses */}
                            {r.diagnoses.length > 0 && (
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Diagnósticos</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {r.diagnoses.map((d) => (
                                    <Badge key={d.code} variant="warning" className="font-medium">
                                      {d.code}: {d.description}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Prescriptions */}
                            {r.prescriptions.length > 0 && (
                              <div>
                                <div className="mb-2 flex items-center justify-between">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    Receta ({r.prescriptions.length})
                                  </p>
                                  <Link
                                    href={`/records/${r.id}/print`}
                                    target="_blank"
                                    className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                                  >
                                    <Printer className="h-3 w-3" /> Imprimir
                                  </Link>
                                </div>
                                <div className="space-y-2">
                                  {r.prescriptions.map((p, idx) => (
                                    <div key={idx} className="rounded-xl border border-border bg-muted/50 p-3">
                                      <p className="text-sm font-semibold text-foreground">{p.medication}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {[p.dosage, p.frequency, p.duration].filter(Boolean).join(' · ')}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <Link
                              href="#"
                              className="inline-block text-xs font-semibold text-primary hover:underline"
                            >
                              Ver detalles completos →
                            </Link>
                          </div>
                        )}
                      </Card>
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
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{records.length}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Visitas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-primary">
                    {records.filter((r) => r.recordType === 'procedure').length}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cirugías</p>
                </CardContent>
              </Card>
            </div>

            {/* Contact Info */}
            <Card>
              <CardContent className="p-5">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Información de Contacto</h3>
                <div className="space-y-3 text-sm">
                  {patient.phone && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{patient.phone}</span>
                    </div>
                  )}
                  {patient.email && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{patient.email}</span>
                    </div>
                  )}
                  {patient.address && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{patient.address}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            {patient.emergencyContactName && (
              <Card>
                <CardContent className="p-5">
                  <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Acompañante Sugerido</h3>
                  <p className="font-semibold text-foreground">{patient.emergencyContactName}</p>
                  {patient.emergencyContactPhone && (
                    <p className="mt-1 text-sm text-muted-foreground">{patient.emergencyContactPhone}</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Insurance */}
            {patient.insuranceProvider && (
              <Card className="bg-primary text-primary-foreground">
                <CardContent className="p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-foreground/70">Seguro de Salud</p>
                  <p className="mt-1 text-lg font-bold">{patient.insuranceProvider}</p>
                  {patient.insuranceNumber && (
                    <p className="mt-0.5 text-sm text-primary-foreground/70">N°: {patient.insuranceNumber}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {tab === 'resumen' && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Resumen del paciente — próximamente
          </CardContent>
        </Card>
      )}

      {tab === 'citas' && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Historial de citas — próximamente
          </CardContent>
        </Card>
      )}

      {tab === 'facturacion' && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Facturación del paciente — próximamente
          </CardContent>
        </Card>
      )}

      {tab === 'archivos' && <FilesTab patientId={id} />}
      {tab === 'cuestionarios' && <QuestionnairesTab patientId={id} />}
    </div>
  )
}
