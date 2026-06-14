import { Trash2 } from 'lucide-react'

import { eliminarEvaluacionAction } from '@/actions/evaluaciones'
import { EvolutionChart } from '@/components/evolution-chart'
import { EvaluacionForm } from '@/components/seguimiento/evaluacion-form'
import { createClient } from '@/lib/supabase/server'
import {
  PUNTAJE_MAX_FUNCIONAL,
  TESTS_FUNCIONALES,
  categoriaCondicionFisica,
  formatearFechaCorta,
} from '@/lib/seguimiento'

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
  const supabase = createClient()
  const { data } = await supabase
    .from('evaluaciones_funcionales')
    .select('*')
    .eq('paciente_id', params.id)
    .order('fecha', { ascending: true })

  const evals = (data ?? []) as Eval[]

  return (
    <div className="space-y-6">
      <EvaluacionForm pacienteId={params.id} />

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

      <section className="space-y-3">
        {[...evals].reverse().map((e) => {
          const cat = categoriaCondicionFisica(e.puntaje_total, PUNTAJE_MAX_FUNCIONAL)
          return (
            <article
              key={e.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
            >
              <header className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-heading font-semibold text-gray-900">
                    Evaluación del {formatearFechaCorta(e.fecha)}
                  </h3>
                  <div className="mt-1 flex items-center gap-3">
                    <span className="text-2xl font-heading font-bold text-gray-900">
                      {e.puntaje_total}
                      <span className="text-sm text-gray-500 font-medium">
                        / {PUNTAJE_MAX_FUNCIONAL}
                      </span>
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cat.color}`}
                    >
                      {cat.label} ({cat.pct.toFixed(0)}%)
                    </span>
                  </div>
                </div>
                <form action={eliminarEvaluacionAction}>
                  <input type="hidden" name="id" value={e.id} />
                  <input type="hidden" name="paciente_id" value={params.id} />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 text-sm text-vimet-red hover:underline"
                  >
                    <Trash2 className="size-4" /> Eliminar
                  </button>
                </form>
              </header>
              <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                {TESTS_FUNCIONALES.map((t) => {
                  const v = (e as unknown as Record<string, number | null>)[t.key]
                  const pct = v != null ? (v / t.max) * 100 : 0
                  return (
                    <li key={t.key} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-700">{t.label}</p>
                      <p className="font-heading font-semibold text-gray-900 mt-0.5">
                        {v ?? '—'}
                        <span className="text-xs text-gray-500 font-medium"> / {t.max}</span>
                      </p>
                      <div className="mt-2 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className="h-full bg-vimet-gradient"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
              {e.observaciones ? (
                <p className="mt-4 text-sm text-gray-700 whitespace-pre-line">{e.observaciones}</p>
              ) : null}
            </article>
          )
        })}
      </section>

      {evals.length === 0 ? (
        <p className="text-center text-sm text-gray-500 italic">
          Sin evaluaciones funcionales registradas.
        </p>
      ) : null}
    </div>
  )
}
