import { hoyArgentina, horaArgentina } from '@/lib/datetime'
import { createClient } from '@/lib/supabase/server'

export type Slot = { hora_inicio: string; hora_fin: string }

const SLOT_STEP_MINUTES = 30

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
}: {
  profesionalId: string
  fecha: string
  duracion: number
}): Promise<Slot[]> {
  if (!profesionalId || !fecha || !duracion) return []

  const supabase = createClient()
  const dia = diaSemana(fecha)

  const [{ data: horarios }, { data: turnos }, { data: bloqueos }] = await Promise.all([
    supabase
      .from('horarios_disponibles')
      .select('hora_inicio, hora_fin')
      .eq('profesional_id', profesionalId)
      .eq('dia_semana', dia)
      .eq('activo', true),
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
      .lte('fecha_inicio', `${fecha}T23:59:59Z`)
      .gte('fecha_fin', `${fecha}T00:00:00Z`),
  ])

  if (!horarios?.length) return []

  const ocupadas = (turnos ?? []).map((t) => ({
    inicio: toMinutes(t.hora_inicio.slice(0, 5)),
    fin: toMinutes(t.hora_fin.slice(0, 5)),
  }))

  const dayStart = new Date(`${fecha}T00:00:00Z`).getTime()
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
