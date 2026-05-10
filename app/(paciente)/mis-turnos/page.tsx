import { Building2, CalendarDays, CalendarPlus, Clock, UserRound, Video } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { cancelarTurnoAction } from '@/actions/turnos'
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

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  cancelado: 'Cancelado',
  completado: 'Completado',
  no_asistio: 'No asistió',
}

const ESTADO_BADGE: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800',
  confirmado: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800',
  completado: 'bg-blue-100 text-blue-800',
  no_asistio: 'bg-gray-200 text-gray-700',
}

export const metadata = { title: 'Mis turnos' }

export default async function MisTurnosPage({
  searchParams,
}: {
  searchParams: { nuevo?: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/mis-turnos')

  const [{ data: profile }, { data: turnos }] = await Promise.all([
    supabase.from('profiles').select('nombre, apellido').eq('id', user.id).maybeSingle(),
    supabase
      .from('turnos')
      .select(
        'id, fecha, hora_inicio, hora_fin, modalidad, estado, servicios(nombre), profesional:profiles!turnos_profesional_id_fkey(nombre, apellido)',
      )
      .eq('paciente_id', user.id)
      .order('fecha', { ascending: false })
      .order('hora_inicio', { ascending: false }),
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
  const showNuevo = searchParams?.nuevo === '1'

  return (
    <div className="min-h-screen pt-24 pb-16 bg-vimet-sand">
      <div className="container-vimet">
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
              const cancelable = ['pendiente', 'confirmado'].includes(t.estado)
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

                    {cancelable ? (
                      <form action={cancelarTurnoAction} className="mt-4">
                        <input type="hidden" name="id" value={t.id} />
                        <button
                          type="submit"
                          className="text-sm font-semibold text-vimet-red hover:underline"
                        >
                          Cancelar turno
                        </button>
                      </form>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
