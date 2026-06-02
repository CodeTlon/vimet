import { redirect } from 'next/navigation'
import { Suspense, type ReactNode } from 'react'

import { Footer } from '@/components/footer'
import { Navbar } from '@/components/navbar'
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
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/mis-turnos')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle()

  if (profile && ['admin', 'nutricionista', 'entrenador'].includes(profile.rol)) {
    redirect('/admin/dashboard')
  }

  return (
    <>
      <Suspense>
        <Navbar />
      </Suspense>
      <div className="min-h-screen pt-24 pb-16 bg-vimet-sand">
        <div className="container-vimet">
          <PacienteSubnav tabs={tabs} />
          {children}
        </div>
      </div>
      <Footer />
    </>
  )
}
