'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

interface Info {
  clinicName: string
  enabled: boolean
  slotMinutes: number
}
interface DaySlots {
  date: string
  times: string[]
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}
function dayLabel(dateStr: string): string {
  try {
    return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })
  } catch {
    return dateStr
  }
}

export default function ReservarPage() {
  const params = useParams<{ slug: string }>()
  const slug = params?.slug ?? ''

  const [info, setInfo] = useState<Info | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState<DaySlots[]>([])
  const [activeDate, setActiveDate] = useState<string | null>(null)
  const [time, setTime] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    ;(async () => {
      try {
        const r = await fetch(`${API}/public/booking/${slug}`)
        if (!r.ok) {
          setInfo(null)
          return
        }
        const data: Info = await r.json()
        setInfo(data)
        if (data.enabled) {
          const av = await fetch(`${API}/public/booking/${slug}/availability?from=${todayStr()}&days=14`)
          const j = await av.json()
          setDays(j.data ?? [])
          setActiveDate((j.data?.[0]?.date as string) ?? null)
        }
      } catch {
        setInfo(null)
      } finally {
        setLoading(false)
      }
    })()
  }, [slug])

  const activeTimes = useMemo(() => days.find((d) => d.date === activeDate)?.times ?? [], [days, activeDate])

  async function submit() {
    if (!activeDate || !time || !name.trim() || !phone.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const r = await fetch(`${API}/public/booking/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, date: activeDate, time }),
      })
      const j = await r.json()
      if (!r.ok) {
        setError(j.error ?? 'No se pudo reservar')
        return
      }
      setConfirmed(j.when ?? 'tu cita')
    } catch {
      setError('Error de conexión')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-emerald-50 p-4 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        {loading ? (
          <p className="py-10 text-center text-sm text-slate-400">Cargando…</p>
        ) : !info ? (
          <p className="py-10 text-center text-sm text-slate-500">Página de reservas no encontrada.</p>
        ) : !info.enabled ? (
          <div className="py-8 text-center">
            <h1 className="text-lg font-bold text-slate-800">{info.clinicName}</h1>
            <p className="mt-2 text-sm text-slate-500">Las reservas online no están disponibles ahora.</p>
          </div>
        ) : confirmed ? (
          <div className="py-8 text-center">
            <div className="text-4xl">✅</div>
            <h1 className="mt-2 text-lg font-bold text-slate-800">¡Reserva confirmada!</h1>
            <p className="mt-1 text-sm text-slate-600">{info.clinicName}</p>
            <p className="mt-2 text-sm font-medium text-emerald-700">{confirmed}</p>
            <p className="mt-3 text-xs text-slate-400">Te esperamos. Si no puedes asistir, avisa a la clínica.</p>
          </div>
        ) : (
          <>
            <div className="mb-4 text-center">
              <h1 className="text-xl font-bold text-slate-900">{info.clinicName}</h1>
              <p className="text-sm text-slate-500">Reserva tu cita</p>
            </div>

            {days.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No hay horarios disponibles en los próximos días.</p>
            ) : (
              <>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Día</p>
                <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                  {days.map((d) => (
                    <button
                      key={d.date}
                      onClick={() => { setActiveDate(d.date); setTime(null) }}
                      className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-medium ${
                        d.date === activeDate ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      {dayLabel(d.date)}
                    </button>
                  ))}
                </div>

                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Hora</p>
                <div className="mb-4 grid grid-cols-4 gap-2">
                  {activeTimes.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTime(t)}
                      className={`rounded-lg border py-2 text-sm font-medium ${
                        t === time ? 'border-emerald-500 bg-emerald-600 text-white' : 'border-slate-200 text-slate-700 hover:border-emerald-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {time && (
                  <div className="space-y-3 border-t border-slate-100 pt-4">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Tu nombre y apellido"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      inputMode="tel"
                      placeholder="Tu teléfono (WhatsApp)"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                    {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
                    <button
                      onClick={submit}
                      disabled={submitting || !name.trim() || !phone.trim()}
                      className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {submitting ? 'Reservando…' : `Reservar ${dayLabel(activeDate!)} · ${time}`}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </main>
  )
}
