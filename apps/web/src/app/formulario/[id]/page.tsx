'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

interface Question {
  id: string
  text: string
  kind: 'likert' | 'text'
  options?: { label: string; value: number }[]
}
interface Form {
  title: string
  type: string
  status: string
  questions: Question[]
  clinicName: string
}

export default function FormularioPage() {
  const params = useParams<{ id: string }>()
  const search = useSearchParams()
  const id = params?.id ?? ''
  const token = search.get('t') ?? ''

  const [form, setForm] = useState<Form | null>(null)
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        const r = await fetch(`${API}/public/questionnaire/${id}?t=${encodeURIComponent(token)}`)
        if (!r.ok) {
          setForm(null)
          return
        }
        const data: Form = await r.json()
        setForm(data)
        if (data.status === 'completed') setDone(true)
      } catch {
        setForm(null)
      } finally {
        setLoading(false)
      }
    })()
  }, [id, token])

  const allAnswered = form ? form.questions.every((q) => answers[q.id] !== undefined && answers[q.id] !== '') : false

  async function submit() {
    setSubmitting(true)
    setError(null)
    try {
      const r = await fetch(`${API}/public/questionnaire/${id}?t=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })
      if (!r.ok) {
        setError('No se pudo enviar')
        return
      }
      setDone(true)
    } catch {
      setError('Error de conexión')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-50 p-4 flex items-start justify-center">
      <div className="my-6 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        {loading ? (
          <p className="py-10 text-center text-sm text-slate-400">Cargando…</p>
        ) : !form ? (
          <p className="py-10 text-center text-sm text-slate-500">Este formulario no es válido o ha expirado.</p>
        ) : done ? (
          <div className="py-8 text-center">
            <div className="text-4xl">✅</div>
            <h1 className="mt-2 text-lg font-bold text-slate-800">¡Gracias!</h1>
            <p className="mt-1 text-sm text-slate-600">Tus respuestas se enviaron a {form.clinicName}.</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{form.clinicName}</p>
              <h1 className="text-xl font-bold text-slate-900">{form.title}</h1>
            </div>

            <div className="space-y-5">
              {form.questions.map((q, i) => (
                <div key={q.id}>
                  <p className="mb-2 text-sm font-medium text-slate-700">
                    {form.questions.length > 1 ? `${i + 1}. ` : ''}{q.text}
                  </p>
                  {q.kind === 'likert' && q.options ? (
                    <div className="grid grid-cols-1 gap-1.5">
                      {q.options.map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => setAnswers((a) => ({ ...a, [q.id]: o.value }))}
                          className={`rounded-lg border px-3 py-2 text-left text-sm ${
                            answers[q.id] === o.value ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      rows={3}
                      value={(answers[q.id] as string) ?? ''}
                      onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="Escribe tu respuesta…"
                    />
                  )}
                </div>
              ))}
            </div>

            {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
            <button
              onClick={submit}
              disabled={submitting || !allAnswered}
              className="mt-5 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Enviando…' : 'Enviar respuestas'}
            </button>
          </>
        )}
      </div>
    </main>
  )
}
