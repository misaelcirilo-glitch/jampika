'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Coffee,
  Filter,
  Plus,
  Stethoscope,
  X,
} from 'lucide-react'
import type { Appointment, AppointmentStatus, AppointmentType, Patient } from '@jampika/shared'
import { createAppointment, listAppointments, updateAppointment } from '@/features/appointments/appointments.service'
import { listPatients } from '@/features/patients/patients.service'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

interface Doctor {
  id: string
  firstName: string
  lastName: string
  specialty?: string | null
  color?: string | null
  role: string
  isActive?: boolean
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-white border-slate-200',
  confirmed: 'bg-orange-50 border-orange-200',
  in_progress: 'bg-blue-50 border-blue-200',
  completed: 'bg-green-50 border-green-200',
  cancelled: 'bg-red-50 border-red-200 opacity-60',
  no_show: 'bg-rose-50 border-rose-200 opacity-60',
}

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function sameDate(a: Date, b: Date): boolean {
  return toDateStr(a) === toDateStr(b)
}

function startOfWeek(d: Date): Date {
  const result = new Date(d)
  const day = result.getDay() // 0 dom, 1 lun...
  const diff = day === 0 ? -6 : 1 - day
  result.setDate(result.getDate() + diff)
  result.setHours(0, 0, 0, 0)
  return result
}

export default function AppointmentsPage() {
  const user = useAuthStore((s) => s.user)
  const [view, setView] = useState<'day' | 'week' | 'month'>('day')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all')
  const [modal, setModal] = useState<
    | {
        open: boolean
        date: string
        time: string
        doctorId: string
        editing?: Appointment
      }
    | null
  >(null)

  async function refresh() {
    let from: Date
    let to: Date
    if (view === 'month') {
      const first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      from = startOfWeek(first)
      to = new Date(from)
      to.setDate(to.getDate() + 41)
      to.setHours(23, 59, 59, 999)
    } else if (view === 'week') {
      from = startOfWeek(currentDate)
      to = new Date(from)
      to.setDate(to.getDate() + 6)
      to.setHours(23, 59, 59, 999)
    } else {
      from = new Date(currentDate)
      from.setHours(0, 0, 0, 0)
      to = new Date(currentDate)
      to.setHours(23, 59, 59, 999)
    }
    const [apts, ps, usersRes] = await Promise.all([
      listAppointments(from, to),
      listPatients(),
      api.get<{ data: Doctor[] }>('/settings/users').catch(() => ({ data: [] as Doctor[] })),
    ])
    setAppointments(apts)
    setPatients(ps)
    setDoctors(usersRes.data.filter((u) => u.role === 'doctor' && u.isActive !== false))
  }

  useEffect(() => {
    void refresh()
  }, [currentDate, view])

  const visibleDoctors = useMemo(
    () => (selectedDoctor === 'all' ? doctors : doctors.filter((d) => d.id === selectedDoctor)),
    [doctors, selectedDoctor],
  )

  const patientsById = useMemo(() => {
    const map: Record<string, Patient> = {}
    patients.forEach((p) => (map[p.id] = p))
    return map
  }, [patients])

  const timeSlots = Array.from({ length: 13 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`)

  function nav(dir: -1 | 1) {
    const d = new Date(currentDate)
    if (view === 'month') {
      d.setMonth(d.getMonth() + dir)
    } else {
      d.setDate(d.getDate() + dir * (view === 'week' ? 7 : 1))
    }
    setCurrentDate(d)
  }

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [currentDate])

  const monthDays = useMemo(() => {
    const first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const start = startOfWeek(first)
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [currentDate])

  function openNewAppt(date: string, time: string, doctorId: string) {
    setModal({ open: true, date, time, doctorId })
  }

  function openEditAppt(apt: Appointment) {
    const start = new Date(apt.startTime)
    setModal({
      open: true,
      date: toDateStr(start),
      time: start.toTimeString().slice(0, 5),
      doctorId: apt.doctorId,
      editing: apt,
    })
  }

  async function changeStatus(apt: Appointment, status: AppointmentStatus) {
    await updateAppointment(apt.id, { status })
    await refresh()
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 rounded-lg border border-slate-100 bg-slate-50 p-1">
            <button
              onClick={() => nav(-1)}
              className="rounded-md p-1.5 text-slate-600 hover:bg-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-xs font-bold uppercase text-slate-700"
            >
              Hoy
            </button>
            <button
              onClick={() => nav(1)}
              className="rounded-md p-1.5 text-slate-600 hover:bg-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <span className="text-xl font-bold capitalize text-slate-800">
            {view === 'day' &&
              currentDate.toLocaleString('es', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            {view === 'week' &&
              `${weekDays[0]!.toLocaleString('es', { day: 'numeric', month: 'short' })} — ${weekDays[6]!.toLocaleString('es', { day: 'numeric', month: 'short', year: 'numeric' })}`}
            {view === 'month' &&
              currentDate.toLocaleString('es', { month: 'long', year: 'numeric' })}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 p-1">
            <button
              onClick={() => setView('day')}
              className={`rounded-md px-3 py-1 text-xs font-bold uppercase ${view === 'day' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}
            >
              Día
            </button>
            <button
              onClick={() => setView('week')}
              className={`rounded-md px-3 py-1 text-xs font-bold uppercase ${view === 'week' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}
            >
              Semana
            </button>
            <button
              onClick={() => setView('month')}
              className={`rounded-md px-3 py-1 text-xs font-bold uppercase ${view === 'month' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}
            >
              Mes
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              className="bg-transparent text-xs font-bold outline-none"
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
            >
              <option value="all">Todos los profesionales</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.firstName} {d.lastName}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() =>
              openNewAppt(toDateStr(currentDate), '09:00', visibleDoctors[0]?.id ?? doctors[0]?.id ?? '')
            }
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Nueva cita
          </button>
        </div>
      </div>

      {/* Grilla */}
      <div className="flex-1 overflow-auto">
        {visibleDoctors.length === 0 ? (
          <div className="flex h-full items-center justify-center p-10 text-center">
            <div>
              <p className="mb-2 text-slate-500">No hay profesionales configurados.</p>
              <a href="/settings" className="text-sm font-medium text-blue-600">
                Configurar profesionales →
              </a>
            </div>
          </div>
        ) : view === 'month' ? (
          <div className="flex h-full flex-col">
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
                <div
                  key={d}
                  className="border-r border-slate-100 px-2 py-2 text-center text-xs font-bold uppercase text-slate-500 last:border-r-0"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid flex-1 grid-cols-7 grid-rows-6">
              {monthDays.map((day) => {
                const inMonth = day.getMonth() === currentDate.getMonth()
                const isToday = sameDate(day, new Date())
                const dayAppts = appointments
                  .filter((a) => {
                    const start = new Date(a.startTime)
                    if (!sameDate(start, day)) return false
                    if (selectedDoctor !== 'all' && a.doctorId !== selectedDoctor) return false
                    return true
                  })
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => {
                      setCurrentDate(day)
                      setView('day')
                    }}
                    className={`flex cursor-pointer flex-col gap-1 border-b border-r border-slate-100 p-1.5 text-xs transition hover:bg-blue-50/50 ${
                      inMonth ? 'bg-white' : 'bg-slate-50 text-slate-400'
                    } ${isToday ? 'bg-blue-50' : ''}`}
                  >
                    <div
                      className={`text-right text-sm font-bold ${isToday ? 'text-blue-700' : inMonth ? 'text-slate-700' : 'text-slate-400'}`}
                    >
                      {day.getDate()}
                    </div>
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      {dayAppts.slice(0, 3).map((apt) => {
                        const patient = patientsById[apt.patientId]
                        const doctor = doctors.find((x) => x.id === apt.doctorId)
                        return (
                          <div
                            key={apt.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              openEditAppt(apt)
                            }}
                            className="truncate rounded px-1 py-0.5 text-[10px] font-medium text-white"
                            style={{ backgroundColor: doctor?.color ?? '#94a3b8' }}
                          >
                            {new Date(apt.startTime).toTimeString().slice(0, 5)}{' '}
                            {patient?.lastName ?? ''}
                          </div>
                        )
                      })}
                      {dayAppts.length > 3 && (
                        <div className="text-[10px] font-bold text-slate-500">
                          +{dayAppts.length - 3} más
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : view === 'day' ? (
          <div className="min-w-[800px]">
            <div className="sticky top-0 z-10 flex border-b border-slate-200 bg-slate-50 shadow-sm">
              <div className="w-16 flex-shrink-0 border-r border-slate-200 bg-white" />
              {visibleDoctors.map((d) => (
                <div
                  key={d.id}
                  className="flex-1 border-r border-slate-200 px-2 py-3 text-center last:border-r-0"
                  style={{ minWidth: 200 }}
                >
                  <div className="flex items-center justify-center gap-2 text-sm font-bold text-slate-800">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: d.color ?? '#94a3b8' }}
                    />
                    {d.firstName} {d.lastName}
                  </div>
                  {d.specialty && <div className="text-xs text-slate-500">{d.specialty}</div>}
                </div>
              ))}
            </div>

            {timeSlots.map((time) => {
              const slotHour = parseInt(time.split(':')[0]!, 10)
              return (
                <div key={time} className="flex min-h-[120px] border-b border-slate-100">
                  <div className="sticky left-0 z-10 flex w-16 flex-shrink-0 items-start justify-center border-r border-slate-200 bg-slate-50 pt-2 text-xs font-bold text-slate-500">
                    {time}
                  </div>
                  {visibleDoctors.map((d) => {
                    const slotAppts = appointments.filter((a) => {
                      const start = new Date(a.startTime)
                      return (
                        a.doctorId === d.id &&
                        sameDate(start, currentDate) &&
                        start.getHours() === slotHour
                      )
                    })
                    const isEmpty = slotAppts.length === 0
                    return (
                      <div
                        key={d.id}
                        onClick={() =>
                          isEmpty && openNewAppt(toDateStr(currentDate), time, d.id)
                        }
                        className={`group relative flex-1 border-r border-slate-100 p-1 last:border-r-0 ${
                          isEmpty ? 'cursor-pointer hover:bg-blue-50/50' : 'bg-white'
                        }`}
                        style={{ minWidth: 200 }}
                      >
                        {isEmpty && (
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="rounded-full border border-blue-200 bg-blue-100 px-3 py-1 text-[10px] font-bold text-blue-600 shadow-sm">
                              + Nueva cita
                            </div>
                          </div>
                        )}
                        <div className="relative z-10 flex h-full flex-col gap-1">
                          {slotAppts.map((apt) => {
                            const patient = patientsById[apt.patientId]
                            return (
                              <div
                                key={apt.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openEditAppt(apt)
                                }}
                                className={`flex cursor-pointer flex-col rounded-lg border border-l-4 p-2 text-xs shadow-sm transition-all hover:shadow-md ${STATUS_COLORS[apt.status] ?? ''}`}
                                style={{
                                  borderLeftColor: d.color ?? '#94a3b8',
                                  minHeight: `${(apt.durationMinutes / 60) * 120 - 8}px`,
                                }}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="min-w-0 flex-1 text-sm font-bold text-blue-700">
                                    {patient ? (
                                      <Link
                                        href={`/patients/${patient.id}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="hover:underline"
                                      >
                                        {patient.lastName}, {patient.firstName}
                                      </Link>
                                    ) : (
                                      'Paciente'
                                    )}
                                    {apt.reason && (
                                      <span className="font-normal text-slate-500"> ({apt.reason})</span>
                                    )}
                                  </div>
                                  <div className="ml-2 flex flex-shrink-0 gap-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        void changeStatus(apt, 'confirmed')
                                      }}
                                      title="Sala de espera"
                                      className={`rounded-full p-1 ${
                                        apt.status === 'confirmed'
                                          ? 'bg-orange-500 text-white'
                                          : 'bg-slate-200 text-slate-400 hover:bg-orange-200'
                                      }`}
                                    >
                                      <Coffee className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        void changeStatus(apt, 'in_progress')
                                      }}
                                      title="En consulta"
                                      className={`rounded-full p-1 ${
                                        apt.status === 'in_progress'
                                          ? 'bg-blue-500 text-white'
                                          : 'bg-slate-200 text-slate-400 hover:bg-blue-200'
                                      }`}
                                    >
                                      <Stethoscope className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        void changeStatus(apt, 'completed')
                                      }}
                                      title="Completada"
                                      className={`rounded-full p-1 ${
                                        apt.status === 'completed'
                                          ? 'bg-green-500 text-white'
                                          : 'bg-slate-200 text-slate-400 hover:bg-green-200'
                                      }`}
                                    >
                                      <CheckCircle className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="min-w-[1000px]">
            <div className="sticky top-0 z-10 flex border-b border-slate-200 bg-slate-50 shadow-sm">
              <div className="w-16 flex-shrink-0 border-r border-slate-200 bg-white" />
              {weekDays.map((d) => {
                const isToday = sameDate(d, new Date())
                return (
                  <div
                    key={d.toISOString()}
                    className={`flex-1 border-r border-slate-200 px-2 py-3 text-center last:border-r-0 ${isToday ? 'bg-blue-50' : ''}`}
                    style={{ minWidth: 140 }}
                  >
                    <div className="text-xs font-bold uppercase text-slate-500">
                      {d.toLocaleString('es', { weekday: 'short' })}
                    </div>
                    <div className={`text-lg font-bold ${isToday ? 'text-blue-700' : 'text-slate-800'}`}>
                      {d.getDate()}
                    </div>
                  </div>
                )
              })}
            </div>

            {timeSlots.map((time) => {
              const slotHour = parseInt(time.split(':')[0]!, 10)
              return (
                <div key={time} className="flex min-h-[100px] border-b border-slate-100">
                  <div className="sticky left-0 z-10 flex w-16 flex-shrink-0 items-start justify-center border-r border-slate-200 bg-slate-50 pt-2 text-xs font-bold text-slate-500">
                    {time}
                  </div>
                  {weekDays.map((day) => {
                    const slotAppts = appointments.filter((a) => {
                      const start = new Date(a.startTime)
                      if (!sameDate(start, day)) return false
                      if (start.getHours() !== slotHour) return false
                      if (selectedDoctor !== 'all' && a.doctorId !== selectedDoctor) return false
                      return true
                    })
                    const isEmpty = slotAppts.length === 0
                    return (
                      <div
                        key={day.toISOString()}
                        onClick={() =>
                          isEmpty &&
                          openNewAppt(
                            toDateStr(day),
                            time,
                            selectedDoctor !== 'all' ? selectedDoctor : doctors[0]?.id ?? '',
                          )
                        }
                        className={`group relative flex-1 border-r border-slate-100 p-1 last:border-r-0 ${
                          isEmpty ? 'cursor-pointer hover:bg-blue-50/50' : 'bg-white'
                        }`}
                        style={{ minWidth: 140 }}
                      >
                        {isEmpty && (
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-600 shadow-sm">
                              + Cita
                            </div>
                          </div>
                        )}
                        <div className="relative z-10 flex h-full flex-col gap-1">
                          {slotAppts.map((apt) => {
                            const patient = patientsById[apt.patientId]
                            const doctor = doctors.find((x) => x.id === apt.doctorId)
                            return (
                              <div
                                key={apt.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openEditAppt(apt)
                                }}
                                className={`flex cursor-pointer flex-col rounded-lg border border-l-4 p-1.5 text-[11px] shadow-sm transition-all hover:shadow-md ${STATUS_COLORS[apt.status] ?? ''}`}
                                style={{
                                  borderLeftColor: doctor?.color ?? '#94a3b8',
                                  minHeight: `${(apt.durationMinutes / 60) * 100 - 8}px`,
                                }}
                              >
                                <div className="font-bold text-slate-700">
                                  {new Date(apt.startTime).toTimeString().slice(0, 5)}
                                </div>
                                <div className="truncate font-bold text-blue-700">
                                  {patient ? (
                                    <Link
                                      href={`/patients/${patient.id}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="hover:underline"
                                    >
                                      {patient.lastName}, {patient.firstName}
                                    </Link>
                                  ) : (
                                    'Paciente'
                                  )}
                                </div>
                                {apt.reason && (
                                  <div className="truncate text-[10px] text-slate-500">
                                    {apt.reason}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modal?.open && (
        <NewApptModal
          initial={modal}
          doctors={doctors}
          patients={patients}
          onClose={() => setModal(null)}
          onSaved={async () => {
            setModal(null)
            await refresh()
          }}
          clinicId={user?.clinicId ?? ''}
        />
      )}
    </div>
  )
}

function NewApptModal({
  initial,
  doctors,
  patients,
  onClose,
  onSaved,
  clinicId,
}: {
  initial: { date: string; time: string; doctorId: string; editing?: Appointment }
  doctors: Doctor[]
  patients: Patient[]
  onClose: () => void
  onSaved: () => void
  clinicId: string
}) {
  const editing = initial.editing
  const [form, setForm] = useState({
    patientId: editing?.patientId ?? '',
    doctorId: initial.doctorId,
    date: initial.date,
    time: initial.time,
    durationMinutes: editing?.durationMinutes ?? 30,
    type: (editing?.appointmentType ?? 'first_visit') as AppointmentType,
    reason: editing?.reason ?? '',
    status: editing?.status ?? 'scheduled',
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (!form.patientId || !form.doctorId) {
      setError('Selecciona paciente y profesional')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const start = new Date(`${form.date}T${form.time}:00`)
      const end = new Date(start.getTime() + form.durationMinutes * 60000)
      if (editing) {
        await updateAppointment(editing.id, {
          patientId: form.patientId,
          doctorId: form.doctorId,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          durationMinutes: form.durationMinutes,
          appointmentType: form.type,
          reason: form.reason || null,
          status: form.status,
        })
      } else {
        await createAppointment({
          clinicId,
          patientId: form.patientId,
          doctorId: form.doctorId,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          durationMinutes: form.durationMinutes,
          status: 'scheduled',
          appointmentType: form.type,
          specialty: null,
          reason: form.reason || null,
          notes: null,
          reminderSentAt: null,
          localId: null,
          syncedAt: null,
        })
      }
      onSaved()
    } catch (err: any) {
      setError(err?.message ?? 'Error')
    } finally {
      setSaving(false)
    }
  }

  async function cancelAppt() {
    if (!editing) return
    if (!confirm('¿Cancelar esta cita?')) return
    setDeleting(true)
    try {
      await updateAppointment(editing.id, { status: 'cancelled' })
      onSaved()
    } finally {
      setDeleting(false)
    }
  }

  const label = 'mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400'
  const input = 'w-full rounded-lg border border-slate-300 p-2 font-bold'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b bg-slate-50 px-6 py-4">
          <h3 className="text-sm font-bold uppercase tracking-tight text-slate-800">
            {editing ? 'Editar cita' : 'Nueva cita'}
          </h3>
          <button onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-6 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Fecha</label>
              <input
                type="date"
                className={input}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <label className={label}>Hora</label>
              <input
                type="time"
                className={input}
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className={label}>Paciente</label>
            <select
              className={`${input} bg-white`}
              value={form.patientId}
              onChange={(e) => setForm({ ...form, patientId: e.target.value })}
            >
              <option value="">— Seleccionar paciente —</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.lastName}, {p.firstName} ({p.documentNumber})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Profesional</label>
              <select
                className={`${input} bg-white`}
                value={form.doctorId}
                onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
              >
                <option value="">— Seleccionar —</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.firstName} {d.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Duración</label>
              <select
                className={`${input} bg-white`}
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>1 h</option>
              </select>
            </div>
          </div>

          <div>
            <label className={label}>Motivo / Tipo</label>
            <input
              className={input}
              placeholder="Ej: Control, primera consulta..."
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </div>

          {editing && (
            <div>
              <label className={label}>Estado</label>
              <select
                className={`${input} bg-white`}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as any })}
              >
                <option value="scheduled">Programada</option>
                <option value="confirmed">Confirmada / Sala de espera</option>
                <option value="in_progress">En consulta</option>
                <option value="completed">Completada</option>
                <option value="cancelled">Cancelada</option>
                <option value="no_show">No asistió</option>
              </select>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t bg-slate-50 p-4">
          <div>
            {editing && (
              <button
                onClick={cancelAppt}
                disabled={deleting}
                className="rounded-lg border border-red-300 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {deleting ? 'Cancelando…' : 'Cancelar cita'}
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="rounded-lg border px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-100"
            >
              Cerrar
            </button>
            <button
              onClick={save}
              disabled={saving || !form.patientId || !form.doctorId}
              className="rounded-lg bg-blue-600 px-8 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
