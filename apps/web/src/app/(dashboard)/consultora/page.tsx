'use client'

import { useEffect, useRef, useState } from 'react'
import { Brain, Send, Sparkles, User } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/stores/authStore'

interface Mensaje {
  id: string
  rol: 'user' | 'assistant'
  contenido: string
  createdAt: string
}

const SUGERENCIAS = [
  '¿Qué debería priorizar esta semana en la clínica?',
  '¿Cómo está nuestra tasa de inasistencias y qué puedo hacer?',
  '¿Cómo puedo mejorar la experiencia del paciente en recepción?',
  '¿Cómo debería fijar precios de nuestros servicios?',
  '¿Qué indicadores debería revisar cada mes?',
]

export default function ConsultoraPage() {
  const { user } = useAuthStore()
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [input, setInput] = useState('')
  const [loadingHistorial, setLoadingHistorial] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const sinAcceso = !!user && user.role !== 'admin' && user.role !== 'doctor'

  useEffect(() => {
    if (sinAcceso) {
      setLoadingHistorial(false)
      return
    }
    ;(async () => {
      try {
        const { data } = await api.get<{ data: { mensajes: Mensaje[] } }>('/consultora')
        setMensajes(data.mensajes)
      } catch {
        setError('No se pudo cargar el historial.')
      } finally {
        setLoadingHistorial(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sinAcceso])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [mensajes, enviando])

  async function enviar() {
    const texto = input.trim()
    if (!texto || enviando) return
    setInput('')
    setError(null)
    setEnviando(true)

    const tempId = `temp-${Date.now()}`
    setMensajes((prev) => [...prev, { id: tempId, rol: 'user', contenido: texto, createdAt: new Date().toISOString() }])

    try {
      const { data } = await api.post<{ data: { respuesta: string } }>('/consultora', { mensaje: texto })
      setMensajes((prev) => [
        ...prev,
        { id: `resp-${Date.now()}`, rol: 'assistant', contenido: data.respuesta, createdAt: new Date().toISOString() },
      ])
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo procesar tu consulta.')
    } finally {
      setEnviando(false)
    }
  }

  if (sinAcceso) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card className="p-8 text-center text-sm text-muted-foreground">
          La Consultora Senior está disponible para administradores y médicos de la clínica.
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center gap-2">
        <Brain className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Consultora Senior</h1>
      </div>

      {error && <p className="mb-3 rounded-lg bg-warning/15 px-3 py-2 text-sm text-warning-foreground">{error}</p>}

      <Card className="flex min-h-[70vh] flex-col overflow-hidden p-0">
        <div className="border-b border-border bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 text-white">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Consultora Senior</h2>
            <Sparkles className="h-4 w-4 text-yellow-300" />
          </div>
          <p className="mt-1 text-xs text-indigo-100">
            Consultoría de gestión clínica con el contexto real de tu clínica: agenda, equipo, finanzas y experiencia del paciente.
          </p>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {loadingHistorial ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Cargando…</p>
          ) : mensajes.length === 0 ? (
            <div className="py-6 text-center">
              <Brain className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
              <p className="mb-4 text-sm text-muted-foreground">
                Pregúntame sobre la gestión de tu clínica: agenda, finanzas, equipo o experiencia del paciente.
              </p>
              <div className="space-y-2">
                {SUGERENCIAS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="block w-full rounded-lg bg-muted px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            mensajes.map((m) => (
              <div key={m.id} className={`flex gap-3 ${m.rol === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.rol === 'assistant' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Brain className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.rol === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                  }`}
                >
                  {m.contenido}
                </div>
                {m.rol === 'user' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))
          )}
          {enviando && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Brain className="h-4 w-4 animate-pulse text-primary" />
              </div>
              <div className="flex items-center gap-1 rounded-xl bg-muted px-4 py-3">
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: '150ms' }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-border p-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && enviar()}
            placeholder="Pregunta sobre la gestión de tu clínica…"
            disabled={enviando}
            className="flex-1"
          />
          <Button onClick={enviar} disabled={enviando || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  )
}
