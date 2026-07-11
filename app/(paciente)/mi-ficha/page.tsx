import { ClipboardList, FileWarning } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { formatearFechaCorta, SEXO_LABEL, ACTIVIDAD_DIARIA_LABEL } from '@/lib/seguimiento'

export const metadata = { title: 'Mi ficha' }
export const dynamic = 'force-dynamic'

export default async function MiFichaPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: ficha } = await supabase
    .from('fichas_paciente')
    .select(
      'fecha_nacimiento, sexo, ocupacion, fecha_primera_consulta, fuma, bebe, drogas, entrena, actividad_diaria, horas_sueno, dx_medico, dx_nutricional, medicacion, suplementacion, lesiones, molestias, datos_laboratorio, motivos_consulta, updated_at',
    )
    .eq('paciente_id', user.id)
    .maybeSingle()

  return (
    <>
      <header className="mb-6">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900">Mi ficha</h1>
        <p className="text-gray-700 mt-1">
          Esta es la información clínica que tu equipo VIMET tiene cargada sobre vos.
        </p>
      </header>

      {!ficha ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <FileWarning className="size-10 text-gray-300 mx-auto" />
          <h2 className="mt-3 font-heading text-xl font-semibold text-gray-900">
            Tu ficha aún no fue cargada
          </h2>
          <p className="mt-1 text-sm text-gray-700">
            Después de tu primera consulta, tu equipo va a cargar acá toda tu información clínica.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <Section title="Datos personales" icon={ClipboardList}>
            <Row label="Sexo" value={ficha.sexo ? SEXO_LABEL[ficha.sexo] ?? ficha.sexo : null} />
            <Row label="Fecha de nacimiento" value={formatearFechaCorta(ficha.fecha_nacimiento)} />
            <Row label="Ocupación" value={ficha.ocupacion} />
            <Row
              label="Primera consulta"
              value={formatearFechaCorta(ficha.fecha_primera_consulta)}
            />
          </Section>

          <Section title="Hábitos" icon={ClipboardList}>
            <Row label="Fuma" value={bool(ficha.fuma)} />
            <Row label="Bebe alcohol" value={bool(ficha.bebe)} />
            <Row label="Otras drogas" value={bool(ficha.drogas)} />
            <Row label="Entrena actualmente" value={bool(ficha.entrena)} />
            <Row
              label="Actividad diaria"
              value={
                ficha.actividad_diaria
                  ? ACTIVIDAD_DIARIA_LABEL[ficha.actividad_diaria] ?? ficha.actividad_diaria
                  : null
              }
            />
            <Row
              label="Horas de sueño"
              value={ficha.horas_sueno != null ? `${ficha.horas_sueno} hs` : null}
            />
          </Section>

          <Section title="Salud" icon={ClipboardList}>
            <FullRow label="Diagnóstico médico" value={ficha.dx_medico} />
            <FullRow label="Diagnóstico nutricional" value={ficha.dx_nutricional} />
            <FullRow label="Medicación" value={ficha.medicacion} />
            <FullRow label="Suplementación" value={ficha.suplementacion} />
            <FullRow label="Lesiones" value={ficha.lesiones} />
            <FullRow label="Molestias / pinzamientos" value={ficha.molestias} />
          </Section>

          <Section title="Laboratorio y motivos" icon={ClipboardList}>
            <FullRow label="Datos de laboratorio" value={ficha.datos_laboratorio} />
            <FullRow label="Motivos de la consulta" value={ficha.motivos_consulta} />
          </Section>

          <p className="text-xs text-gray-500">
            Última actualización:{' '}
            {new Date(ficha.updated_at).toLocaleDateString('es-AR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>
      )}
    </>
  )
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: typeof ClipboardList
  children: React.ReactNode
}) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h2 className="font-heading font-semibold text-gray-900 inline-flex items-center gap-2 mb-3">
        <Icon className="size-5 text-vimet-orange" />
        {title}
      </h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</dl>
    </section>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900 mt-0.5">
        {value && value !== '—' ? value : <span className="text-gray-400">—</span>}
      </dd>
    </div>
  )
}

function FullRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="sm:col-span-2">
      <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900 mt-0.5 whitespace-pre-line">
        {value && value.trim() !== '' ? value : <span className="text-gray-400">—</span>}
      </dd>
    </div>
  )
}

function bool(v: boolean | null | undefined) {
  if (v === true) return 'Sí'
  if (v === false) return 'No'
  return null
}
