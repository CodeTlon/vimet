import { ChevronLeft, Mail, Phone } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { type ReactNode } from 'react'

import { Tabs } from '@/components/tabs'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function PacienteLayout(
  props: {
    children: ReactNode
    params: Promise<{ id: string }>
  }
) {
  const params = await props.params;

  const {
    children
  } = props;

  const supabase = createClient()
  const { data: paciente } = await supabase
    .from('profiles')
    .select('id, nombre, apellido, email, telefono, rol, created_at')
    .eq('id', params.id)
    .maybeSingle()

  if (!paciente || paciente.rol !== 'paciente') notFound()

  const tabs = [
    { href: `/admin/pacientes/${params.id}`, label: 'Resumen' },
    { href: `/admin/pacientes/${params.id}/ficha`, label: 'Ficha' },
    { href: `/admin/pacientes/${params.id}/antropometria`, label: 'Antropometría' },
    { href: `/admin/pacientes/${params.id}/evaluacion-funcional`, label: 'Eval funcional' },
    { href: `/admin/pacientes/${params.id}/planes`, label: 'Planes' },
    { href: `/admin/pacientes/${params.id}/feedback`, label: 'Feedback' },
    { href: `/admin/pacientes/${params.id}/evolucion`, label: 'Evolución' },
    { href: `/admin/pacientes/${params.id}/objetivos`, label: 'Objetivos' },
    { href: `/admin/pacientes/${params.id}/recursos`, label: 'Recursos' },
  ]

  return (
    <div>
      <Link
        href="/admin/pacientes"
        className="inline-flex items-center gap-1 text-sm text-gray-700 hover:text-vimet-orange mb-3"
      >
        <ChevronLeft className="size-4" /> Pacientes
      </Link>
      <header className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-gray-900">
              {paciente.nombre} {paciente.apellido}
            </h1>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-700">
              {paciente.email ? (
                <a
                  href={`mailto:${paciente.email}`}
                  className="inline-flex items-center gap-1.5 hover:text-vimet-orange"
                >
                  <Mail className="size-4" /> {paciente.email}
                </a>
              ) : null}
              {paciente.telefono ? (
                <a
                  href={`https://wa.me/54${paciente.telefono.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-vimet-orange font-semibold hover:underline"
                >
                  <Phone className="size-4" /> {paciente.telefono}
                </a>
              ) : null}
              <span className="text-gray-500">
                Registrado {new Date(paciente.created_at).toLocaleDateString('es-AR')}
              </span>
            </div>
          </div>
        </div>
      </header>
      <Tabs items={tabs} />
      {children}
    </div>
  );
}
