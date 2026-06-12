import { FilePlus2, Pencil, Trash2 } from 'lucide-react'
import Link from 'next/link'

import { eliminarPlanAction } from '@/actions/planes'
import { PlanDownloadButton } from '@/components/seguimiento/plan-download'
import { createClient } from '@/lib/supabase/server'
import {
  ESTADO_PLAN_BADGE,
  ESTADO_PLAN_LABEL,
  TIPO_PLAN_LABEL,
  formatearFechaCorta,
} from '@/lib/seguimiento'

export const dynamic = 'force-dynamic'

type Plan = {
  id: number
  tipo: 'nutricion' | 'entrenamiento' | 'combo'
  titulo: string
  estado: 'vigente' | 'archivado' | 'borrador'
  fecha_desde: string
  fecha_hasta: string | null
  archivo_path: string | null
  updated_at: string
}

export default async function PlanesPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = createClient()
  const { data } = await supabase
    .from('planes')
    .select('id, tipo, titulo, estado, fecha_desde, fecha_hasta, archivo_path, updated_at')
    .eq('paciente_id', params.id)
    .order('fecha_desde', { ascending: false })

  const planes = (data ?? []) as Plan[]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end">
        <Link
          href={`/admin/pacientes/${params.id}/planes/nuevo`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-vimet-gradient text-white font-semibold shadow-md hover:shadow-lg transition-all"
        >
          <FilePlus2 className="size-4" /> Nuevo plan
        </Link>
      </div>

      {planes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <p className="text-sm text-gray-700">Todavía no hay planes cargados para este paciente.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {planes.map((p) => (
            <li
              key={p.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col"
            >
              <header className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-vimet-orange">
                    {TIPO_PLAN_LABEL[p.tipo]}
                  </p>
                  <h3 className="font-heading text-lg font-semibold text-gray-900">{p.titulo}</h3>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    ESTADO_PLAN_BADGE[p.estado] ?? 'bg-gray-100 text-gray-700'
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
                {p.archivo_path ? <PlanDownloadButton planId={p.id} /> : null}
                <Link
                  href={`/admin/pacientes/${params.id}/planes/${p.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 text-gray-800 text-sm font-semibold hover:bg-gray-50"
                >
                  <Pencil className="size-4" /> Editar
                </Link>
                <form action={eliminarPlanAction} className="inline">
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="paciente_id" value={params.id} />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 text-sm text-vimet-red hover:underline px-2"
                  >
                    <Trash2 className="size-4" /> Eliminar
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
