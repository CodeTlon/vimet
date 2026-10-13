import { ExpandableChart } from '@/components/expandable-chart'
import { Pagination } from '@/components/pagination'
import { EvaluacionesPanel } from '@/components/seguimiento/evaluaciones-panel'
import { pageRange, parsePage, totalPages as calcTotalPages } from '@/lib/pagination'
import { asc, desc, eq, sql } from 'drizzle-orm'

import { evaluaciones_funcionales as tabla } from '@/db/schema'
import { requireStaff } from '@/lib/auth/session'
import { db } from '@/lib/db'
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
  await requireStaff()
  const searchParams = await props.searchParams;
  const page = parsePage(searchParams?.page)
  const [from, to] = pageRange(page)

  // El gráfico necesita la serie completa; el listado de abajo se pagina aparte.
  const [serieCompleta, pagina, [{ total }]] = await Promise.all([
    db
      .select({ fecha: tabla.fecha, puntaje_total: tabla.puntaje_total })
      .from(tabla)
      .where(eq(tabla.paciente_id, params.id))
      .orderBy(asc(tabla.fecha)),
    db
      .select()
      .from(tabla)
      .where(eq(tabla.paciente_id, params.id))
      .orderBy(desc(tabla.fecha))
      .limit(to - from + 1)
      .offset(from),
    db.select({ total: sql<number>`count(*)::int` }).from(tabla).where(eq(tabla.paciente_id, params.id)),
  ])

  const evals = pagina as unknown as Eval[]
  const pages = calcTotalPages(total)

  return (
    <div className="space-y-6">
      {serieCompleta.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <ExpandableChart
            title="Evolución del puntaje total"
            heading={
              <>
                Evolución del puntaje total <span className="text-gray-500 font-normal">/ {PUNTAJE_MAX_FUNCIONAL}</span>
              </>
            }
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
