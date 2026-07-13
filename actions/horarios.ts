'use server'

import { Resend } from 'resend'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import TurnoCanceladoEmail from '@/emails/turno-cancelado'
import { brand } from '@/lib/config/team'
import { diaSemana } from '@/lib/booking/slots'
import { formatearFechaCorta } from '@/lib/seguimiento'
import { hoyArgentina } from '@/lib/datetime'
import { requireStaff } from '@/lib/supabase/auth-helpers'
import { createClient } from '@/lib/supabase/server'

export type CanceladoInfo = {
  id: number
  pacienteNombre: string
  pacienteTelefono: string | null
  fecha: string
  horaInicio: string
  horaFin: string
  servicioNombre: string
}

export type HorarioState = { ok?: boolean; error?: string; cancelados?: CanceladoInfo[] }

const horarioSchema = z.object({
  dia_semana: z.coerce.number().int().min(0).max(6),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, 'Hora de inicio inválida'),
  hora_fin: z.string().regex(/^\d{2}:\d{2}$/, 'Hora de fin inválida'),
  modalidad: z.enum(['presencial', 'virtual', 'ambas'], { message: 'Modalidad inválida' }),
})

// El profesional administra SU propia agenda: profesional_id = usuario logueado.
export async function agregarHorarioAction(
  _prev: unknown,
  formData: FormData,
): Promise<HorarioState> {
  const { user } = await requireStaff()

  const parsed = horarioSchema.safeParse({
    dia_semana: formData.get('dia_semana'),
    hora_inicio: formData.get('hora_inicio'),
    hora_fin: formData.get('hora_fin'),
    modalidad: formData.get('modalidad'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  if (parsed.data.hora_inicio >= parsed.data.hora_fin) {
    return { error: 'La hora de inicio debe ser anterior a la de fin.' }
  }

  const supabase = createClient()

  const { data: existentes } = await supabase
    .from('horarios_disponibles')
    .select('hora_inicio, hora_fin')
    .eq('profesional_id', user.id)
    .eq('dia_semana', parsed.data.dia_semana)
    .eq('activo', true)

  const seSolapa = (existentes ?? []).some(
    (h) => parsed.data.hora_inicio < h.hora_fin.slice(0, 5) && parsed.data.hora_fin > h.hora_inicio.slice(0, 5),
  )
  if (seSolapa) {
    return { error: 'Esa franja se superpone con otra que ya tenés cargada ese día.' }
  }

  const { error } = await supabase.from('horarios_disponibles').insert({
    profesional_id: user.id,
    dia_semana: parsed.data.dia_semana,
    hora_inicio: parsed.data.hora_inicio,
    hora_fin: parsed.data.hora_fin,
    modalidad: parsed.data.modalidad,
    activo: true,
  })
  if (error) return { error: 'No se pudo agregar la franja horaria.' }

  revalidatePath('/admin/horarios')
  return { ok: true }
}

export async function eliminarHorarioAction(
  _prev: unknown,
  formData: FormData,
): Promise<HorarioState> {
  const { user } = await requireStaff()

  const id = Number(formData.get('id'))
  if (!id) return {}

  const supabase = createClient()

  const { data: horario } = await supabase
    .from('horarios_disponibles')
    .select('dia_semana, hora_inicio, hora_fin')
    .eq('id', id)
    .eq('profesional_id', user.id)
    .maybeSingle()

  // El filtro por profesional_id asegura que solo borre franjas propias.
  await supabase
    .from('horarios_disponibles')
    .delete()
    .eq('id', id)
    .eq('profesional_id', user.id)

  const cancelados = horario ? await cancelarTurnosSinHorario(supabase, user.id, horario) : []

  revalidatePath('/admin/horarios')
  revalidatePath('/admin/calendario')
  revalidatePath('/admin/dashboard')
  revalidatePath('/mis-turnos')

  return { ok: true, cancelados }
}

// Cancela los turnos futuros que quedaron sin cobertura horaria tras borrar
// una franja, y avisa por email a cada paciente afectado. Best-effort: si un
// email falla no revierte la cancelación (el turno ya no tiene horario real).
async function cancelarTurnosSinHorario(
  supabase: ReturnType<typeof createClient>,
  profesionalId: string,
  horario: { dia_semana: number; hora_inicio: string; hora_fin: string },
): Promise<CanceladoInfo[]> {
  const { data: turnos } = await supabase
    .from('turnos')
    .select('id, paciente_id, fecha, hora_inicio, hora_fin, servicios(nombre)')
    .eq('profesional_id', profesionalId)
    .in('estado', ['pendiente', 'confirmado'])
    .gte('fecha', hoyArgentina())

  const hIni = horario.hora_inicio.slice(0, 5)
  const hFin = horario.hora_fin.slice(0, 5)

  const afectados = (turnos ?? []).filter(
    (t) =>
      diaSemana(t.fecha) === horario.dia_semana &&
      t.hora_inicio.slice(0, 5) < hFin &&
      t.hora_fin.slice(0, 5) > hIni,
  )
  if (afectados.length === 0) return []

  await supabase
    .from('turnos')
    .update({ estado: 'cancelado' })
    .in('id', afectados.map((t) => t.id))

  const pacienteIds = [...new Set(afectados.map((t) => t.paciente_id))]
  const { data: pacientes } = await supabase
    .from('profiles')
    .select('id, nombre, apellido, email, telefono')
    .in('id', pacienteIds)
  const pacientesById = new Map((pacientes ?? []).map((p) => [p.id, p]))

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (apiKey && from) {
    const resend = new Resend(apiKey)
    await Promise.all(
      afectados.map(async (t) => {
        const paciente = pacientesById.get(t.paciente_id)
        if (!paciente?.email) return
        const servicioRow = Array.isArray(t.servicios) ? t.servicios[0] : t.servicios
        const servicio = (servicioRow as { nombre: string } | undefined)?.nombre ?? 'tu turno'
        try {
          await resend.emails.send({
            from: `${brand.name} <${from}>`,
            to: [paciente.email],
            subject: 'Tu turno fue cancelado — cambio en la agenda',
            react: TurnoCanceladoEmail({
              nombre: `${paciente.nombre} ${paciente.apellido}`.trim(),
              fecha: formatearFechaCorta(t.fecha),
              horaInicio: t.hora_inicio.slice(0, 5),
              horaFin: t.hora_fin.slice(0, 5),
              servicioNombre: servicio,
            }),
          })
        } catch (err) {
          // best-effort: el turno ya quedó cancelado, no revertimos por un fallo de email
          console.error(`No se pudo notificar la cancelación del turno ${t.id} a ${paciente.email}`, err)
        }
      }),
    )
  }

  return afectados.map((t) => {
    const paciente = pacientesById.get(t.paciente_id)
    const servicioRow = Array.isArray(t.servicios) ? t.servicios[0] : t.servicios
    return {
      id: t.id,
      pacienteNombre: paciente ? `${paciente.nombre} ${paciente.apellido}`.trim() : 'Paciente',
      pacienteTelefono: paciente?.telefono ?? null,
      fecha: t.fecha,
      horaInicio: t.hora_inicio.slice(0, 5),
      horaFin: t.hora_fin.slice(0, 5),
      servicioNombre: (servicioRow as { nombre: string } | undefined)?.nombre ?? 'tu turno',
    }
  })
}
