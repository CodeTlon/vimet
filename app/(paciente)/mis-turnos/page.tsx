import { Building2, CalendarDays, CalendarPlus, Clock, UserRound, Video } from 'lucide-react'
import Link from 'next/link'

import {
  cancelarPendientesSinConfirmar,
  cancelarTurnoAction,
  confirmarTurnoAction,
  marcarNoAsistioVencidos,
} from '@/actions/turnos'
import { Pagination } from '@/components/pagination'
import { hoyArgentina, horaArgentina, turnoCorteDesde } from '@/lib/datetime'
import { pageRange, parsePage, totalPages as calcTotalPages } from '@/lib/pagination'
import { ESTADO_TURNO_BADGE as ESTADO_BADGE, ESTADO_TURNO_LABEL as ESTADO_LABEL } from '@/lib/seguimiento'
import { createClient } from '@/lib/supabase/server'

const MESES = [
  '',
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
]

function corteLabel(fecha: string, horaInicio: string): string {
  const corte = turnoCorteDesde(fecha, horaInicio)
  const [, mes, dia] = hoyArgentina(corte).split('-')
  return `${horaArgentina(corte)} del ${dia}/${mes}`
}

export const metadata = { title: 'Mis turnos' }

export default async function MisTurnosPage(
  props: {
    searchParams: Promise<{ nuevo?: string; page?: string }>
  }
) {
  const searchParams = await props.searchParams;
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  // Layout (paciente) ya valida sesión y rol — acá user nunca es null.
  if (!user) return null

  await marcarNoAsistioVencidos()
  await cancelarPendientesSinConfirmar()

  const page = parsePage(searchParams?.page)
  const [from, to] = pageRange(page)

  const [{ data: profile }, { data: turnos, count }] = await Promise.all([
    supabase.from('profiles').select('nombre, apellido').eq('id', user.id).maybeSingle(),
    supabase
      .from('turnos')
      .select(
        'id, fecha, hora_inicio, hora_fin, modalidad, estado, servicios(nombre), profesional:profiles!turnos_profesional_id_fkey(nombre, apellido)',
        { count: 'exact' },
      )
      .eq('paciente_id', user.id)
      .order('fecha', { ascending: false })
      .order('hora_inicio', { ascending: false })
      .range(from, to),
  ])

  type Row = {
    id: number
    fecha: string
    hora_inicio: string
    hora_fin: string
    modalidad: 'presencial' | 'virtual'
    estado: string
    servicios: { nombre: string } | null
    profesional: { nombre: string; apellido: string } | null
  }
  const rows = (turnos ?? []) as unknown as Row[]
  const hoy = hoyArgentina()
  const showNuevo = searchParams?.nuevo === '1'
  const pages = calcTotalPages(count)
  const hrefForPage = (p: number) => `/mis-turnos?page=${p}${showNuevo ? '&nuevo=1' : ''}`

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 sm:items-end sm:justify-between mb-8">
          <div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900">
              Mis Turnos
            </h1>
            <p className="text-gray-700 mt-1">
              Hola {profile?.nombre || 'paciente'}, acá podés ver y gestionar tus turnos.
            </p>
          </div>
          <Link
            href="/turnos/nuevo"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-vimet-gradient text-white font-semibold shadow-md hover:shadow-lg transition-all"
          >
            <CalendarPlus className="size-5" /> Nuevo turno
          </Link>
        </div>

        {showNuevo ? (
          <div
            role="status"
            className="mb-6 rounded-xl bg-vimet-cream border border-vimet-orange/30 px-5 py-4 text-sm text-vimet-red"
          >
            ¡Turno reservado! Te confirmamos la asistencia a la brevedad.
          </div>
        ) : null}

        {rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <CalendarDays className="size-10 text-gray-300 mx-auto" />
            <h2 className="mt-3 font-heading text-xl font-semibold text-gray-900">
              No tenés turnos todavía
            </h2>
            <p className="mt-1 text-sm text-gray-700">
              Agendá tu primera consulta con nuestro equipo.
            </p>
            <Link
              href="/turnos/nuevo"
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-vimet-gradient text-white font-semibold shadow-md hover:shadow-lg transition-all"
            >
              <CalendarPlus className="size-4" /> Sacar turno
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rows.map((t) => {
              const fecha = new Date(`${t.fecha}T00:00:00`)
              const cancelable =
                ['pendiente', 'confirmado'].includes(t.estado) && t.fecha >= hoy
              const ModalidadIcon = t.modalidad === 'virtual' ? Video : Building2
              return (
                <li
                  key={t.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex"
                >
                  <div className="bg-vimet-gradient text-white p-5 flex flex-col items-center justify-center w-24 rounded-l-2xl">
                    <span className="text-3xl font-bold leading-none">
                      {String(fecha.getDate()).padStart(2, '0')}
                    </span>
                    <span className="text-xs uppercase tracking-wider mt-1">
                      {MESES[fecha.getMonth() + 1]}
                    </span>
                  </div>
                  <div className="flex-1 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-heading font-semibold text-gray-900">
                        {t.servicios?.nombre ?? 'Consulta'}
                      </h3>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          ESTADO_BADGE[t.estado] ?? 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {ESTADO_LABEL[t.estado] ?? t.estado}
                      </span>
                    </div>
                    <ul className="mt-3 space-y-1.5 text-sm text-gray-700">
                      {t.profesional ? (
                        <li className="flex items-center gap-2">
                          <UserRound className="size-4 text-vimet-orange" />
                          {t.profesional.nombre} {t.profesional.apellido}
                        </li>
                      ) : null}
                      <li className="flex items-center gap-2">
                        <Clock className="size-4 text-vimet-orange" />
                        {t.hora_inicio.slice(0, 5)} – {t.hora_fin.slice(0, 5)}
                      </li>
                      <li className="flex items-center gap-2">
                        <ModalidadIcon className="size-4 text-vimet-orange" />
                        {t.modalidad === 'virtual' ? 'Virtual' : 'Presencial'}
                      </li>
                    </ul>

                    {t.estado === 'pendiente' ? (
                      <p className="mt-3 text-xs text-vimet-red">
                        Confirmá antes de las {corteLabel(t.fecha, t.hora_inicio)} o el turno se cancela
                        automáticamente.
                      </p>
                    ) : null}

                    {cancelable ? (
                      <div className="mt-4 flex items-center gap-4">
                        {t.estado === 'pendiente' ? (
                          <form action={confirmarTurnoAction}>
                            <input type="hidden" name="id" value={t.id} />
                            <button
                              type="submit"
                              className="text-sm font-semibold text-vimet-orange hover:underline"
                            >
                              Confirmar turno
                            </button>
                          </form>
                        ) : null}
                        <form action={cancelarTurnoAction}>
                          <input type="hidden" name="id" value={t.id} />
                          <button
                            type="submit"
                            className="text-sm font-semibold text-vimet-red hover:underline"
                          >
                            Cancelar turno
                          </button>
                        </form>
                      </div>
                    ) : null}
                  </div>
                </li>
              )
            })}
        </ul>
      )}

      <Pagination page={page} totalPages={pages} makeHref={hrefForPage} />
    </>
  )
}
