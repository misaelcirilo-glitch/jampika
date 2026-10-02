'use client'

import { textoMensajeWhatsApp } from '@/lib/etiquetas'
import { useEffect, useRef, useState } from 'react'
import { MessageCircle, Send } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Conversation {
  id: string
  phone: string
  patientName?: string | null
  lastMessagePreview?: string | null
  lastMessageAt: string
  unreadCount: number
}
interface Message {
  id: string
  direction: 'in' | 'out'
  body?: string | null
  createdAt: string
  status?: string | null
}

function timeShort(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export default function ChatPage() {
  const [convs, setConvs] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  async function loadConvs() {
    try {
      const { data } = await api.get<{ data: Conversation[] }>('/whatsapp/chat/conversations')
      setConvs(data)
    } catch (e) {
      setError(e instanceof ApiError && e.status === 403 ? 'El módulo de WhatsApp no está activo en tu plan.' : 'No se pudieron cargar las conversaciones.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void loadConvs()
  }, [])
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function openConv(id: string) {
    setActiveId(id)
    const r = await api.get<{ messages: Message[] }>(`/whatsapp/chat/conversations/${id}/messages`)
    setMessages(r.messages)
    void loadConvs()
  }

  async function send() {
    if (!text.trim() || !activeId) return
    setSending(true)
    try {
      const m = await api.post<Message>(`/whatsapp/chat/conversations/${activeId}/messages`, { body: text })
      setMessages((prev) => [...prev, m])
      setText('')
      void loadConvs()
    } catch {
      setError('No se pudo enviar el mensaje.')
    } finally {
      setSending(false)
    }
  }

  const active = convs.find((c) => c.id === activeId)

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-success" />
        <h1 className="text-2xl font-bold text-foreground">WhatsApp</h1>
      </div>

      {error && <p className="mb-3 rounded-lg bg-warning/15 px-3 py-2 text-sm text-warning-foreground">{error}</p>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Conversaciones */}
        <Card className="overflow-hidden">
          <div className="border-b border-border px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Conversaciones
          </div>
          {loading ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Cargando…</p>
          ) : convs.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Sin conversaciones todavía.</p>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto">
              {convs.map((c) => (
                <button
                  key={c.id}
                  onClick={() => openConv(c.id)}
                  className={`block w-full border-b border-border px-4 py-3 text-left hover:bg-muted ${
                    c.id === activeId ? 'bg-success/10' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-semibold text-foreground">
                      {c.patientName ?? c.phone}
                    </span>
                    {c.unreadCount > 0 && (
                      <span className="ml-2 rounded-full bg-success px-1.5 py-0.5 text-[10px] font-bold text-success-foreground">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{textoMensajeWhatsApp(c.lastMessagePreview)}</p>
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Hilo */}
        <Card className="md:col-span-2 flex flex-col min-h-[70vh]">
          {!active ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Elige una conversación
            </div>
          ) : (
            <>
              <div className="border-b border-border px-5 py-3">
                <p className="text-sm font-bold text-foreground">{active.patientName ?? active.phone}</p>
                <p className="text-xs text-muted-foreground">{active.phone}</p>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                        m.direction === 'out'
                          ? 'bg-success text-success-foreground rounded-br-sm'
                          : 'bg-muted text-foreground rounded-bl-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{textoMensajeWhatsApp(m.body)}</p>
                      <p className={`mt-0.5 text-[10px] ${m.direction === 'out' ? 'text-success-foreground/70' : 'text-muted-foreground'}`}>
                        {timeShort(m.createdAt)}
                        {m.status === 'simulated' ? ' · simulado' : ''}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <div className="flex items-center gap-2 border-t border-border p-3">
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="Escribe un mensaje…"
                  className="flex-1"
                />
                <Button
                  onClick={send}
                  disabled={sending || !text.trim()}
                  className="bg-success text-success-foreground hover:bg-success/90"
                >
                  <Send className="h-4 w-4" /> Enviar
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
