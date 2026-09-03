'use client'

import { CalendarPlus } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Mismo criterio que Navbar/Footer: no mostrar la barra en el área
// gateada (admin, auth, espacio del paciente) ni en el propio wizard de turno.
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

export function StickyMobileCTA() {
  const pathname = usePathname()
  const hidden = HIDE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  if (hidden) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-gray-900/95 px-4 py-3 backdrop-blur md:hidden [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))]">
      <Link
        href="/turnos/nuevo"
        className="flex w-full items-center justify-center gap-2 rounded-full bg-vimet-gradient px-5 py-3 text-sm font-semibold text-white shadow-lg transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vimet-orange/60 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
      >
        <CalendarPlus className="size-4" /> Reservar turno
      </Link>
    </div>
  )
}
