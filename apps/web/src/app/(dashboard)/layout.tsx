'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { SyncBadge } from '@/components/layout/SyncBadge'
import { useAuthStore } from '@/stores/authStore'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/patients': 'Pacientes',
  '/appointments': 'Citas',
  '/records': 'Historias Médicas',
  '/billing': 'Facturación',
  '/inventory': 'Inventario',
  '/settings': 'Configuración',
}

function getPageTitle(pathname: string | null): string {
  if (!pathname) return 'Dashboard'
  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(path)) return title
  }
  return 'Dashboard'
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated && !isAuthenticated) router.replace('/login')
  }, [hydrated, isAuthenticated, router])

  if (!hydrated || !isAuthenticated) return null

  const pageTitle = getPageTitle(pathname)
  const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : '??'
  const roleName = user?.role === 'admin' ? 'Administrador' : user?.role === 'doctor' ? 'Médico General' : user?.role === 'receptionist' ? 'Recepcionista' : user?.role ?? ''

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-3">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-slate-800">{pageTitle}</h2>
            <span className="text-slate-300">/</span>
            <span className="text-xs text-slate-400">Jampika / {pageTitle}</span>
          </div>
          <div className="flex items-center gap-4">
            <SyncBadge />
            <div className="h-6 w-px bg-slate-200" />
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-700">
                  {user ? `${user.firstName} ${user.lastName}` : ''}
                </p>
                <p className="text-xs text-slate-400">{roleName}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-xs font-bold text-white">
                {initials}
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
