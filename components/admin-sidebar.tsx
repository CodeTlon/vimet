'use client'

import { CalendarClock, CalendarDays, LayoutDashboard, LogOut, Menu, Newspaper, Settings, UsersRound, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

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

function Nav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      {links.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`)
        return (
          <Link
            key={l.href}
            href={l.href}
            onClick={onNavigate}
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
  )
}

export function AdminSidebar({ name }: { name: string }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Cerrar el drawer al navegar o con Escape.
  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
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

        <div className="hidden lg:flex lg:flex-col lg:flex-1">
          <Nav pathname={pathname} />
          <div className="p-3 border-t border-white/10">
            <LogoutButton className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-60">
              <LogOut className="size-4" /> Cerrar sesión
            </LogoutButton>
          </div>
        </div>

        {/* Mobile bar */}
        <div className="lg:hidden bg-gray-900 text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
            className="p-2 -ml-2 rounded-md text-white/80 hover:bg-white/10"
          >
            <Menu className="size-5" />
          </button>
          <Link href="/" className="flex-1">
            <Image
              src="/images/brand/logo-white.png"
              alt="VIMET"
              width={90}
              height={30}
              className="h-7 w-auto object-contain"
              sizes="90px"
            />
          </Link>
          <LogoutButton
            className="shrink-0 p-2 rounded-md text-sm text-white/70 hover:bg-white/10 disabled:opacity-60"
            aria-label="Cerrar sesión"
          >
            <LogOut className="size-5" />
          </LogoutButton>
        </div>
      </aside>

      {/* Drawer mobile */}
      {open ? (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} />
      ) : null}
      <aside
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-gray-900 text-white flex flex-col transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-6 py-6 border-b border-white/10">
          <p className="text-xs text-white/60">Panel · {name}</p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="p-1 rounded-md text-white/70 hover:bg-white/10"
          >
            <X className="size-5" />
          </button>
        </div>
        <Nav pathname={pathname} onNavigate={() => setOpen(false)} />
      </aside>
    </>
  )
}
