import { CalendarPlus, Clock } from 'lucide-react'
import Link from 'next/link'

import { PageHeader } from '@/components/page-header'
import {
  SERVICIO_ICONS,
  SERVICIOS_FALLBACK,
  TIPO_LABEL,
  type TipoServicio,
} from '@/lib/config/servicios'
import { team } from '@/lib/config/team'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Servicios' }

type ServicioRow = {
  id: number | string
  nombre: string
  descripcion: string | null
  duracion_minutos: number
  tipo: TipoServicio
  icono: string | null
  profesional_id: string | null
}

type ServicioView = {
  id: string
  nombre: string
  descripcion: string
  duracion_minutos: number
  tipo: TipoServicio
  icono: string
  profesional: 'avril' | 'gero' | null
}

async function loadServicios(): Promise<ServicioView[]> {
  const supabase = createClient()
  const [{ data: servicios }, { data: profiles }] = await Promise.all([
    supabase.from('servicios').select('*').eq('activo', true),
    supabase.from('profiles').select('id, email').in('email', ['avril@vimet.com', 'gero@vimet.com']),
  ])

  if (!servicios?.length) {
    return SERVICIOS_FALLBACK.map((s, i) => ({
      id: `fallback-${i}`,
      nombre: s.nombre,
      descripcion: s.descripcion,
      duracion_minutos: s.duracion_minutos,
      tipo: s.tipo,
      icono: s.icono,
      profesional: s.profesional,
    }))
  }

  const profMap = new Map(profiles?.map((p) => [p.id, p.email] as const) ?? [])
  return (servicios as ServicioRow[]).map((s) => {
    const email = s.profesional_id ? profMap.get(s.profesional_id) : null
    const profesional: 'avril' | 'gero' | null = email === 'avril@vimet.com'
      ? 'avril'
      : email === 'gero@vimet.com'
        ? 'gero'
        : null
    return {
      id: String(s.id),
      nombre: s.nombre,
      descripcion: s.descripcion ?? '',
      duracion_minutos: s.duracion_minutos,
      tipo: s.tipo,
      icono: s.icono ?? 'HandHeart',
      profesional,
    }
  })
}

const SECCIONES: { tipo: TipoServicio; bg: string; profKey: 'avril' | 'gero' | null }[] = [
  { tipo: 'nutricion', bg: 'bg-white', profKey: 'avril' },
  { tipo: 'entrenamiento', bg: 'bg-vimet-sand', profKey: 'gero' },
  { tipo: 'combo', bg: 'bg-white', profKey: null },
]

export default async function ServiciosPage() {
  const servicios = await loadServicios()

  return (
    <>
      <PageHeader
        eyebrow="Catálogo"
        title={
          <>
            Nuestros <span className="text-white/90 underline decoration-white/40">servicios</span>
          </>
        }
        description="Abordaje integral combinando nutrición y entrenamiento personalizado"
      />

      {SECCIONES.map((sec) => {
        const items = servicios.filter((s) => s.tipo === sec.tipo)
        if (!items.length) return null
        const prof = sec.profKey ? team[sec.profKey] : null
        return (
          <section key={sec.tipo} id={sec.tipo} className={`${sec.bg} py-16 lg:py-24`}>
            <div className="container-vimet">
              <div className="flex items-center gap-3 mb-10">
                <span
                  className={`inline-block size-2.5 rounded-full ${
                    sec.tipo === 'nutricion'
                      ? 'bg-vimet-orange'
                      : sec.tipo === 'entrenamiento'
                        ? 'bg-vimet-red'
                        : 'bg-gray-900'
                  }`}
                  aria-hidden
                />
                <div>
                  <h2 className="font-heading text-2xl sm:text-3xl font-bold text-gray-900">
                    {TIPO_LABEL[sec.tipo]}
                  </h2>
                  {prof ? (
                    <p className="text-sm text-gray-700 mt-1">
                      {prof.nombre} — {prof.titulo}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-700 mt-1">
                      Trabajo conjunto del equipo VIMET
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((s) => {
                  const Icon = SERVICIO_ICONS[s.icono] ?? SERVICIO_ICONS.HandHeart
                  return (
                    <article
                      key={s.id}
                      className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all flex flex-col"
                    >
                      <div
                        className={`size-12 rounded-lg flex items-center justify-center mb-4 ${
                          s.tipo === 'nutricion'
                            ? 'bg-vimet-orange/10 text-vimet-orange'
                            : s.tipo === 'entrenamiento'
                              ? 'bg-vimet-red/10 text-vimet-red'
                              : 'bg-gray-900/10 text-gray-900'
                        }`}
                      >
                        <Icon className="size-6" />
                      </div>
                      <h3 className="font-heading font-semibold text-lg text-gray-900 mb-2">
                        {s.nombre}
                      </h3>
                      <p className="text-sm text-gray-700 leading-relaxed mb-4">{s.descripcion}</p>
                      <div className="mt-auto flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-700">
                          <Clock className="size-3.5" /> {s.duracion_minutos} min
                        </span>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                          {TIPO_LABEL[s.tipo]}
                        </span>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          </section>
        )
      })}

      <section className="bg-vimet-gradient py-16 lg:py-20 text-center">
        <div className="container-vimet text-white">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold">
            ¿Cuál es el servicio para vos?
          </h2>
          <p className="mt-3 max-w-xl mx-auto text-white/90">
            Si no estás seguro/a, reservá una evaluación inicial y te orientamos.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/turnos/nuevo"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white text-vimet-red font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              <CalendarPlus className="size-5" /> Reservar turno
            </Link>
            <Link
              href="/faq"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-white text-white font-semibold hover:bg-white/10 transition-colors"
            >
              Ver FAQ
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
