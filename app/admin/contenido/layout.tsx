import type { ReactNode } from 'react'

import { Tabs } from '@/components/tabs'
import { requireStaff } from '@/lib/supabase/auth-helpers'

const tabs = [
  { href: '/admin/contenido/servicios', label: 'Servicios' },
  { href: '/admin/contenido/metodologia', label: 'Metodología' },
  { href: '/admin/contenido/ubicacion', label: 'Ubicación y contacto' },
]

export default async function ContenidoLayout({ children }: { children: ReactNode }) {
  await requireStaff()

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="font-heading text-2xl font-bold text-gray-900 mb-1">Contenido del sitio</h1>
      <p className="text-sm text-gray-500 mb-4">
        Servicios, metodología, ubicación y contacto que se muestran en las páginas públicas.
      </p>
      <Tabs items={tabs} />
      {children}
    </div>
  )
}
