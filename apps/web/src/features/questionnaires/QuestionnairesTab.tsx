'use client'

import { useEffect, useState } from 'react'
import { ClipboardList, Copy, Plus } from 'lucide-react'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'

interface TemplateOpt { key: string; title: string }
interface Assignment {
  id: string
  title: string
  type: string
  status: string
  score: number | null
  interpretation: string | null
  patientLink: string
  createdAt: string
  completedAt: string | null
}

export default function QuestionnairesTab({ patientId }: { patientId: string }) {
  const [templates, setTemplates] = useState<TemplateOpt[]>([])
  const [items, setItems] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'scale' | 'task'>('scale')
  const [templateKey, setTemplateKey] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [lastLink, setLastLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const [t, l] = await Promise.all([
        api.get<{ data: TemplateOpt[] }>('/questionnaires/templates'),
        api.get<{ data: Assignment[] }>(`/questionnaires/patient/${patientId}`),
      ])
      setTemplates(t.data)
      if (!templateKey && t.data[0]) setTemplateKey(t.data[0].key)
      setItems(l.data)
    } catch {
      setError('No se pudo cargar (¿módulo no disponible?)')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId])

  async function assign() {
    setAssigning(true)
    setError(null)
    setLastLink(null)
    try {
      const body = mode === 'scale' ? { templateKey } : { taskTitle }
      const r = await api.post<{ patientLink: string }>(`/questionnaires/patient/${patientId}`, body)
      setLastLink(r.patientLink)
      await navigator.clipboard?.writeText(r.patientLink).catch(() => {})
      setTaskTitle('')
      void load()
    } catch {
      setError('No se pudo asignar')
    } finally {
      setAssigning(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Asignar */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-700">Enviar cuestionario o tarea</h3>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setMode('scale')} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${mode === 'scale' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>Escala</button>
          <button onClick={() => setMode('task')} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${mode === 'task' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>Tarea libre</button>
        </div>
        {mode === 'scale' ? (
          <select value={templateKey} onChange={(e) => setTemplateKey(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            {templates.map((t) => <option key={t.key} value={t.key}>{t.title}</option>)}
          </select>
        ) : (
          <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Ej: Practica 5 min de respiración diaria y anota cómo te sientes" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        )}
        <button
          onClick={assign}
          disabled={assigning || (mode === 'scale' ? !templateKey : !taskTitle.trim())}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> {assigning ? 'Enviando…' : 'Generar enlace'}
        </button>
        {lastLink && (
          <div className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800">
            Enlace para el paciente (copiado): <span className="break-all font-mono">{lastLink}</span>
          </div>
        )}
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </div>

      {/* Lista */}
      {loading ? (
        <p className="py-6 text-center text-sm text-slate-400">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">Aún no has enviado cuestionarios ni tareas.</p>
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
              <div>
                <p className="text-sm font-semibold text-slate-700">{a.title}</p>
                <p className="text-xs text-slate-400">
                  {formatDate(a.createdAt)} ·{' '}
                  {a.status === 'completed' ? (
                    <span className="text-emerald-600 font-medium">
                      Completado{a.score !== null ? ` · ${a.score} (${a.interpretation})` : ''}
                    </span>
                  ) : (
                    <span className="text-amber-600 font-medium">Pendiente</span>
                  )}
                </p>
              </div>
              {a.status !== 'completed' && (
                <button
                  onClick={() => navigator.clipboard?.writeText(a.patientLink)}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-500 hover:bg-slate-50"
                  title="Copiar enlace del paciente"
                >
                  <Copy className="h-3.5 w-3.5" /> Enlace
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
