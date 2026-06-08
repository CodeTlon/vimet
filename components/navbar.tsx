'use client'

import { CalendarPlus, ChartLine, LayoutDashboard, LogIn, LogOut, Menu, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { LogoutButton } from '@/components/logout-button'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const links = [
  { href: '/', label: 'Inicio' },
  { href: '/nosotros', label: 'Nosotros' },
  { href: '/metodologia', label: 'Metodología' },
  { href: '/servicios', label: 'Servicios' },
  { href: '/contacto', label: 'Contacto' },
]

const HIDE_PREFIXES = [
  '/admin',
  '/login',
  '/registro',
  '/turnos/nuevo',
  '/mis-turnos',
  '/mi-ficha',
  '/mi-progreso',
  '/mis-planes',
  '/feedback-semanal',
  '/mis-objetivos',
  '/mis-recursos',
]

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const hidden = HIDE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
  const isHome = pathname === '/'

  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [user, setUser] = useState<{ id: string; rol: string } | null>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    const refresh = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      if (!authUser) {
        if (mounted) setUser(null)
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('rol')
        .eq('id', authUser.id)
        .maybeSingle()
      if (mounted) setUser({ id: authUser.id, rol: profile?.rol ?? 'paciente' })
    }

    refresh()

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refresh()
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const isStaff = user && ['nutricionista', 'entrenador', 'admin'].includes(user.rol)
  const transparent = isHome && !scrolled && !open

  if (hidden) return null

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-40 transition-all duration-300',
        transparent
          ? 'bg-transparent text-white'
          : 'bg-white/95 backdrop-blur-md text-gray-900 shadow-sm',
      )}
    >
      <div className="container-vimet flex items-center justify-between h-16 lg:h-20">
        <Link href="/" className="flex items-center gap-2 font-heading font-bold text-xl">
          <Image
            src={transparent ? '/images/brand/logo-white.png' : '/images/brand/logo-light.jpg'}
            alt="VIMET"
            width={120}
            height={40}
            priority
            className="h-9 lg:h-10 w-auto object-contain"
            sizes="120px"
          />
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {links.map((l) => {
            const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href)
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                  active
                    ? transparent
                      ? 'bg-white/15 text-white'
                      : 'bg-vimet-orange/10 text-vimet-orange'
                    : transparent
                      ? 'text-white/90 hover:bg-white/10'
                      : 'text-gray-700 hover:bg-gray-100',
                )}
              >
                {l.label}
              </Link>
            )
          })}
        </nav>

        <div className="hidden lg:flex items-center gap-2">
          {user ? (
            <>
              {isStaff ? (
                <Link
                  href="/admin/dashboard"
                  className={cn(
                    'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                    transparent ? 'text-white hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100',
                  )}
                >
                  <ChartLine className="size-4" /> Panel
                </Link>
              ) : (
                <Link
                  href="/mis-turnos"
                  className={cn(
                    'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                    transparent ? 'text-white hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100',
                  )}
                >
                  <LayoutDashboard className="size-4" /> Mi espacio
                </Link>
              )}
              <LogoutButton
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-colors disabled:opacity-60',
                  transparent
                    ? 'border-white/40 text-white hover:bg-white/10'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50',
                )}
              >
                <LogOut className="size-4" /> Salir
              </LogoutButton>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                  transparent ? 'text-white hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100',
                )}
              >
                <LogIn className="size-4" /> Ingresar
              </Link>
              <Link
                href="/turnos/nuevo"
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold bg-vimet-gradient text-white shadow-md hover:shadow-lg transition-all"
              >
                <CalendarPlus className="size-4" /> Reservar turno
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          className={cn(
            'lg:hidden p-2 rounded-md',
            transparent ? 'text-white' : 'text-gray-900',
          )}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      <div
        className={cn(
          'lg:hidden overflow-hidden transition-all duration-300 ease-in-out',
          open ? 'max-h-[520px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none',
        )}
      >
        <div className="bg-white text-gray-900 border-t border-gray-100">
          <nav className="container-vimet flex flex-col py-4 gap-1">
            {links.map((l) => {
              const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href)
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    'px-4 py-3 rounded-md text-base font-medium transition-colors',
                    active ? 'bg-vimet-orange/10 text-vimet-orange' : 'text-gray-800 hover:bg-gray-50',
                  )}
                >
                  {l.label}
                </Link>
              )
            })}
            <div className="border-t border-gray-100 mt-2 pt-3 flex flex-col gap-2">
              {user ? (
                <>
                  <Link
                    href={isStaff ? '/admin/dashboard' : '/mis-turnos'}
                    className="px-4 py-3 rounded-md text-base font-medium bg-gray-100 text-gray-800"
                  >
                    {isStaff ? 'Panel' : 'Mi espacio'}
                  </Link>
                  <LogoutButton className="w-full px-4 py-3 rounded-md text-base font-medium border border-gray-300 text-gray-700 disabled:opacity-60">
                    Salir
                  </LogoutButton>
                </>
              ) : (
                <>
                  <Link href="/login" className="px-4 py-3 rounded-md text-base font-medium bg-gray-100 text-gray-800 text-center">
                    Ingresar
                  </Link>
                  <Link
                    href="/turnos/nuevo"
                    onClick={() => router.refresh()}
                    className="px-4 py-3 rounded-md text-base font-semibold bg-vimet-gradient text-white text-center"
                  >
                    Reservar turno
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
}
