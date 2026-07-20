import { Activity, Eye, HeartPulse, MessageCircle, Sparkles } from 'lucide-react'

import { ExpandableChart } from '@/components/expandable-chart'
import { createClient } from '@/lib/supabase/server'
import {
  PUNTAJE_MAX_FUNCIONAL,
  categoriaCondicionFisica,
  formatearFechaCorta,
} from '@/lib/seguimiento'

export const metadata = { title: 'Mi progreso' }
export const dynamic = 'force-dynamic'

export default async function MiProgresoPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: mediciones }, { data: evals }, { data: evolucion }] = await Promise.all([
    supabase
      .from('mediciones_antropometricas')
      .select('fecha_medicion, peso_kg, imc, porc_grasa, porc_masa_muscular, dx_antropometrico')
      .eq('paciente_id', user.id)
      .order('fecha_medicion', { ascending: true }),
    supabase
      .from('evaluaciones_funcionales')
      .select('fecha, puntaje_total')
      .eq('paciente_id', user.id)
      .order('fecha', { ascending: true }),
    supabase
      .from('evolucion_entradas')
      .select('id, origen, contenido, created_at')
      .eq('paciente_id', user.id)
      .eq('visible_paciente', true)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const tienemediciones = (mediciones?.length ?? 0) > 0
  const tieneEvals = (evals?.length ?? 0) > 0
  const tieneEvolucion = (evolucion?.length ?? 0) > 0
  const tieneAlgo = tienemediciones || tieneEvals || tieneEvolucion

  const ultEval = (evals ?? []).at(-1)
  const ultMed = (mediciones ?? []).at(-1)
  const cat = ultEval ? categoriaCondicionFisica(ultEval.puntaje_total, PUNTAJE_MAX_FUNCIONAL) : null

  return (
    <>
      <header className="mb-6">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900">
          Mi progreso
        </h1>
        <p className="text-gray-700 mt-1">
          Tu evolución antropométrica, condición física y observaciones del equipo.
        </p>
      </header>

      {!tieneAlgo ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <Sparkles className="size-10 text-gray-300 mx-auto" />
          <h2 className="mt-3 font-heading text-xl font-semibold text-gray-900">
            Todavía no hay datos para mostrar
          </h2>
          <p className="mt-1 text-sm text-gray-700">
            Acá vas a poder seguir la evolución de tus mediciones y observaciones después
            de las próximas consultas.
          </p>
        </div>
      ) : null}

      {(tienemediciones || ultMed) && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          {ultMed ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-heading font-semibold text-gray-900 inline-flex items-center gap-2 mb-3">
                <HeartPulse className="size-5 text-vimet-orange" />
                Última medición
              </h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Stat label="Peso" value={ultMed.peso_kg} suffix="kg" />
                <Stat label="IMC" value={ultMed.imc} />
                <Stat label="% grasa" value={ultMed.porc_grasa} suffix="%" />
                <Stat label="% músculo" value={ultMed.porc_masa_muscular} suffix="%" />
              </div>
              <p className="text-xs text-gray-500 mt-3">
                {formatearFechaCorta(ultMed.fecha_medicion)}
              </p>
              {ultMed.dx_antropometrico ? (
                <p className="text-sm text-gray-700 mt-2 italic">
                  {ultMed.dx_antropometrico}
                </p>
              ) : null}
            </div>
          ) : null}

          {ultEval && cat ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-heading font-semibold text-gray-900 inline-flex items-center gap-2 mb-3">
                <Activity className="size-5 text-vimet-orange" />
                Condición física
              </h2>
              <p className="text-3xl font-heading font-bold text-gray-900">
                {ultEval.puntaje_total}
                <span className="text-base text-gray-500 font-medium">
                  / {PUNTAJE_MAX_FUNCIONAL}
                </span>
              </p>
              <span
                className={`mt-2 inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${cat.color}`}
              >
                {cat.label} ({cat.pct.toFixed(0)}%)
              </span>
              <p className="text-xs text-gray-500 mt-3">
                Última evaluación {formatearFechaCorta(ultEval.fecha)}
              </p>
            </div>
          ) : null}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-heading font-semibold text-gray-900 inline-flex items-center gap-2 mb-3">
              <Eye className="size-5 text-vimet-orange" />
              Mediciones registradas
            </h2>
            <p className="text-3xl font-heading font-bold text-gray-900">
              {mediciones?.length ?? 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Cada visita sumamos un punto a tu evolución.
            </p>
          </div>
        </section>
      )}

      {tienemediciones ? (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-heading font-semibold text-gray-900 mb-3">Peso (kg)</h2>
            <ExpandableChart
              series={[
                {
                  label: 'Peso',
                  color: '#E8611A',
                  data: (mediciones ?? []).map((m) => ({
                    x: m.fecha_medicion,
                    y: m.peso_kg as number | null,
                  })),
                },
              ]}
              unit="kg"
            />
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-heading font-semibold text-gray-900 mb-3">Composición corporal</h2>
            <ExpandableChart
              series={[
                {
                  label: '% grasa',
                  color: '#C4391C',
                  data: (mediciones ?? []).map((m) => ({
                    x: m.fecha_medicion,
                    y: m.porc_grasa as number | null,
                  })),
                },
                {
                  label: '% músculo',
                  color: '#3B82F6',
                  data: (mediciones ?? []).map((m) => ({
                    x: m.fecha_medicion,
                    y: m.porc_masa_muscular as number | null,
                  })),
                },
              ]}
              unit="%"
            />
          </div>
        </section>
      ) : null}

      {tieneEvals ? (
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
          <h2 className="font-heading font-semibold text-gray-900 mb-3">Condición física</h2>
          <ExpandableChart
            series={[
              {
                label: 'Puntaje total',
                color: '#E8611A',
                data: (evals ?? []).map((e) => ({
                  x: e.fecha,
                  y: e.puntaje_total as number,
                })),
              },
            ]}
            unit={`/${PUNTAJE_MAX_FUNCIONAL}`}
          />
        </section>
      ) : null}

      {tieneEvolucion ? (
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-heading font-semibold text-gray-900 inline-flex items-center gap-2 mb-3">
            <MessageCircle className="size-5 text-vimet-orange" />
            Notas de tu equipo
          </h2>
          <ul className="space-y-3">
            {(evolucion ?? []).map((e) => (
              <li key={e.id} className="border-l-2 border-vimet-orange pl-4">
                <p className="text-xs uppercase tracking-wide font-semibold text-vimet-orange">
                  {e.origen}
                </p>
                <p className="text-sm text-gray-800 whitespace-pre-line mt-1">
                  {e.contenido}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(e.created_at).toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  )
}

function Stat({
  label,
  value,
  suffix = '',
}: {
  label: string
  value: number | null | undefined
  suffix?: string
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="font-heading font-semibold text-gray-900 mt-0.5">
        {value != null ? value : '—'}
        {value != null && suffix ? <span className="text-xs text-gray-500 ml-1">{suffix}</span> : null}
      </p>
    </div>
  )
}
