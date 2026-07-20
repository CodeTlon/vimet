import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

import { cancelarPendientesSinConfirmar, marcarNoAsistioVencidos } from '@/actions/turnos'
import { hoyArgentina } from '@/lib/datetime'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Calendario' }
export const dynamic = 'force-dynamic'

const NOMBRES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const ESTADO_DOT: Record<string, string> = {
  pendiente: 'bg-yellow-500',
  confirmado: 'bg-green-500',
  cancelado: 'bg-red-500',
  completado: 'bg-blue-500',
  no_asistio: 'bg-gray-500',
}

type TurnoRow = {
  id: number
  fecha: string
  hora_inicio: string
  estado: string
  paciente: { nombre: string; apellido: string } | null
}

export default async function AdminCalendario(
  props: {
    searchParams: Promise<{ year?: string; month?: string }>
  }
) {
  const searchParams = await props.searchParams;
  const [hoyY, hoyM] = hoyArgentina().split('-').map(Number)
  const year = Number(searchParams?.year) || hoyY
  const month = Number(searchParams?.month) || hoyM
  const monthIdx = month - 1

  let pm = month - 1
  let py = year
  if (pm < 1) {
    pm = 12
    py--
  }
  let nm = month + 1
  let ny = year
  if (nm > 12) {
    nm = 1
    ny++
  }

  const first = new Date(year, monthIdx, 1)
  const dim = new Date(year, monthIdx + 1, 0).getDate()
  const start = first.getDay()
  const todayISO = hoyArgentina()
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(dim).padStart(2, '0')}`

  await marcarNoAsistioVencidos()
  await cancelarPendientesSinConfirmar()

  const supabase = await createClient()
  const { data } = await supabase
    .from('turnos')
    .select(
      'id, fecha, hora_inicio, estado, paciente:profiles!turnos_paciente_id_fkey(nombre, apellido)',
    )
    .gte('fecha', monthStart)
    .lte('fecha', monthEnd)
    .order('hora_inicio')

  const turnos = (data ?? []) as unknown as TurnoRow[]
  const porFecha = new Map<string, TurnoRow[]>()
  for (const t of turnos) {
    const arr = porFecha.get(t.fecha) ?? []
    arr.push(t)
    porFecha.set(t.fecha, arr)
  }

  return (
    <div>
      <header className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-gray-900">Calendario</h1>
      </header>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <Link
            href={`/admin/calendario?year=${py}&month=${pm}`}
            className="size-9 inline-flex items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <h2 className="font-heading text-lg font-semibold text-gray-900">
            {NOMBRES[month]} {year}
          </h2>
          <Link
            href={`/admin/calendario?year=${ny}&month=${nm}`}
            className="size-9 inline-flex items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="size-5" />
          </Link>
        </div>

        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
          {DIAS.map((d) => (
            <div
              key={d}
              className="px-2 py-3 text-xs font-semibold text-gray-700 text-center uppercase tracking-wide"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {Array.from({ length: start }, (_, i) => (
            <div key={`pre-${i}`} className="bg-gray-50 min-h-[110px]" />
          ))}
          {Array.from({ length: dim }, (_, idx) => {
            const d = idx + 1
            const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
            const isToday = date === todayISO
            const dayT = porFecha.get(date) ?? []
            return (
              <div
                key={date}
                className={`relative min-h-[110px] border-b border-r border-gray-100 p-2 flex flex-col gap-1 ${
                  isToday ? 'bg-vimet-cream' : 'bg-white'
                }`}
              >
                <span
                  className={`text-xs font-semibold ${
                    isToday ? 'text-vimet-red' : 'text-gray-700'
                  }`}
                >
                  {d}
                </span>
                {dayT.slice(0, 3).map((t) => (
                  <Link
                    key={t.id}
                    href={`/admin/turno/${t.id}`}
                    className="flex items-center gap-1.5 px-1.5 py-1 rounded-md text-[11px] font-medium text-gray-800 bg-gray-100 hover:bg-gray-200 transition-colors truncate"
                  >
                    <span
                      className={`size-1.5 rounded-full shrink-0 ${
                        ESTADO_DOT[t.estado] ?? 'bg-gray-400'
                      }`}
                    />
                    <span className="truncate">
                      {t.hora_inicio.slice(0, 5)} {t.paciente?.nombre ?? ''}
                    </span>
                  </Link>
                ))}
                {dayT.length > 3 ? (
                  <span className="text-[11px] text-gray-700 px-1.5">
                    + {dayT.length - 3} más
                  </span>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
