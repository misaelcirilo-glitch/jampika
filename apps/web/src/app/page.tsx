'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

export default function HomePage() {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) router.replace(isAuthenticated ? '/dashboard' : '/login')
  }, [hydrated, isAuthenticated, router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-slate-500">Cargando Jampika…</p>
    </div>
  )
}
