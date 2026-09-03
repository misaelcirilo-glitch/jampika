'use client'

import { useEffect, useRef, useState } from 'react'
import { FileText, ImageIcon, Loader2, Trash2, Upload } from 'lucide-react'
import { ApiError } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { deletePatientFile, listPatientFiles, uploadPatientFile } from './files.service'
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

  const load = () => {
    setLoading(true)
    listPatientFiles(patientId)
      .then(setFiles)
      .finally(() => setLoading(false))
  }
  useEffect(load, [patientId])

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
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar')
    }
  }

  const isImage = (f: PatientFile) => f.mimeType.startsWith('image/')

  return (
    <div className="space-y-5">
      {/* Barra de subida */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-sm border border-slate-100">
        <span className="text-sm font-medium text-slate-600">Categoría:</span>
        <div className="flex gap-1.5">
          {FILE_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                category === c ? CATEGORY_STYLE[c] : 'border-slate-200 text-slate-400 hover:text-slate-600'
              }`}
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
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? 'Subiendo…' : 'Subir archivo'}
          </button>
        </div>
      </div>

      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <p className="text-[11px] text-slate-400">
        Imágenes o PDF, hasta 4 MB. Las fotos se comprimen automáticamente. Ver y subir requiere conexión.
      </p>

      {/* Listado */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : files.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">Sin archivos. Sube el primero.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {files.map((f) => (
            <div key={f.id} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white">
              <a href={f.url} target="_blank" rel="noreferrer" className="block">
                <div className="flex h-32 items-center justify-center bg-slate-50">
                  {isImage(f) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.url} alt={f.fileName} className="h-full w-full object-cover" />
                  ) : (
                    <FileText className="h-10 w-10 text-slate-300" />
                  )}
                </div>
              </a>
              <button
                type="button"
                onClick={() => onDelete(f)}
                className="absolute right-1.5 top-1.5 rounded-md bg-white/90 p-1 text-slate-400 opacity-0 shadow-sm transition hover:text-rose-600 group-hover:opacity-100"
                title="Eliminar"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <div className="space-y-1 p-2.5">
                <p className="truncate text-xs font-medium text-slate-700" title={f.fileName}>
                  {isImage(f) ? <ImageIcon className="mr-1 inline h-3 w-3 text-slate-400" /> : null}
                  {f.fileName}
                </p>
                <div className="flex items-center justify-between">
                  <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase ${CATEGORY_STYLE[f.category]}`}>
                    {CATEGORY_LABELS[f.category]}
                  </span>
                  <span className="text-[9px] text-slate-400">{humanSize(f.size)}</span>
                </div>
                <p className="text-[9px] text-slate-400">{formatDate(f.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
