import { Trash2 } from 'lucide-react'

import { eliminarMedicionAction } from '@/actions/mediciones'
import { EvolutionChart } from '@/components/evolution-chart'
import { MedicionForm } from '@/components/seguimiento/medicion-form'
import { createClient } from '@/lib/supabase/server'
import { formatearFechaCorta } from '@/lib/seguimiento'

export const dynamic = 'force-dynamic'

type Medicion = {
  id: number
  fecha_medicion: string
  peso_kg: number | null
  talla_cm: number | null
  imc: number | null
  porc_grasa: number | null
  porc_masa_muscular: number | null
  kg_grasa: number | null
  kg_musculo: number | null
  dx_antropometrico: string | null
  observaciones: string | null
}

export default async function AntropometriaPage(
  props: {
    params: Promise<{ id: string }>
  }
) {
  const params = await props.params;
  const supabase = createClient()
  const { data } = await supabase
    .from('mediciones_antropometricas')
    .select(
      'id, fecha_medicion, peso_kg, talla_cm, imc, porc_grasa, porc_masa_muscular, kg_grasa, kg_musculo, dx_antropometrico, observaciones',
    )
    .eq('paciente_id', params.id)
    .order('fecha_medicion', { ascending: true })

  const mediciones = (data ?? []) as Medicion[]

  return (
    <div className="space-y-6">
      <MedicionForm pacienteId={params.id} />

      {mediciones.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard
            title="Peso (kg)"
            series={[
              {
                label: 'Peso',
                color: '#E8611A',
                data: mediciones.map((m) => ({ x: m.fecha_medicion, y: m.peso_kg })),
              },
            ]}
            unit="kg"
          />
          <ChartCard
            title="Composición corporal"
            series={[
              {
                label: '% grasa',
                color: '#C4391C',
                data: mediciones.map((m) => ({ x: m.fecha_medicion, y: m.porc_grasa })),
              },
              {
                label: '% músculo',
                color: '#3B82F6',
                data: mediciones.map((m) => ({ x: m.fecha_medicion, y: m.porc_masa_muscular })),
              },
            ]}
            unit="%"
          />
        </div>
      ) : null}

      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-heading font-semibold text-gray-900">Histórico de mediciones</h3>
        </div>
        {mediciones.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-700">
            Todavía no hay mediciones registradas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-700">
                  <th className="px-3 py-2.5 font-semibold">Fecha</th>
                  <th className="px-3 py-2.5 font-semibold">Peso</th>
                  <th className="px-3 py-2.5 font-semibold">Talla</th>
                  <th className="px-3 py-2.5 font-semibold">IMC</th>
                  <th className="px-3 py-2.5 font-semibold">% grasa</th>
                  <th className="px-3 py-2.5 font-semibold">% músc</th>
                  <th className="px-3 py-2.5 font-semibold">DX</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...mediciones].reverse().map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 font-semibold text-gray-900">
                      {formatearFechaCorta(m.fecha_medicion)}
                    </td>
                    <td className="px-3 py-2.5">{m.peso_kg ?? '—'}</td>
                    <td className="px-3 py-2.5">{m.talla_cm ?? '—'}</td>
                    <td className="px-3 py-2.5">{m.imc ?? '—'}</td>
                    <td className="px-3 py-2.5">{m.porc_grasa ?? '—'}</td>
                    <td className="px-3 py-2.5">{m.porc_masa_muscular ?? '—'}</td>
                    <td className="px-3 py-2.5 text-gray-700">{m.dx_antropometrico ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right">
                      <form action={eliminarMedicionAction}>
                        <input type="hidden" name="id" value={m.id} />
                        <input type="hidden" name="paciente_id" value={params.id} />
                        <button
                          type="submit"
                          className="text-vimet-red hover:text-vimet-red/80"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function ChartCard({
  title,
  series,
  unit,
}: {
  title: string
  series: { label: string; color: string; data: { x: string; y: number | null }[] }[]
  unit?: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="font-heading font-semibold text-gray-900 mb-3">{title}</h3>
      <EvolutionChart series={series} unit={unit} />
    </div>
  )
}
