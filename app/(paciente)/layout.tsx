import { LogOut } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { type ReactNode } from 'react'

import { LogoutButton } from '@/components/logout-button'
import { PacienteSubnav } from '@/components/paciente-subnav'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const tabs = [
  { href: '/mis-turnos',       label: 'Mis turnos',    icon: 'CalendarDays'  as const },
  { href: '/mi-ficha',         label: 'Mi ficha',      icon: 'ClipboardList' as const },
  { href: '/mi-progreso',      label: 'Mi progreso',   icon: 'HeartPulse'    as const },
  { href: '/mis-planes',       label: 'Mis planes',    icon: 'FileText'      as const },
  { href: '/feedback-semanal', label: 'Feedback',      icon: 'MessageSquare' as const },
  { href: '/mis-objetivos',    label: 'Objetivos',     icon: 'Target'        as const },
  { href: '/mis-recursos',     label: 'Mis recursos',  icon: 'Library'       as const },
]

export default async function PacienteLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/mis-turnos')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, nombre')
    .eq('id', user.id)
    .maybeSingle()

  if (profile && ['admin', 'nutricionista', 'entrenador'].includes(profile.rol)) {
    redirect('/admin/dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col bg-vimet-sand">
      <header className="print:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="container-vimet flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/brand/logo-light.jpg"
              alt="VIMET"
              width={120}
              height={40}
              priority
              className="h-9 w-auto object-contain"
              sizes="120px"
            />
          </Link>
          <div className="flex items-center gap-3">
            {profile?.nombre ? (
              <span className="hidden sm:inline text-sm text-gray-600">
                Hola, {profile.nombre}
              </span>
            ) : null}
            <LogoutButton className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60">
              <LogOut className="size-4" /> Salir
            </LogoutButton>
          </div>
        </div>
      </header>

      <div className="flex-1 pt-8 pb-16 overflow-x-hidden">
        <div className="container-vimet">
          <div className="print:hidden">
            <PacienteSubnav tabs={tabs} />
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
