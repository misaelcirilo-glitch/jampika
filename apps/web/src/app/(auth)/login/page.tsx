'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Solo se muestran credenciales/prefill demo cuando se habilita explícitamente.
// En producción esta variable no está definida, por lo que queda deshabilitado.
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

export default function LoginPage() {
  const router = useRouter()
  const login = useAuthStore((s) => s.login)
  const [email, setEmail] = useState(DEMO_MODE ? 'admin@jampika.dev' : '')
  const [password, setPassword] = useState(DEMO_MODE ? 'jampika123' : '')
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
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground shadow-lg shadow-primary/30">
            J
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Jampika</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gestión de clínicas médicas</p>
        </div>

        <Card className="p-8">
          <h2 className="mb-1 text-lg font-semibold text-foreground">Iniciar sesión</h2>
          <p className="mb-6 text-sm text-muted-foreground">Accede a tu clínica</p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Ingresando…' : 'Ingresar'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            ¿No tienes una clínica registrada?{' '}
            <Link href="/register" className="font-medium text-primary hover:text-primary/80">
              Crea tu cuenta
            </Link>
          </p>
        </Card>

        {DEMO_MODE && (
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Modo demo: admin@jampika.dev / jampika123
          </p>
        )}
      </div>
    </div>
  )
}
