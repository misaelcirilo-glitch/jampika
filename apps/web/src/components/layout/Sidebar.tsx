'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Calendar,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  Receipt,
  Settings,
  Users,
  Activity,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

const MAIN_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/patients', label: 'Pacientes', icon: Users },
  { href: '/appointments', label: 'Citas', icon: Calendar },
  { href: '/records', label: 'Historias Médicas', icon: FileText },
  { href: '/billing', label: 'Facturación', icon: Receipt },
  { href: '/inventory', label: 'Inventario', icon: Package },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, clinic, logout } = useAuthStore()

  return (
    <aside className="flex h-screen w-60 flex-col bg-white border-r border-slate-100">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-lg font-bold text-slate-800">Jampika</h1>
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">
              Beta
            </span>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Gestión Clínica
          </p>
        </div>
      </div>

      {/* Nav principal */}
      <nav className="flex-1 space-y-0.5 px-3 pt-2">
        {MAIN_NAV.map((item) => {
          const active = pathname?.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700',
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-blue-600" />
              )}
              <Icon className={cn('h-[18px] w-[18px]', active ? 'text-blue-600' : '')} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: Config + Logout */}
      <div className="space-y-0.5 border-t border-slate-100 px-3 py-3">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            pathname?.startsWith('/settings')
              ? 'bg-blue-50 text-blue-700'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700',
          )}
        >
          {pathname?.startsWith('/settings') && (
            <span className="absolute left-3 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-blue-600" />
          )}
          <Settings className="h-[18px] w-[18px]" />
          Configuración
        </Link>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  )
}
