import { CalendarDays, Utensils } from 'lucide-react'

import { RutinaImprimir } from '@/components/seguimiento/rutina-imprimir'
import type { RutinaEjercicio } from '@/components/seguimiento/rutina-viewer'
import type { Seccion } from '@/components/seguimiento/plan-seccion-form'
import { hoyArgentina } from '@/lib/datetime'
import {
  SEXO_LABEL,
  TIPO_PLAN_LABEL,
  formatearFechaCorta,
} from '@/lib/seguimiento'

type PlanRow = {
  id: number
  tipo: 'nutricion' | 'entrenamiento' | 'combo'
  titulo: string
  fecha_desde: string
  fecha_hasta: string | null
  notas: string | null
  pautas_generales: string | null
  pautas_hidratacion: string | null
  pre_entreno: string | null
  intra_entreno: string | null
  post_entreno: string | null
  suplementacion: string | null
  disciplina: string | null
  experiencia_previa: string | null
  frecuencia: string | null
  volumen: string | null
  disponibilidad_lunes: string | null
  disponibilidad_martes: string | null
  disponibilidad_miercoles: string | null
  disponibilidad_jueves: string | null
  disponibilidad_viernes: string | null
  disponibilidad_sabado: string | null
}

const DIAS_DISPONIBILIDAD = [
  { key: 'disponibilidad_lunes', label: 'Lunes' },
  { key: 'disponibilidad_martes', label: 'Martes' },
  { key: 'disponibilidad_miercoles', label: 'Miércoles' },
  { key: 'disponibilidad_jueves', label: 'Jueves' },
  { key: 'disponibilidad_viernes', label: 'Viernes' },
  { key: 'disponibilidad_sabado', label: 'Sábado' },
] as const

function calcularEdad(fechaNacimiento: string | null): number | null {
  if (!fechaNacimiento) return null
  const hoy = new Date(`${hoyArgentina()}T00:00:00`)
  const nac = new Date(`${fechaNacimiento}T00:00:00`)
  let edad = hoy.getFullYear() - nac.getFullYear()
  const aunNoCumplio =
    hoy.getMonth() < nac.getMonth() ||
    (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())
  if (aunNoCumplio) edad -= 1
  return edad
}

function Block({
  label,
  value,
  compact = false,
}: {
  label: string
  value: string | null
  compact?: boolean
}) {
  if (!value || value.trim() === '') {
    if (compact) {
      return (
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
          <p className="text-sm text-gray-400 mt-0.5">—</p>
        </div>
      )
    }
    return null
  }
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">{label}</p>
      <p className="text-sm text-gray-900 whitespace-pre-line">{value}</p>
    </div>
  )
}

export function PlanImprimirView({
  plan,
  paciente,
  ficha,
  profesional,
  secciones,
  rutina,
  diasDescanso,
  tieneNutri,
  tieneEntreno,
}: {
  plan: PlanRow
  paciente: { nombre: string; apellido: string; email: string }
  ficha: { fecha_nacimiento: string | null; sexo: string | null; ocupacion: string | null } | null
  profesional: { nombre: string; apellido: string } | null
  secciones: Seccion[]
  rutina: RutinaEjercicio[]
  diasDescanso: string[]
  tieneNutri: boolean
  tieneEntreno: boolean
}) {
  const edad = calcularEdad(ficha?.fecha_nacimiento ?? null)

  return (
    <div className="max-w-[860px] mx-auto">
      <header className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
        <div className="h-2 bg-vimet-gradient" />
        <div className="p-6 flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/brand/logo-light.jpg"
              alt="VIMET"
              className="h-12 w-auto object-contain shrink-0"
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-vimet-orange">
                {TIPO_PLAN_LABEL[plan.tipo]}
              </p>
              <h1 className="font-heading text-2xl font-bold text-gray-900">{plan.titulo}</h1>
              <p className="text-sm text-gray-700 mt-1 inline-flex items-center gap-1.5">
                <CalendarDays className="size-4 text-vimet-orange" />
                Vigente desde {formatearFechaCorta(plan.fecha_desde)}
                {plan.fecha_hasta ? ` hasta ${formatearFechaCorta(plan.fecha_hasta)}` : ''}
              </p>
              {profesional ? (
                <p className="text-xs text-gray-500 mt-1">
                  A cargo de {profesional.nombre} {profesional.apellido}
                </p>
              ) : null}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-gray-500">Paciente</p>
            <p className="font-heading text-lg font-semibold text-gray-900">
              {paciente.nombre} {paciente.apellido}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {[
                edad != null ? `${edad} años` : null,
                ficha?.sexo ? SEXO_LABEL[ficha.sexo] : null,
                ficha?.ocupacion || null,
              ]
                .filter(Boolean)
                .join(' · ') || '—'}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Impreso el {formatearFechaCorta(hoyArgentina())}
            </p>
          </div>
        </div>
      </header>

      {tieneNutri ? (
        <section className="bg-white rounded-2xl border border-gray-100 p-6 mb-5 print:break-inside-avoid">
          <h2 className="font-heading text-lg font-semibold text-gray-900 mb-4">Pautas nutricionales</h2>
          <div className="space-y-4">
            <Block label="Pautas generales" value={plan.pautas_generales} />
            <Block label="Hidratación" value={plan.pautas_hidratacion} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Block label="Pre entreno" value={plan.pre_entreno} compact />
              <Block label="Intra entreno" value={plan.intra_entreno} compact />
              <Block label="Post entreno" value={plan.post_entreno} compact />
            </div>
            <Block label="Suplementación" value={plan.suplementacion} />
          </div>
        </section>
      ) : null}

      {secciones.map((s) => (
        <section
          key={s.id}
          className="bg-white rounded-2xl border border-gray-100 p-6 mb-5 print:break-inside-avoid"
        >
          <h2 className="font-heading text-lg font-semibold text-gray-900 mb-4">{s.titulo}</h2>

          {s.tipo === 'comidas_dia' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-4">
              {s.momentos.map((m, i) => (
                <div
                  key={m.id}
                  className="print:break-inside-avoid rounded-2xl border border-vimet-tint1 overflow-hidden bg-white"
                >
                  <div className="flex items-center gap-2 bg-vimet-gradient px-4 py-2">
                    <span className="flex items-center justify-center size-6 rounded-full bg-white/25 text-white text-xs font-bold shrink-0">
                      {i + 1}
                    </span>
                    <Utensils className="size-3.5 text-white/90 shrink-0" />
                    <p className="text-white text-sm font-semibold uppercase tracking-wide truncate">
                      {m.nombre_momento}
                    </p>
                  </div>
                  <div className="p-4 bg-vimet-cream/40">
                    <p className="text-sm text-gray-800 whitespace-pre-line">{m.contenido}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : s.tipo === 'imagenes' ? (
            <div className="flex flex-wrap gap-3">
              {s.imagenes.map((img) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img.id}
                  src={img.url}
                  alt=""
                  className="h-20 w-20 rounded-lg object-cover border border-gray-200"
                />
              ))}
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-800 whitespace-pre-line">{s.contenido}</p>
              {s.imagenes.length > 0 ? (
                <div className="flex flex-wrap gap-3 mt-4">
                  {s.imagenes.map((img) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={img.id}
                      src={img.url}
                      alt=""
                      className="max-w-[16rem] rounded-lg border border-gray-200"
                    />
                  ))}
                </div>
              ) : null}
            </>
          )}
        </section>
      ))}

      {tieneEntreno ? (
        <section className="bg-white rounded-2xl border border-gray-100 p-6 mb-5 print:break-inside-avoid">
          <h2 className="font-heading text-lg font-semibold text-gray-900 mb-4">Datos de entrenamiento</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Block label="Disciplina" value={plan.disciplina} compact />
            <Block label="Frecuencia" value={plan.frecuencia} compact />
            <Block label="Experiencia previa" value={plan.experiencia_previa} compact />
            <Block label="Volumen" value={plan.volumen} compact />
          </div>

          {DIAS_DISPONIBILIDAD.some((d) => plan[d.key]) ? (
            <div className="mt-5">
              <h3 className="font-heading font-semibold text-gray-900 mb-2">Disponibilidad / agenda</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                {DIAS_DISPONIBILIDAD.map((d) => (
                  <li key={d.key} className="rounded-lg border border-gray-100 px-3 py-2">
                    <p className="text-xs uppercase tracking-wide text-gray-500">{d.label}</p>
                    <p className="text-gray-900 mt-0.5">
                      {plan[d.key] ?? <span className="text-gray-400">—</span>}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {rutina.length > 0 || diasDescanso.length > 0 ? (
        <RutinaImprimir rutina={rutina} diasDescanso={diasDescanso} />
      ) : null}

      {plan.notas ? (
        <section className="bg-white rounded-2xl border border-gray-100 p-6 print:break-inside-avoid">
          <h2 className="font-heading text-lg font-semibold text-gray-900 mb-2">Notas</h2>
          <p className="text-sm text-gray-800 whitespace-pre-line">{plan.notas}</p>
        </section>
      ) : null}
    </div>
  )
}
