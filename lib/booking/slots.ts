import { hoyArgentina, horaArgentina } from '@/lib/datetime'
import { createClient } from '@/lib/supabase/server'

export type Slot = { hora_inicio: string; hora_fin: string }

const SLOT_STEP_MINUTES = 15

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m ?? 0)
}

function toHHMM(total: number): string {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function diaSemana(fechaISO: string): number {
  // Postgres: 0=domingo. Date.getUTCDay() también devuelve 0=domingo.
  return new Date(`${fechaISO}T00:00:00Z`).getUTCDay()
}

export async function getSlotsDisponibles({
  profesionalId,
  fecha,
  duracion,
  modalidad,
}: {
  profesionalId: string
  fecha: string
  duracion: number
  modalidad?: 'presencial' | 'virtual'
}): Promise<Slot[]> {
  if (!profesionalId || !fecha || !duracion) return []

  const supabase = createClient()
  const dia = diaSemana(fecha)

  let horariosQuery = supabase
    .from('horarios_disponibles')
    .select('hora_inicio, hora_fin, modalidad')
    .eq('profesional_id', profesionalId)
    .eq('dia_semana', dia)
    .eq('activo', true)
  if (modalidad) {
    horariosQuery = horariosQuery.in('modalidad', [modalidad, 'ambas'])
  }

  const [{ data: horarios }, { data: turnos }, { data: bloqueos }] = await Promise.all([
    horariosQuery,
    supabase
      .from('turnos')
      .select('hora_inicio, hora_fin')
      .eq('profesional_id', profesionalId)
      .eq('fecha', fecha)
      .in('estado', ['pendiente', 'confirmado']),
    supabase
      .from('bloqueos_horario')
      .select('fecha_inicio, fecha_fin')
      .eq('profesional_id', profesionalId)
      .lte('fecha_inicio', `${fecha}T23:59:59-03:00`)
      .gte('fecha_fin', `${fecha}T00:00:00-03:00`),
  ])

  if (!horarios?.length) return []

  const ocupadas = (turnos ?? []).map((t) => ({
    inicio: toMinutes(t.hora_inicio.slice(0, 5)),
    fin: toMinutes(t.hora_fin.slice(0, 5)),
  }))

  // Argentina es UTC-3 fija (sin horario de verano): anclamos el "día" del
  // bloqueo a medianoche Argentina, no UTC, para no desfasarlo 3hs.
  const dayStart = new Date(`${fecha}T00:00:00-03:00`).getTime()
  const bloqueadas = (bloqueos ?? [])
    .map((b) => {
      const ini = new Date(b.fecha_inicio).getTime()
      const fin = new Date(b.fecha_fin).getTime()
      return {
        inicio: Math.max(0, Math.round((ini - dayStart) / 60000)),
        fin: Math.min(24 * 60, Math.round((fin - dayStart) / 60000)),
      }
    })
    .filter((b) => b.fin > 0 && b.inicio < 24 * 60)

  const ahora = new Date()
  const esHoy = fecha === hoyArgentina(ahora)
  const minimoMin = esHoy ? toMinutes(horaArgentina(ahora)) + 30 : 0

  const slots: Slot[] = []
  for (const h of horarios) {
    const wStart = toMinutes(h.hora_inicio.slice(0, 5))
    const wEnd = toMinutes(h.hora_fin.slice(0, 5))
    for (let t = wStart; t + duracion <= wEnd; t += SLOT_STEP_MINUTES) {
      const inicio = t
      const fin = t + duracion
      if (inicio < minimoMin) continue
      const choca = ocupadas.some((o) => inicio < o.fin && fin > o.inicio)
      if (choca) continue
      const bloqueado = bloqueadas.some((b) => inicio < b.fin && fin > b.inicio)
      if (bloqueado) continue
      slots.push({ hora_inicio: toHHMM(inicio), hora_fin: toHHMM(fin) })
    }
  }

  return slots
}

// Slots donde TODOS los profesionales activos (nutricionista + entrenador)
// están libres a la vez — para servicios "combo" que requieren a ambos.
export async function getSlotsDisponiblesCombo({
  fecha,
  duracion,
  modalidad,
}: {
  fecha: string
  duracion: number
  modalidad?: 'presencial' | 'virtual'
}): Promise<Slot[]> {
  const supabase = createClient()
  const { data: profesionales } = await supabase
    .from('profiles')
    .select('id')
    .in('rol', ['nutricionista', 'entrenador'])
    .eq('activo', true)

  if (!profesionales || profesionales.length < 2) return []

  const listas = await Promise.all(
    profesionales.map((p) =>
      getSlotsDisponibles({ profesionalId: p.id, fecha, duracion, modalidad }),
    ),
  )

  const [primera, ...resto] = listas
  return primera.filter((s) =>
    resto.every((lista) =>
      lista.some((o) => o.hora_inicio === s.hora_inicio && o.hora_fin === s.hora_fin),
    ),
  )
}

// ids de los profesionales activos que participan de un servicio combo.
export async function getProfesionalesCombo(): Promise<string[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .in('rol', ['nutricionista', 'entrenador'])
    .eq('activo', true)
  return (data ?? []).map((p) => p.id)
}
