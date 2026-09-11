'use client'

import { useEffect, useState } from 'react'
import { ClipboardList, Copy, Plus } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn, formatDate } from '@/lib/utils'

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
      <div className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Enviar cuestionario o tarea</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('scale')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
              mode === 'scale' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
            )}
          >
            Escala
          </button>
          <button
            onClick={() => setMode('task')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
              mode === 'task' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
            )}
          >
            Tarea libre
          </button>
        </div>
        {mode === 'scale' ? (
          <Select value={templateKey} onValueChange={setTemplateKey}>
            <SelectTrigger>
              <SelectValue placeholder="Elige una escala" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.key} value={t.key}>
                  {t.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            placeholder="Ej: Practica 5 min de respiración diaria y anota cómo te sientes"
          />
        )}
        <Button
          onClick={assign}
          disabled={assigning || (mode === 'scale' ? !templateKey : !taskTitle.trim())}
        >
          <Plus className="h-4 w-4" /> {assigning ? 'Enviando…' : 'Generar enlace'}
        </Button>
        {lastLink && (
          <div className="rounded-lg bg-success/10 p-2 text-xs text-success">
            Enlace para el paciente (copiado): <span className="break-all font-mono">{lastLink}</span>
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {/* Lista */}
      {loading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Aún no has enviado cuestionarios ni tareas.</p>
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-card">
              <div>
                <p className="text-sm font-semibold text-foreground">{a.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(a.createdAt)} ·{' '}
                  {a.status === 'completed' ? (
                    <span className="font-medium text-success">
                      Completado{a.score !== null ? ` · ${a.score} (${a.interpretation})` : ''}
                    </span>
                  ) : (
                    <span className="font-medium text-warning-foreground">Pendiente</span>
                  )}
                </p>
              </div>
              {a.status !== 'completed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard?.writeText(a.patientLink)}
                  title="Copiar enlace del paciente"
                >
                  <Copy className="h-3.5 w-3.5" /> Enlace
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
