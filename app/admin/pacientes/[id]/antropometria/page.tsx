import { ExpandableChart } from '@/components/expandable-chart'
import { Pagination } from '@/components/pagination'
import { MedicionesPanel } from '@/components/seguimiento/mediciones-panel'
import { pageRange, parsePage, totalPages as calcTotalPages } from '@/lib/pagination'
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
    searchParams: Promise<{ page?: string }>
  }
) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const supabase = await createClient()
  const page = parsePage(searchParams?.page)
  const [from, to] = pageRange(page)

  // El gráfico necesita la serie completa; la tabla de abajo se pagina aparte.
  const [{ data: serie }, { data: pagina, count }] = await Promise.all([
    supabase
      .from('mediciones_antropometricas')
      .select('fecha_medicion, peso_kg, porc_grasa, porc_masa_muscular')
      .eq('paciente_id', params.id)
      .order('fecha_medicion', { ascending: true }),
    supabase
      .from('mediciones_antropometricas')
      .select(
        'id, fecha_medicion, peso_kg, talla_cm, imc, porc_grasa, porc_masa_muscular, kg_grasa, kg_musculo, dx_antropometrico, observaciones',
        { count: 'exact' },
      )
      .eq('paciente_id', params.id)
      .order('fecha_medicion', { ascending: false })
      .range(from, to),
  ])

  const serieCompleta = serie ?? []
  const mediciones = (pagina ?? []) as Medicion[]
  const pages = calcTotalPages(count)

  return (
    <div className="space-y-6">
      {serieCompleta.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard
            title="Peso (kg)"
            series={[
              {
                label: 'Peso',
                color: '#E8611A',
                data: serieCompleta.map((m) => ({ x: m.fecha_medicion, y: m.peso_kg })),
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
                data: serieCompleta.map((m) => ({ x: m.fecha_medicion, y: m.porc_grasa })),
              },
              {
                label: '% músculo',
                color: '#3B82F6',
                data: serieCompleta.map((m) => ({ x: m.fecha_medicion, y: m.porc_masa_muscular })),
              },
            ]}
            unit="%"
          />
        </div>
      ) : null}

      <MedicionesPanel pacienteId={params.id} mediciones={mediciones} />
      <Pagination
        page={page}
        totalPages={pages}
        makeHref={(p) => `/admin/pacientes/${params.id}/antropometria?page=${p}`}
      />
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
