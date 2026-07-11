'use client'

import { CalendarClock, CalendarDays, LayoutDashboard, LogOut, Newspaper, Settings, UsersRound } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import { LogoutButton } from '@/components/logout-button'
import { cn } from '@/lib/utils'

const links = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/calendario', label: 'Calendario', icon: CalendarDays },
  { href: '/admin/pacientes', label: 'Pacientes', icon: UsersRound },
  { href: '/admin/horarios', label: 'Mis horarios', icon: CalendarClock },
  { href: '/admin/contenido', label: 'Contenido del sitio', icon: Newspaper },
  { href: '/admin/configuracion', label: 'Configuración', icon: Settings },
] as const

export function AdminSidebar({ name }: { name: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const activeLink = links.find(
    (l) => pathname === l.href || pathname.startsWith(`${l.href}/`),
  )
  return (
    <aside className="lg:w-64 lg:fixed lg:inset-y-0 lg:left-0 lg:bg-gray-900 lg:text-white lg:flex lg:flex-col">
      <div className="hidden lg:block px-6 py-6 border-b border-white/10">
        <Link href="/" className="flex items-center">
          <Image
            src="/images/brand/logo-white.png"
            alt="VIMET"
            width={120}
            height={40}
            className="h-9 w-auto object-contain"
            sizes="120px"
          />
        </Link>
        <p className="text-xs text-white/60 mt-1">Panel · {name}</p>
      </div>

      <nav className="lg:flex-1 lg:px-3 lg:py-4 lg:space-y-1 hidden lg:block lg:overflow-y-auto">
        {links.map((l) => {
          const active = pathname === l.href || pathname.startsWith(`${l.href}/`)
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-white/10 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white',
              )}
            >
              <l.icon className="size-4" />
              {l.label}
            </Link>
          )
        })}
      </nav>

      <div className="hidden lg:block p-3 border-t border-white/10">
        <LogoutButton className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-60">
          <LogOut className="size-4" /> Cerrar sesión
        </LogoutButton>
      </div>

      {/* Mobile bar */}
      <div className="lg:hidden bg-gray-900 text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
        <Link href="/" className="shrink-0">
          <Image
            src="/images/brand/logo-white.png"
            alt="VIMET"
            width={90}
            height={30}
            className="h-7 w-auto object-contain"
            sizes="90px"
          />
        </Link>
        <div className="relative flex-1">
          <select
            value={activeLink?.href ?? ''}
            onChange={(e) => router.push(e.target.value)}
            aria-label="Ir a sección"
            className="w-full appearance-none rounded-lg bg-white/10 border border-white/10 pl-3 pr-8 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-white/30"
          >
            {links.map((l) => (
              <option key={l.href} value={l.href} className="text-gray-900">
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <LogoutButton
          className="shrink-0 p-2 rounded-md text-sm text-white/70 hover:bg-white/10 disabled:opacity-60"
          aria-label="Cerrar sesión"
        >
          <LogOut className="size-5" />
        </LogoutButton>
      </div>
    </aside>
  )
}
