'use client'

import { CalendarDays, LayoutDashboard, LogOut, UsersRound } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { logoutAction } from '@/actions/auth'
import { cn } from '@/lib/utils'

const links = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/calendario', label: 'Calendario', icon: CalendarDays },
  { href: '/admin/pacientes', label: 'Pacientes', icon: UsersRound },
] as const

export function AdminSidebar({ name }: { name: string }) {
  const pathname = usePathname()
  return (
    <aside className="lg:w-64 lg:fixed lg:inset-y-0 lg:left-0 lg:bg-gray-900 lg:text-white lg:flex lg:flex-col">
      <div className="hidden lg:block px-6 py-6 border-b border-white/10">
        <Link href="/" className="font-heading text-2xl font-extrabold tracking-tight text-white">
          VIMET
        </Link>
        <p className="text-xs text-white/60 mt-1">Panel · {name}</p>
      </div>

      <nav className="lg:flex-1 lg:px-3 lg:py-4 lg:space-y-1 hidden lg:block">
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
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut className="size-4" /> Cerrar sesión
          </button>
        </form>
      </div>

      {/* Mobile bar */}
      <div className="lg:hidden bg-gray-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <Link href="/" className="font-heading text-lg font-extrabold">
          VIMET
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(`${l.href}/`)
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'p-2 rounded-md text-sm',
                  active ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10',
                )}
                aria-label={l.label}
              >
                <l.icon className="size-5" />
              </Link>
            )
          })}
          <form action={logoutAction} className="inline">
            <button
              type="submit"
              className="p-2 rounded-md text-sm text-white/70 hover:bg-white/10"
              aria-label="Cerrar sesión"
            >
              <LogOut className="size-5" />
            </button>
          </form>
        </nav>
      </div>
    </aside>
  )
}
