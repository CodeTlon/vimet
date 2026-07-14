import { EvolutionChart } from '@/components/evolution-chart'
import { MedicionesPanel } from '@/components/seguimiento/mediciones-panel'
import { createClient } from '@/lib/supabase/server'

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

      <MedicionesPanel pacienteId={params.id} mediciones={mediciones} />
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
