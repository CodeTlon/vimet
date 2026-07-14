import { Sparkles, Target } from 'lucide-react'

import { hoyArgentina } from '@/lib/datetime'
import { createClient } from '@/lib/supabase/server'
import {
  CATEGORIA_OBJETIVO_LABEL,
  ESTADO_OBJETIVO_BADGE,
  ESTADO_OBJETIVO_LABEL,
  formatearFechaCorta,
} from '@/lib/seguimiento'

export const metadata = { title: 'Mis objetivos' }
export const dynamic = 'force-dynamic'

type Objetivo = {
  id: number
  categoria: keyof typeof CATEGORIA_OBJETIVO_LABEL
  descripcion: string
  estado: keyof typeof ESTADO_OBJETIVO_LABEL
  fecha_objetivo: string | null
  created_at: string
}

const ESTADO_ORDER: Record<string, number> = {
  en_progreso: 0,
  pendiente: 1,
  cumplido: 2,
  descartado: 3,
}

export default async function MisObjetivosPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('objetivos')
    .select('id, categoria, descripcion, estado, fecha_objetivo, created_at')
    .eq('paciente_id', user.id)

  const objetivos = (data ?? []) as Objetivo[]
  objetivos.sort(
    (a, b) =>
      (ESTADO_ORDER[a.estado] ?? 99) - (ESTADO_ORDER[b.estado] ?? 99) ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  return (
    <>
      <header className="mb-6">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900">
          Mis objetivos
        </h1>
        <p className="text-gray-700 mt-1">
          Los objetivos acordados con tu equipo VIMET, agrupados por estado.
        </p>
      </header>

      {objetivos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <Sparkles className="size-10 text-gray-300 mx-auto" />
          <h2 className="mt-3 font-heading text-xl font-semibold text-gray-900">
            Aún no se cargaron objetivos
          </h2>
          <p className="mt-1 text-sm text-gray-700">
            En tu próxima consulta acordamos objetivos concretos y los vas a poder seguir desde acá.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {objetivos.map((o) => {
            const vencido =
              !!o.fecha_objetivo &&
              o.fecha_objetivo < hoyArgentina() &&
              !['cumplido', 'descartado'].includes(o.estado)
            return (
              <li
                key={o.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-start justify-between gap-3"
              >
                <div className="flex-1 min-w-[200px] flex gap-3">
                  <Target className="size-5 text-vimet-orange shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-vimet-orange">
                      {CATEGORIA_OBJETIVO_LABEL[o.categoria]}
                    </p>
                    <p className="text-sm text-gray-900 mt-0.5">{o.descripcion}</p>
                    {o.fecha_objetivo ? (
                      <p className={`text-xs mt-1 ${vencido ? 'text-vimet-red font-semibold' : 'text-gray-500'}`}>
                        Fecha objetivo: {formatearFechaCorta(o.fecha_objetivo)}
                        {vencido ? ' · Vencido' : ''}
                      </p>
                    ) : null}
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    ESTADO_OBJETIVO_BADGE[o.estado]
                  }`}
                >
                  {ESTADO_OBJETIVO_LABEL[o.estado]}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
