import { ArrowRight, FileText, Sparkles } from 'lucide-react'
import Link from 'next/link'

import { PlanDownloadButton } from '@/components/seguimiento/plan-download'
import { createClient } from '@/lib/supabase/server'
import {
  ESTADO_PLAN_BADGE,
  ESTADO_PLAN_LABEL,
  TIPO_PLAN_LABEL,
  formatearFechaCorta,
} from '@/lib/seguimiento'

export const metadata = { title: 'Mis planes' }
export const dynamic = 'force-dynamic'

type Plan = {
  id: number
  tipo: 'nutricion' | 'entrenamiento' | 'combo'
  titulo: string
  estado: 'vigente' | 'archivado' | 'borrador'
  fecha_desde: string
  fecha_hasta: string | null
  archivo_path: string | null
}

export default async function MisPlanesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('planes')
    .select('id, tipo, titulo, estado, fecha_desde, fecha_hasta, archivo_path')
    .eq('paciente_id', user.id)
    .neq('estado', 'borrador')
    .order('fecha_desde', { ascending: false })

  const planes = (data ?? []) as Plan[]

  return (
    <>
      <header className="mb-6">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900">Mis planes</h1>
        <p className="text-gray-700 mt-1">
          Tus planes nutricionales y de entrenamiento, con acceso al PDF y a las pautas.
        </p>
      </header>

      {planes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <Sparkles className="size-10 text-gray-300 mx-auto" />
          <h2 className="mt-3 font-heading text-xl font-semibold text-gray-900">
            Tus planes aparecerán acá
          </h2>
          <p className="mt-1 text-sm text-gray-700">
            Después de tu evaluación inicial, tu equipo va a subir tu plan personalizado.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {planes.map((p) => (
            <li
              key={p.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col"
            >
              <header className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-vimet-orange flex items-center gap-1.5">
                    <FileText className="size-3.5" />
                    {TIPO_PLAN_LABEL[p.tipo]}
                  </p>
                  <h3 className="font-heading text-lg font-semibold text-gray-900">
                    {p.titulo}
                  </h3>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    ESTADO_PLAN_BADGE[p.estado]
                  }`}
                >
                  {ESTADO_PLAN_LABEL[p.estado]}
                </span>
              </header>
              <p className="text-sm text-gray-700">
                Vigente desde {formatearFechaCorta(p.fecha_desde)}
                {p.fecha_hasta ? ` hasta ${formatearFechaCorta(p.fecha_hasta)}` : ''}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 items-center">
                <Link
                  href={`/mis-planes/${p.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-vimet-tint4 text-vimet-tint5 text-sm font-semibold hover:bg-vimet-tint1"
                >
                  Ver detalles <ArrowRight className="size-3.5" />
                </Link>
                {p.archivo_path ? <PlanDownloadButton planId={p.id} /> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
