import { EvolutionChart } from '@/components/evolution-chart'
import { EvaluacionesPanel } from '@/components/seguimiento/evaluaciones-panel'
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
  }
) {
  const params = await props.params;
  const supabase = await createClient()
  const { data } = await supabase
    .from('evaluaciones_funcionales')
    .select('*')
    .eq('paciente_id', params.id)
    .order('fecha', { ascending: true })

  const evals = (data ?? []) as Eval[]

  return (
    <div className="space-y-6">
      {evals.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-heading font-semibold text-gray-900 mb-3">
            Evolución del puntaje total <span className="text-gray-500 font-normal">/ {PUNTAJE_MAX_FUNCIONAL}</span>
          </h3>
          <EvolutionChart
            series={[
              {
                label: 'Puntaje',
                color: '#E8611A',
                data: evals.map((e) => ({ x: e.fecha, y: e.puntaje_total })),
              },
            ]}
            unit="pts"
          />
        </div>
      ) : null}

      <EvaluacionesPanel pacienteId={params.id} evaluaciones={evals} />
    </div>
  )
}
