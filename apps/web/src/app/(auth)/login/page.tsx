'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export default function LoginPage() {
  const router = useRouter()
  const login = useAuthStore((s) => s.login)
  const [email, setEmail] = useState('admin@jampika.dev')
  const [password, setPassword] = useState('jampika123')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const deviceId =
        localStorage.getItem('jampika_device_id') ??
        (() => {
          const id = crypto.randomUUID()
          localStorage.setItem('jampika_device_id', id)
          return id
        })()
      const data = await api.post<{
        accessToken: string
        refreshToken: string
        user: any
        clinic: any
      }>('/auth/login', { email, password, deviceId })
      login(data)
      router.replace('/dashboard')
    } catch (err: any) {
      setError(err?.message ?? 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-primary-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-2xl font-bold text-white shadow-lg shadow-primary-600/30">
            J
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Jampika</h1>
          <p className="mt-1 text-sm text-slate-500">Gestión de clínicas médicas</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
          <h2 className="mb-1 text-lg font-semibold text-slate-900">Iniciar sesión</h2>
          <p className="mb-6 text-sm text-slate-500">Accede a tu clínica</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Correo</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary-600 py-2.5 font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            ¿No tienes una clínica registrada?{' '}
            <Link href="/register" className="font-medium text-primary-600 hover:text-primary-700">
              Crea tu cuenta
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Modo demo: admin@jampika.dev / jampika123
        </p>
      </div>
    </div>
  )
}
