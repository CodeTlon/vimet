import { ExpandableChart } from '@/components/expandable-chart'
import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'

type MedicionWearable = {
  fecha: string
  pasos: number | null
  calorias_activas: number | null
  fc_prom: number | null
  fc_min: number | null
  fc_max: number | null
  minutos_sueno: number | null
  fuente: string
}

const FUENTE_LABEL: Record<string, string> = {
  health_connect: 'Health Connect',
  apple_health: 'Apple Health',
}

export default async function WearablePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const supabase = await createClient()

  const { data } = await supabase
    .from('mediciones_wearable')
    .select('fecha, pasos, calorias_activas, fc_prom, fc_min, fc_max, minutos_sueno, fuente')
    .eq('paciente_id', params.id)
    .order('fecha', { ascending: true })

  const serie = (data ?? []) as MedicionWearable[]

  if (serie.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-500">
        Este paciente todavía no conectó su reloj desde la app. Los datos de pasos, frecuencia
        cardíaca y sueño van a aparecer acá apenas sincronice.
      </div>
    )
  }

  const ultima = serie[serie.length - 1]

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-500">
        Última sincronización: {new Date(ultima.fecha).toLocaleDateString('es-AR')} ·{' '}
        {FUENTE_LABEL[ultima.fuente] ?? ultima.fuente}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title="Pasos"
          series={[
            { label: 'Pasos', color: '#E8611A', data: serie.map((m) => ({ x: m.fecha, y: m.pasos })) },
          ]}
        />
        <ChartCard
          title="Calorías activas"
          series={[
            {
              label: 'Calorías',
              color: '#D4A017',
              data: serie.map((m) => ({ x: m.fecha, y: m.calorias_activas })),
            },
          ]}
          unit="kcal"
        />
        <ChartCard
          title="Frecuencia cardíaca"
          series={[
            { label: 'Promedio', color: '#C4391C', data: serie.map((m) => ({ x: m.fecha, y: m.fc_prom })) },
            { label: 'Mínima', color: '#3B82F6', data: serie.map((m) => ({ x: m.fecha, y: m.fc_min })) },
            { label: 'Máxima', color: '#7A1F0E', data: serie.map((m) => ({ x: m.fecha, y: m.fc_max })) },
          ]}
          unit="lpm"
        />
        <ChartCard
          title="Sueño"
          series={[
            {
              label: 'Minutos dormidos',
              color: '#2563EB',
              data: serie.map((m) => ({ x: m.fecha, y: m.minutos_sueno })),
            },
          ]}
          unit="min"
        />
      </div>
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
      <ExpandableChart series={series} unit={unit} />
    </div>
  )
}
