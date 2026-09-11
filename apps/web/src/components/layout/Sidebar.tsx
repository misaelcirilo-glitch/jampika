'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Calendar,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Package,
  Receipt,
  Settings,
  Sparkles,
  Users,
  Activity,
  type LucideIcon,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import { getProfession, hasModule } from '@/lib/professions'

export function Sidebar() {
  const pathname = usePathname()
  const { clinic, logout } = useAuthStore()

  const prof = getProfession(clinic?.professionType)
  const MAIN_NAV = [
    { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
    { href: '/patients', label: prof.patients, icon: Users },
    { href: '/appointments', label: 'Citas', icon: Calendar },
    { href: '/records', label: prof.noteStyle === 'soap' ? 'Historias' : 'Notas', icon: FileText },
    { href: '/billing', label: 'Facturación', icon: Receipt },
    ...(hasModule(clinic, 'inventario') ? [{ href: '/inventory', label: 'Inventario', icon: Package }] : []),
    ...(hasModule(clinic, 'chat') ? [{ href: '/chat', label: 'WhatsApp', icon: MessageCircle }] : []),
  ]

  return (
    <aside className="flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-accent shadow-sm">
          <Activity className="h-5 w-5 text-sidebar-accent-foreground" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-lg font-bold tracking-tight text-white">Jampika</h1>
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-sidebar-foreground/80">
              Beta
            </span>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            {prof.label}
          </p>
        </div>
      </div>

      {/* Nav principal */}
      <nav className="flex-1 space-y-1 px-3 pt-2">
        {MAIN_NAV.map((item) => (
          <NavItem key={item.href} href={item.href} label={item.label} icon={item.icon} pathname={pathname} />
        ))}
      </nav>

      {/* Bottom: Planes + Config + Logout */}
      <div className="space-y-1 border-t border-sidebar-border px-3 py-3">
        <NavItem href="/planes" label="Planes" icon={Sparkles} pathname={pathname} />
        <NavItem href="/settings" label="Configuración" icon={Settings} pathname={pathname} />
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  )
}

function NavItem({
  href,
  label,
  icon: Icon,
  pathname,
}: {
  href: string
  label: string
  icon: LucideIcon
  pathname: string | null
}) {
  const active = pathname?.startsWith(href)
  return (
    <Link
      href={href}
      className={cn(
        'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
          : 'text-sidebar-foreground/70 hover:bg-white/5 hover:text-white',
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {label}
    </Link>
  )
}
