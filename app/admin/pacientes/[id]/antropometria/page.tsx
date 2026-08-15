import { BarChart } from '@/components/bar-chart'
import { ExpandableChart } from '@/components/expandable-chart'
import { Pagination } from '@/components/pagination'
import { MedicionesPanel } from '@/components/seguimiento/mediciones-panel'
import { pageRange, parsePage, totalPages as calcTotalPages } from '@/lib/pagination'
import {
  clasificarImo,
  formatearFechaCorta,
  imo,
  perimetrosCorregidos,
  sumaPliegues6,
  sumaPliegues8,
  tieneDatosIsak,
  type MedicionIsakRaw,
} from '@/lib/seguimiento'
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
  pliegue_triceps_mm: number | null
  pliegue_subescapular_mm: number | null
  pliegue_supraespinal_mm: number | null
  pliegue_abdominal_mm: number | null
  pliegue_muslo_mm: number | null
  pliegue_pierna_mm: number | null
  pliegue_biceps_mm: number | null
  pliegue_cresta_iliaca_mm: number | null
  perimetro_brazo_cm: number | null
  perimetro_muslo_cm: number | null
  perimetro_pierna_cm: number | null
  kg_tejido_muscular: number | null
  kg_tejido_oseo: number | null
  dx_antropometrico: string | null
  observaciones: string | null
}

type SerieIsak = MedicionIsakRaw & { fecha_medicion: string; peso_kg: number | null; porc_grasa: number | null; porc_masa_muscular: number | null }

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
  const ISAK_FIELDS =
    'pliegue_triceps_mm, pliegue_subescapular_mm, pliegue_supraespinal_mm, pliegue_abdominal_mm, pliegue_muslo_mm, pliegue_pierna_mm, pliegue_biceps_mm, pliegue_cresta_iliaca_mm, perimetro_brazo_cm, perimetro_muslo_cm, perimetro_pierna_cm, kg_tejido_muscular, kg_tejido_oseo'

  const [{ data: serie }, { data: pagina, count }] = await Promise.all([
    supabase
      .from('mediciones_antropometricas')
      .select(`fecha_medicion, peso_kg, porc_grasa, porc_masa_muscular, ${ISAK_FIELDS}`)
      .eq('paciente_id', params.id)
      .order('fecha_medicion', { ascending: true }),
    supabase
      .from('mediciones_antropometricas')
      .select(
        `id, fecha_medicion, peso_kg, talla_cm, imc, porc_grasa, porc_masa_muscular, kg_grasa, kg_musculo, ${ISAK_FIELDS}, dx_antropometrico, observaciones`,
        { count: 'exact' },
      )
      .eq('paciente_id', params.id)
      .order('fecha_medicion', { ascending: false })
      .range(from, to),
  ])

  const serieCompleta = (serie ?? []) as SerieIsak[]
  const mediciones = (pagina ?? []) as Medicion[]
  const pages = calcTotalPages(count)

  const hayDatosIsak = serieCompleta.some(tieneDatosIsak)
  const ultimaIsak = [...serieCompleta].reverse().find(tieneDatosIsak) ?? null
  const imoSerie = serieCompleta.map((m) => ({ x: m.fecha_medicion, y: imo(m.kg_tejido_muscular, m.kg_tejido_oseo) }))
  const imoActual = [...imoSerie].reverse().find((p) => p.y != null)?.y ?? null
  const clasifImo = clasificarImo(imoActual)
  const corregidos = ultimaIsak ? perimetrosCorregidos(ultimaIsak) : { brazo: null, muslo: null, pierna: null }

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

      {hayDatosIsak ? (
        <>
          <ChartCard
            title="IMO (índice músculo/óseo)"
            series={[{ label: 'IMO', color: '#E8611A', data: imoSerie }]}
          >
            {clasifImo ? (
              <span className={`inline-block mt-2 text-xs font-medium rounded-full px-2.5 py-1 ${clasifImo.color}`}>
                {clasifImo.label} ({imoActual})
              </span>
            ) : null}
          </ChartCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <BarChartCard
              title="Adiposidad"
              subtitle={ultimaIsak ? formatearFechaCorta(ultimaIsak.fecha_medicion) : undefined}
              bars={[
                { label: 'Σ 6 pliegues', value: ultimaIsak ? sumaPliegues6(ultimaIsak) : null },
                { label: 'Σ 8 pliegues', value: ultimaIsak ? sumaPliegues8(ultimaIsak) : null },
              ]}
              unit=" mm"
            />
            <BarChartCard
              title="Muscularidad"
              subtitle={ultimaIsak ? formatearFechaCorta(ultimaIsak.fecha_medicion) : undefined}
              bars={[
                { label: 'Brazo', value: corregidos.brazo },
                { label: 'Muslo', value: corregidos.muslo },
                { label: 'Pierna', value: corregidos.pierna },
              ]}
              unit=" cm"
            />
          </div>
        </>
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
  children,
}: {
  title: string
  series: { label: string; color: string; data: { x: string; y: number | null }[] }[]
  unit?: string
  children?: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="font-heading font-semibold text-gray-900 mb-3">{title}</h3>
      <ExpandableChart title={title} series={series} unit={unit} />
      {children}
    </div>
  )
}

function BarChartCard({
  title,
  subtitle,
  bars,
  unit,
}: {
  title: string
  subtitle?: string
  bars: { label: string; value: number | null }[]
  unit?: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="font-heading font-semibold text-gray-900">{title}</h3>
      {subtitle ? <p className="text-xs text-gray-500 mb-3">Última evaluación ISAK: {subtitle}</p> : null}
      <BarChart bars={bars} unit={unit} />
    </div>
  )
}
