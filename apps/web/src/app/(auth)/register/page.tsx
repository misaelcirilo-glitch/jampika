'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { COUNTRY_CONFIG, type CountryCode } from '@jampika/shared'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { PROFESSION_LIST, type ProfessionType } from '@/lib/professions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
  const [professionType, setProfessionType] = useState<ProfessionType>('medico')
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
        professionType,
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

  const selectClass =
    'flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground shadow-lg shadow-primary/30">
            J
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Jampika</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gestión para profesionales de salud y bienestar</p>
        </div>

        <Card className="p-8">
          <h2 className="mb-1 text-lg font-semibold text-foreground">Crea tu clínica</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Registra tu clínica y crea la cuenta del administrador.
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="clinicName">Nombre de la clínica</Label>
              <Input
                id="clinicName"
                type="text"
                required
                minLength={2}
                value={clinicName}
                onChange={(e) => onClinicNameChange(e.target.value)}
                placeholder="Clínica San Rafael"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="professionType">Tipo de profesional</Label>
              <select
                id="professionType"
                required
                value={professionType}
                onChange={(e) => setProfessionType(e.target.value as ProfessionType)}
                className={selectClass}
              >
                {PROFESSION_LIST.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">Activa los módulos y la terminología adecuados a tu práctica.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="slug">Identificador (URL)</Label>
              <Input
                id="slug"
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
              />
              <p className="text-xs text-muted-foreground">Se usa para identificar tu clínica. Solo minúsculas, números y guiones.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="country">País</Label>
              <select
                id="country"
                required
                value={country}
                onChange={(e) => setCountry(e.target.value as CountryCode)}
                className={selectClass}
              >
                {COUNTRIES.map(([code, cfg]) => (
                  <option key={code} value={code}>
                    {cfg.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="adminFirstName">Nombre</Label>
                <Input
                  id="adminFirstName"
                  type="text"
                  required
                  value={adminFirstName}
                  onChange={(e) => setAdminFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="adminLastName">Apellido</Label>
                <Input
                  id="adminLastName"
                  type="text"
                  required
                  value={adminLastName}
                  onChange={(e) => setAdminLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adminEmail">Correo</Label>
              <Input
                id="adminEmail"
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adminPassword">Contraseña</Label>
              <Input
                id="adminPassword"
                type="password"
                required
                minLength={8}
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Creando clínica…' : 'Crear clínica'}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Al crear tu clínica aceptas los{' '}
              <Link href="/terminos" className="font-medium text-primary hover:text-primary/80">
                Términos y Condiciones
              </Link>{' '}
              y la{' '}
              <Link href="/privacidad" className="font-medium text-primary hover:text-primary/80">
                Política de Privacidad
              </Link>
              .
            </p>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            ¿Ya tienes una cuenta?{' '}
            <Link href="/login" className="font-medium text-primary hover:text-primary/80">
              Inicia sesión
            </Link>
          </p>
        </Card>
      </div>
    </div>
  )
}
