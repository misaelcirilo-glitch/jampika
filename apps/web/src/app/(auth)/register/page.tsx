'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { COUNTRY_CONFIG, type CountryCode } from '@jampika/shared'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

const COUNTRIES = Object.entries(COUNTRY_CONFIG) as [CountryCode, { name: string }][]

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

export default function RegisterPage() {
  const router = useRouter()
  const login = useAuthStore((s) => s.login)

  const [clinicName, setClinicName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [country, setCountry] = useState<CountryCode>('PE')
  const [adminFirstName, setAdminFirstName] = useState('')
  const [adminLastName, setAdminLastName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function onClinicNameChange(value: string) {
    setClinicName(value)
    if (!slugTouched) setSlug(slugify(value))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await api.post('/auth/register-clinic', {
        clinicName,
        slug,
        country,
        adminFirstName,
        adminLastName,
        adminEmail,
        adminPassword,
      })

      // Auto-login tras crear la clínica
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
      }>('/auth/login', { email: adminEmail, password: adminPassword, deviceId })
      login(data)
      router.replace('/dashboard')
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo crear la clínica')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500'

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
          <h2 className="mb-1 text-lg font-semibold text-slate-900">Crea tu clínica</h2>
          <p className="mb-6 text-sm text-slate-500">
            Registra tu clínica y crea la cuenta del administrador.
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Nombre de la clínica
              </label>
              <input
                type="text"
                required
                minLength={2}
                value={clinicName}
                onChange={(e) => onClinicNameChange(e.target.value)}
                placeholder="Clínica San Rafael"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Identificador (URL)
              </label>
              <input
                type="text"
                required
                minLength={3}
                pattern="[a-z0-9-]+"
                title="Solo minúsculas, números y guiones"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true)
                  setSlug(slugify(e.target.value))
                }}
                placeholder="clinica-san-rafael"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-slate-400">Se usa para identificar tu clínica. Solo minúsculas, números y guiones.</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">País</label>
              <select
                required
                value={country}
                onChange={(e) => setCountry(e.target.value as CountryCode)}
                className={inputClass}
              >
                {COUNTRIES.map(([code, cfg]) => (
                  <option key={code} value={code}>
                    {cfg.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
                <input
                  type="text"
                  required
                  value={adminFirstName}
                  onChange={(e) => setAdminFirstName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Apellido</label>
                <input
                  type="text"
                  required
                  value={adminLastName}
                  onChange={(e) => setAdminLastName(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Correo</label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Contraseña</label>
              <input
                type="password"
                required
                minLength={8}
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-slate-400">Mínimo 8 caracteres.</p>
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
              {loading ? 'Creando clínica…' : 'Crear clínica'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            ¿Ya tienes una cuenta?{' '}
            <Link href="/login" className="font-medium text-primary-600 hover:text-primary-700">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
