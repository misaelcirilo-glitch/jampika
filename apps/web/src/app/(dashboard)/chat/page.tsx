'use client'

import { useEffect, useRef, useState } from 'react'
import { MessageCircle, Send } from 'lucide-react'
import { api, ApiError } from '@/lib/api'

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
        <MessageCircle className="h-5 w-5 text-emerald-600" />
        <h1 className="text-2xl font-bold text-slate-800">WhatsApp</h1>
      </div>

      {error && <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">{error}</p>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Conversaciones */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">
            Conversaciones
          </div>
          {loading ? (
            <p className="p-6 text-center text-sm text-slate-400">Cargando…</p>
          ) : convs.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-400">Sin conversaciones todavía.</p>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto">
              {convs.map((c) => (
                <button
                  key={c.id}
                  onClick={() => openConv(c.id)}
                  className={`block w-full border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50 ${
                    c.id === activeId ? 'bg-emerald-50/60' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-semibold text-slate-700">
                      {c.patientName ?? c.phone}
                    </span>
                    {c.unreadCount > 0 && (
                      <span className="ml-2 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-slate-400">{c.lastMessagePreview ?? ''}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Hilo */}
        <div className="md:col-span-2 flex flex-col rounded-2xl border border-slate-100 bg-white shadow-sm min-h-[70vh]">
          {!active ? (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
              Elige una conversación
            </div>
          ) : (
            <>
              <div className="border-b border-slate-100 px-5 py-3">
                <p className="text-sm font-bold text-slate-700">{active.patientName ?? active.phone}</p>
                <p className="text-xs text-slate-400">{active.phone}</p>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                        m.direction === 'out'
                          ? 'bg-emerald-600 text-white rounded-br-sm'
                          : 'bg-slate-100 text-slate-700 rounded-bl-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <p className={`mt-0.5 text-[10px] ${m.direction === 'out' ? 'text-emerald-100' : 'text-slate-400'}`}>
                        {timeShort(m.createdAt)}
                        {m.status === 'simulated' ? ' · simulado' : ''}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <div className="flex items-center gap-2 border-t border-slate-100 p-3">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="Escribe un mensaje…"
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={send}
                  disabled={sending || !text.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" /> Enviar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
