'use client'

import { useEffect, useRef, useState } from 'react'
import { FileText, ImageIcon, Loader2, Trash2, Upload } from 'lucide-react'
import { ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { cn, formatDate } from '@/lib/utils'
import { deletePatientFile, fetchPatientFileUrl, listPatientFiles, uploadPatientFile } from './files.service'
import { CATEGORY_LABELS, FILE_CATEGORIES, type FileCategory, type PatientFile } from './types'

const CATEGORY_STYLE: Record<FileCategory, string> = {
  photo: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  rx: 'bg-purple-50 text-purple-700 border-purple-200',
  lab: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  document: 'bg-slate-100 text-slate-600 border-slate-200',
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function FilesTab({ patientId }: { patientId: string }) {
  const [files, setFiles] = useState<PatientFile[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<FileCategory>('photo')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // Los blobs son privados: se sirven por el endpoint autenticado y se muestran
  // como objectURL. Guardamos fileId → objectURL y los revocamos al desmontar.
  const [urls, setUrls] = useState<Record<string, string>>({})
  const urlsRef = useRef<Record<string, string>>({})
  urlsRef.current = urls

  const load = () => {
    setLoading(true)
    listPatientFiles(patientId)
      .then(setFiles)
      .finally(() => setLoading(false))
  }
  useEffect(load, [patientId])

  // Descarga (autenticado) el binario de cada archivo nuevo y crea su objectURL.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      for (const f of files) {
        if (urlsRef.current[f.id]) continue
        try {
          const u = await fetchPatientFileUrl(patientId, f.id)
          if (cancelled) {
            URL.revokeObjectURL(u)
            return
          }
          setUrls((prev) => {
            if (prev[f.id]) {
              URL.revokeObjectURL(u)
              return prev
            }
            return { ...prev, [f.id]: u }
          })
        } catch {
          /* sin red o error: se muestra el placeholder */
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [files, patientId])

  // Revoca todos los objectURL al desmontar.
  useEffect(
    () => () => {
      Object.values(urlsRef.current).forEach((u) => URL.revokeObjectURL(u))
    },
    [],
  )

  function openFile(f: PatientFile) {
    const u = urls[f.id]
    if (u) window.open(u, '_blank', 'noopener')
  }

  async function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const row = await uploadPatientFile(patientId, file, category)
      setFiles((prev) => [row, ...prev])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo subir el archivo')
    } finally {
      setUploading(false)
    }
  }

  async function onDelete(f: PatientFile) {
    if (!confirm(`¿Eliminar "${f.fileName}"?`)) return
    try {
      await deletePatientFile(patientId, f.id)
      setFiles((prev) => prev.filter((x) => x.id !== f.id))
      setUrls((prev) => {
        const u = prev[f.id]
        if (u) URL.revokeObjectURL(u)
        const next = { ...prev }
        delete next[f.id]
        return next
      })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar')
    }
  }

  const isImage = (f: PatientFile) => f.mimeType.startsWith('image/')

  return (
    <div className="space-y-5">
      {/* Barra de subida */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-card">
        <span className="text-sm font-medium text-foreground">Categoría:</span>
        <div className="flex gap-1.5">
          {FILE_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                category === c ? CATEGORY_STYLE[c] : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
            className="hidden"
            onChange={onFileChosen}
          />
          <Button type="button" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? 'Subiendo…' : 'Subir archivo'}
          </Button>
        </div>
      </div>

      {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <p className="text-[11px] text-muted-foreground">
        Imágenes o PDF, hasta 4 MB. Las fotos se comprimen automáticamente. Ver y subir requiere conexión.
      </p>

      {/* Listado */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : files.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Sin archivos. Sube el primero.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {files.map((f) => (
            <div key={f.id} className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-card">
              <button
                type="button"
                onClick={() => openFile(f)}
                disabled={!urls[f.id]}
                className="block w-full text-left disabled:cursor-default"
                title={urls[f.id] ? 'Abrir' : 'Cargando…'}
              >
                <div className="flex h-32 items-center justify-center bg-muted">
                  {isImage(f) ? (
                    urls[f.id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={urls[f.id]} alt={f.fileName} className="h-full w-full object-cover" />
                    ) : (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    )
                  ) : (
                    <FileText className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
              </button>
              <button
                type="button"
                onClick={() => onDelete(f)}
                className="absolute right-1.5 top-1.5 rounded-md bg-card/90 p-1 text-muted-foreground opacity-0 shadow-sm transition hover:text-destructive group-hover:opacity-100"
                title="Eliminar"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <div className="space-y-1 p-2.5">
                <p className="truncate text-xs font-medium text-foreground" title={f.fileName}>
                  {isImage(f) ? <ImageIcon className="mr-1 inline h-3 w-3 text-muted-foreground" /> : null}
                  {f.fileName}
                </p>
                <div className="flex items-center justify-between">
                  <span className={cn('rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase', CATEGORY_STYLE[f.category])}>
                    {CATEGORY_LABELS[f.category]}
                  </span>
                  <span className="text-[9px] text-muted-foreground">{humanSize(f.size)}</span>
                </div>
                <p className="text-[9px] text-muted-foreground">{formatDate(f.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
