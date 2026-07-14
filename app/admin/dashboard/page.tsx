import { CalendarCheck2, CalendarClock, CalendarDays, CalendarRange } from 'lucide-react'
import Link from 'next/link'

import { hoyArgentina } from '@/lib/datetime'
import { ESTADO_TURNO_BADGE, ESTADO_TURNO_LABEL } from '@/lib/seguimiento'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Dashboard' }
export const dynamic = 'force-dynamic'

type TurnoRow = {
  id: number
  fecha: string
  hora_inicio: string
  hora_fin: string
  estado: string
  servicios: { nombre: string } | null
  paciente: { nombre: string; apellido: string } | null
}

export default async function AdminDashboard() {
  const supabase = createClient()
  const today = hoyArgentina()
  const in15 = hoyArgentina(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000))

  const [{ data: hoyData }, { data: proxData }] = await Promise.all([
    supabase
      .from('turnos')
      .select(
        'id, fecha, hora_inicio, hora_fin, estado, servicios(nombre), paciente:profiles!turnos_paciente_id_fkey(nombre, apellido)',
      )
      .eq('fecha', today)
      .order('hora_inicio'),
    supabase
      .from('turnos')
      .select(
        'id, fecha, hora_inicio, hora_fin, estado, servicios(nombre), paciente:profiles!turnos_paciente_id_fkey(nombre, apellido)',
      )
      .gt('fecha', today)
      .lte('fecha', in15)
      .in('estado', ['pendiente', 'confirmado'])
      .order('fecha')
      .order('hora_inicio')
      .limit(15),
  ])

  const hoy = (hoyData ?? []) as unknown as TurnoRow[]
  const proximos = (proxData ?? []) as unknown as TurnoRow[]
  const confirmados = hoy.filter((t) => t.estado === 'confirmado').length
  const pendientes = hoy.filter((t) => t.estado === 'pendiente').length

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-3 mb-8">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-700 mt-1">
            {new Date().toLocaleDateString('es-AR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={CalendarDays} color="bg-vimet-orange/15 text-vimet-orange" value={hoy.length} label="Turnos hoy" />
        <StatCard icon={CalendarCheck2} color="bg-green-100 text-green-700" value={confirmados} label="Confirmados" />
        <StatCard icon={CalendarClock} color="bg-blue-100 text-blue-700" value={pendientes} label="Pendientes" />
        <StatCard icon={CalendarRange} color="bg-purple-100 text-purple-700" value={proximos.length} label="Próximos" />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Turnos de hoy" empty="No tenés turnos programados para hoy.">
          {hoy.length === 0 ? null : <TurnoTable turnos={hoy} showFecha={false} />}
        </Card>
        <Card title="Próximos turnos" empty="No hay turnos próximos.">
          {proximos.length === 0 ? null : <TurnoTable turnos={proximos} showFecha />}
        </Card>
      </div>
    </div>
  )

  function Card({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-heading text-lg font-semibold text-gray-900 mb-4">{title}</h2>
        {children ?? <p className="text-sm text-gray-700 text-center py-6">{empty}</p>}
      </div>
    )
  }

  function TurnoTable({ turnos, showFecha }: { turnos: TurnoRow[]; showFecha: boolean }) {
    return (
      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-700">
              {showFecha ? <th className="px-2 py-2">Fecha</th> : null}
              <th className="px-2 py-2">Hora</th>
              <th className="px-2 py-2">Paciente</th>
              <th className="px-2 py-2">Servicio</th>
              <th className="px-2 py-2">Estado</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {turnos.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                {showFecha ? (
                  <td className="px-2 py-2.5 text-gray-700">
                    {new Date(`${t.fecha}T00:00:00`).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                  </td>
                ) : null}
                <td className="px-2 py-2.5 font-semibold text-gray-900">
                  {t.hora_inicio.slice(0, 5)}
                </td>
                <td className="px-2 py-2.5 text-gray-800">
                  {t.paciente?.nombre} {t.paciente?.apellido}
                </td>
                <td className="px-2 py-2.5 text-gray-700">{t.servicios?.nombre ?? 'Consulta'}</td>
                <td className="px-2 py-2.5">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      ESTADO_TURNO_BADGE[t.estado] ?? 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {ESTADO_TURNO_LABEL[t.estado] ?? t.estado}
                  </span>
                </td>
                <td className="px-2 py-2.5 text-right">
                  <Link
                    href={`/admin/turno/${t.id}`}
                    className="text-vimet-orange font-semibold text-sm hover:underline"
                  >
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
}

function StatCard({
  icon: Icon,
  color,
  value,
  label,
}: {
  icon: typeof CalendarDays
  color: string
  value: number
  label: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`size-12 rounded-xl ${color} flex items-center justify-center shrink-0`}>
        <Icon className="size-6" />
      </div>
      <div>
        <p className="text-2xl font-heading font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-xs uppercase tracking-wide text-gray-700 mt-1">{label}</p>
      </div>
    </div>
  )
}
