'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

interface VideoInfo {
  roomUrl: string
  clinicName: string
  when: string
}

export default function ConsultaPage() {
  const params = useParams<{ id: string }>()
  const search = useSearchParams()
  const id = params?.id ?? ''
  const token = search.get('t') ?? ''

  const [info, setInfo] = useState<VideoInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [joined, setJoined] = useState(false)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        const r = await fetch(`${API}/public/video/${id}?t=${encodeURIComponent(token)}`)
        if (!r.ok) {
          setInfo(null)
          return
        }
        setInfo(await r.json())
      } catch {
        setInfo(null)
      } finally {
        setLoading(false)
      }
    })()
  }, [id, token])

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-300 text-sm">Cargando…</main>
  }
  if (!info) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-900 p-4 text-center text-slate-300">
        <div>
          <div className="text-4xl">🔒</div>
          <p className="mt-2 text-sm">Este enlace de videoconsulta no es válido o ha expirado.</p>
        </div>
      </main>
    )
  }

  const when = (() => {
    try {
      return new Date(info.when).toLocaleString('es', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  })()

  return (
    <main className="flex min-h-screen flex-col bg-slate-900 text-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div>
          <p className="text-sm font-bold">{info.clinicName}</p>
          <p className="text-xs text-slate-400">Videoconsulta · {when}</p>
        </div>
        {!joined && (
          <a href={info.roomUrl} target="_blank" rel="noreferrer" className="text-xs text-emerald-400 underline">
            Abrir en app
          </a>
        )}
      </div>

      {joined ? (
        <iframe
          src={info.roomUrl}
          className="flex-1 w-full border-0"
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          title="Videoconsulta"
        />
      ) : (
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <div>
            <div className="text-5xl">📹</div>
            <h1 className="mt-3 text-lg font-bold">Tu videoconsulta está lista</h1>
            <p className="mt-1 text-sm text-slate-400">Permite el acceso a cámara y micrófono al entrar.</p>
            <button
              onClick={() => setJoined(true)}
              className="mt-5 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Entrar a la consulta
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
