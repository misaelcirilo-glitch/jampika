'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

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
    <main className="flex min-h-screen items-start justify-center bg-muted p-4">
      <Card className="my-6 w-full max-w-lg p-6 shadow-lg">
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Cargando…</p>
        ) : !form ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Este formulario no es válido o ha expirado.</p>
        ) : done ? (
          <div className="py-8 text-center">
            <div className="text-4xl">✅</div>
            <h1 className="mt-2 text-lg font-bold text-foreground">¡Gracias!</h1>
            <p className="mt-1 text-sm text-muted-foreground">Tus respuestas se enviaron a {form.clinicName}.</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">{form.clinicName}</p>
              <h1 className="text-xl font-bold text-foreground">{form.title}</h1>
            </div>

            <div className="space-y-5">
              {form.questions.map((q, i) => (
                <div key={q.id}>
                  <p className="mb-2 text-sm font-medium text-foreground">
                    {form.questions.length > 1 ? `${i + 1}. ` : ''}{q.text}
                  </p>
                  {q.kind === 'likert' && q.options ? (
                    <div className="grid grid-cols-1 gap-1.5">
                      {q.options.map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => setAnswers((a) => ({ ...a, [q.id]: o.value }))}
                          className={cn(
                            'rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                            answers[q.id] === o.value
                              ? 'border-primary bg-secondary font-medium text-secondary-foreground'
                              : 'border-border text-muted-foreground hover:bg-muted',
                          )}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <Textarea
                      rows={3}
                      value={(answers[q.id] as string) ?? ''}
                      onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                      placeholder="Escribe tu respuesta…"
                    />
                  )}
                </div>
              ))}
            </div>

            {error && (
              <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            )}
            <Button onClick={submit} disabled={submitting || !allAnswered} className="mt-5 w-full">
              {submitting ? 'Enviando…' : 'Enviar respuestas'}
            </Button>
          </>
        )}
      </Card>
    </main>
  )
}
