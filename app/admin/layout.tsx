import { redirect } from 'next/navigation'
import { type ReactNode } from 'react'

import { AdminSidebar } from '@/components/admin-sidebar'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/admin/dashboard')

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, nombre, apellido')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || !['nutricionista', 'entrenador', 'admin'].includes(profile.rol)) {
    redirect('/mis-turnos')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar name={`${profile.nombre} ${profile.apellido}`.trim() || 'Equipo'} />
      <main className="lg:pl-64">
        <div className="px-4 sm:px-6 lg:px-10 py-8">{children}</div>
      </main>
    </div>
  )
}
