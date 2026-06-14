import { ArrowRight, ClipboardList, Dumbbell, FileText, MessageSquare, Ruler, Target, TrendingUp } from 'lucide-react'
import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'
import {
  CATEGORIA_OBJETIVO_LABEL,
  PUNTAJE_MAX_FUNCIONAL,
  categoriaCondicionFisica,
  formatearFechaCorta,
} from '@/lib/seguimiento'

export const dynamic = 'force-dynamic'

export default async function PacienteResumen(
  props: {
    params: Promise<{ id: string }>
  }
) {
  const params = await props.params;
  const supabase = createClient()
  const id = params.id

  const [
    { data: ficha },
    { data: ultimaMedicion },
    { data: ultimaEval },
    { data: planes },
    { data: ultFeedback },
    { data: objetivos },
  ] = await Promise.all([
    supabase
      .from('fichas_paciente')
      .select('dx_medico, dx_nutricional, fecha_primera_consulta, updated_at')
      .eq('paciente_id', id)
      .maybeSingle(),
    supabase
      .from('mediciones_antropometricas')
      .select('peso_kg, talla_cm, imc, porc_grasa, fecha_medicion')
      .eq('paciente_id', id)
      .order('fecha_medicion', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('evaluaciones_funcionales')
      .select('puntaje_total, fecha')
      .eq('paciente_id', id)
      .order('fecha', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('planes')
      .select('id, tipo, titulo, estado, fecha_desde')
      .eq('paciente_id', id)
      .eq('estado', 'vigente')
      .order('fecha_desde', { ascending: false }),
    supabase
      .from('feedback_semanal')
      .select('semana_inicio, animo, energia, adherencia_alimentacion, adherencia_entrenamiento, dudas, respondido_at')
      .eq('paciente_id', id)
      .order('semana_inicio', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('objetivos')
      .select('id, categoria, descripcion, estado')
      .eq('paciente_id', id)
      .in('estado', ['pendiente', 'en_progreso']),
  ])

  const cat = ultimaEval?.puntaje_total != null
    ? categoriaCondicionFisica(ultimaEval.puntaje_total, PUNTAJE_MAX_FUNCIONAL)
    : null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Card title="Ficha clínica" icon={ClipboardList} href={`/admin/pacientes/${id}/ficha`}>
        {ficha ? (
          <ul className="space-y-1.5 text-sm text-gray-700">
            <li>
              <span className="font-semibold">DX médico:</span>{' '}
              {ficha.dx_medico ?? <span className="text-gray-400">—</span>}
            </li>
            <li>
              <span className="font-semibold">DX nutricional:</span>{' '}
              {ficha.dx_nutricional ?? <span className="text-gray-400">—</span>}
            </li>
            <li>
              <span className="font-semibold">1ª consulta:</span>{' '}
              {formatearFechaCorta(ficha.fecha_primera_consulta)}
            </li>
            <li className="text-xs text-gray-500 pt-1">
              Actualizada {new Date(ficha.updated_at).toLocaleDateString('es-AR')}
            </li>
          </ul>
        ) : (
          <Empty msg="Aún no se cargó la ficha del paciente." />
        )}
      </Card>

      <Card
        title="Última antropometría"
        icon={Ruler}
        href={`/admin/pacientes/${id}/antropometria`}
      >
        {ultimaMedicion ? (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="Peso" value={ultimaMedicion.peso_kg ? `${ultimaMedicion.peso_kg} kg` : '—'} />
            <Stat label="IMC" value={ultimaMedicion.imc ?? '—'} />
            <Stat
              label="% grasa"
              value={ultimaMedicion.porc_grasa != null ? `${ultimaMedicion.porc_grasa}%` : '—'}
            />
            <Stat label="Talla" value={ultimaMedicion.talla_cm ? `${ultimaMedicion.talla_cm} cm` : '—'} />
            <p className="col-span-2 text-xs text-gray-500 pt-1">
              {formatearFechaCorta(ultimaMedicion.fecha_medicion)}
            </p>
          </div>
        ) : (
          <Empty msg="Sin mediciones registradas." />
        )}
      </Card>

      <Card
        title="Condición física"
        icon={Dumbbell}
        href={`/admin/pacientes/${id}/evaluacion-funcional`}
      >
        {ultimaEval ? (
          <div>
            <p className="text-3xl font-heading font-bold text-gray-900">
              {ultimaEval.puntaje_total}
              <span className="text-base text-gray-500 font-medium">/ {PUNTAJE_MAX_FUNCIONAL}</span>
            </p>
            {cat ? (
              <span
                className={`mt-2 inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${cat.color}`}
              >
                {cat.label} ({cat.pct.toFixed(0)}%)
              </span>
            ) : null}
            <p className="text-xs text-gray-500 pt-2">
              Última evaluación {formatearFechaCorta(ultimaEval.fecha)}
            </p>
          </div>
        ) : (
          <Empty msg="Sin evaluaciones funcionales." />
        )}
      </Card>

      <Card title="Planes vigentes" icon={FileText} href={`/admin/pacientes/${id}/planes`}>
        {planes && planes.length > 0 ? (
          <ul className="divide-y divide-gray-100 text-sm">
            {planes.map((p) => (
              <li key={p.id} className="py-1.5 flex items-center justify-between gap-3">
                <span className="text-gray-800">{p.titulo}</span>
                <span className="text-xs uppercase tracking-wide text-vimet-orange font-semibold">
                  {p.tipo}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty msg="Sin planes vigentes." />
        )}
      </Card>

      <Card title="Último feedback" icon={MessageSquare} href={`/admin/pacientes/${id}/feedback`}>
        {ultFeedback ? (
          <div className="space-y-2 text-sm text-gray-700">
            <p className="text-xs text-gray-500">
              Semana del {formatearFechaCorta(ultFeedback.semana_inicio)}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Ánimo" value={ultFeedback.animo ?? '—'} />
              <Stat label="Energía" value={ultFeedback.energia ?? '—'} />
              <Stat
                label="Adh. alim."
                value={
                  ultFeedback.adherencia_alimentacion != null
                    ? `${ultFeedback.adherencia_alimentacion}%`
                    : '—'
                }
              />
              <Stat
                label="Adh. entreno"
                value={
                  ultFeedback.adherencia_entrenamiento != null
                    ? `${ultFeedback.adherencia_entrenamiento}%`
                    : '—'
                }
              />
            </div>
            {ultFeedback.dudas && !ultFeedback.respondido_at ? (
              <p className="rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2 text-xs text-yellow-800">
                Tiene dudas pendientes de responder.
              </p>
            ) : null}
          </div>
        ) : (
          <Empty msg="Aún no envió feedback semanal." />
        )}
      </Card>

      <Card title="Objetivos activos" icon={Target} href={`/admin/pacientes/${id}/objetivos`}>
        {objetivos && objetivos.length > 0 ? (
          <ul className="space-y-1.5 text-sm">
            {objetivos.slice(0, 5).map((o) => (
              <li key={o.id} className="flex items-start gap-2">
                <TrendingUp className="size-4 text-vimet-orange mt-0.5 shrink-0" />
                <span className="text-gray-800">
                  <span className="font-semibold">
                    {CATEGORIA_OBJETIVO_LABEL[o.categoria] ?? o.categoria}:
                  </span>{' '}
                  {o.descripcion}
                </span>
              </li>
            ))}
            {objetivos.length > 5 ? (
              <li className="text-xs text-gray-500 italic">
                +{objetivos.length - 5} más
              </li>
            ) : null}
          </ul>
        ) : (
          <Empty msg="Sin objetivos activos." />
        )}
      </Card>
    </div>
  )
}

function Card({
  title,
  icon: Icon,
  href,
  children,
}: {
  title: string
  icon: typeof ClipboardList
  href: string
  children: React.ReactNode
}) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
      <header className="flex items-center justify-between mb-3">
        <h2 className="font-heading font-semibold text-gray-900 inline-flex items-center gap-2">
          <Icon className="size-5 text-vimet-orange" />
          {title}
        </h2>
        <Link
          href={href}
          className="text-xs font-semibold text-vimet-orange inline-flex items-center gap-1 hover:underline"
        >
          Ver <ArrowRight className="size-3.5" />
        </Link>
      </header>
      <div className="flex-1">{children}</div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="font-heading font-semibold text-gray-900">{value}</p>
    </div>
  )
}

function Empty({ msg }: { msg: string }) {
  return <p className="text-sm text-gray-500 italic">{msg}</p>
}
