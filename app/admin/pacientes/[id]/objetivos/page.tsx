import { Trash2 } from 'lucide-react'

import { eliminarObjetivoAction } from '@/actions/objetivos'
import { ObjetivoEstadoSelect } from '@/components/seguimiento/objetivo-estado-select'
import { ObjetivoForm } from '@/components/seguimiento/objetivo-form'
import { createClient } from '@/lib/supabase/server'
import {
  CATEGORIA_OBJETIVO_LABEL,
  ESTADO_OBJETIVO_LABEL,
  formatearFechaCorta,
} from '@/lib/seguimiento'

type EstadoObjetivo = keyof typeof ESTADO_OBJETIVO_LABEL

export const dynamic = 'force-dynamic'

type Objetivo = {
  id: number
  categoria: keyof typeof CATEGORIA_OBJETIVO_LABEL
  descripcion: string
  estado: EstadoObjetivo
  fecha_objetivo: string | null
  created_at: string
}

export default async function ObjetivosPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = createClient()
  const { data } = await supabase
    .from('objetivos')
    .select('id, categoria, descripcion, estado, fecha_objetivo, created_at')
    .eq('paciente_id', params.id)
    .order('created_at', { ascending: false })

  const objetivos = (data ?? []) as Objetivo[]

  return (
    <div className="space-y-5">
      <ObjetivoForm pacienteId={params.id} />

      {objetivos.length === 0 ? (
        <p className="text-center text-sm text-gray-500 italic">
          Aún no hay objetivos registrados.
        </p>
      ) : (
        <ul className="space-y-3">
          {objetivos.map((o) => (
            <li
              key={o.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-start justify-between gap-3"
            >
              <div className="flex-1 min-w-[200px]">
                <p className="text-xs font-semibold uppercase tracking-wide text-vimet-orange">
                  {CATEGORIA_OBJETIVO_LABEL[o.categoria]}
                </p>
                <p className="text-sm text-gray-900 mt-1">{o.descripcion}</p>
                {o.fecha_objetivo ? (
                  <p className="text-xs text-gray-500 mt-1">
                    Fecha objetivo: {formatearFechaCorta(o.fecha_objetivo)}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <ObjetivoEstadoSelect
                  id={o.id}
                  pacienteId={params.id}
                  estado={o.estado}
                />
                <form action={eliminarObjetivoAction}>
                  <input type="hidden" name="id" value={o.id} />
                  <input type="hidden" name="paciente_id" value={params.id} />
                  <button
                    type="submit"
                    className="text-vimet-red hover:text-vimet-red/80"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="size-4" />
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
