import { ExpandableChart } from '@/components/expandable-chart'
import { Pagination } from '@/components/pagination'
import { EvaluacionesPanel } from '@/components/seguimiento/evaluaciones-panel'
import { pageRange, parsePage, totalPages as calcTotalPages } from '@/lib/pagination'
import { createClient } from '@/lib/supabase/server'
import { PUNTAJE_MAX_FUNCIONAL } from '@/lib/seguimiento'

export const dynamic = 'force-dynamic'

type Eval = {
  id: number
  fecha: string
  test_wells_adams: number | null
  test_thomas: number | null
  test_dorsiflexion: number | null
  test_sentadilla: number | null
  test_estabilidad: number | null
  fuerza_inferior: number | null
  fuerza_superior: number | null
  resistencia_metabolica: number | null
  puntaje_total: number
  observaciones: string | null
}

export default async function EvalFuncionalPage(
  props: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ page?: string }>
  }
) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const supabase = await createClient()
  const page = parsePage(searchParams?.page)
  const [from, to] = pageRange(page)

  // El gráfico necesita la serie completa; el listado de abajo se pagina aparte.
  const [{ data: serie }, { data: pagina, count }] = await Promise.all([
    supabase
      .from('evaluaciones_funcionales')
      .select('fecha, puntaje_total')
      .eq('paciente_id', params.id)
      .order('fecha', { ascending: true }),
    supabase
      .from('evaluaciones_funcionales')
      .select('*', { count: 'exact' })
      .eq('paciente_id', params.id)
      .order('fecha', { ascending: false })
      .range(from, to),
  ])

  const serieCompleta = serie ?? []
  const evals = (pagina ?? []) as Eval[]
  const pages = calcTotalPages(count)

  return (
    <div className="space-y-6">
      {serieCompleta.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-heading font-semibold text-gray-900 mb-3">
            Evolución del puntaje total <span className="text-gray-500 font-normal">/ {PUNTAJE_MAX_FUNCIONAL}</span>
          </h3>
          <ExpandableChart
            series={[
              {
                label: 'Puntaje',
                color: '#E8611A',
                data: serieCompleta.map((e) => ({ x: e.fecha, y: e.puntaje_total })),
              },
            ]}
            unit="pts"
          />
        </div>
      ) : null}

      <EvaluacionesPanel pacienteId={params.id} evaluaciones={evals} />
      <Pagination
        page={page}
        totalPages={pages}
        makeHref={(p) => `/admin/pacientes/${params.id}/evaluacion-funcional?page=${p}`}
      />
    </div>
  )
}
