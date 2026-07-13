'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { diaSemana } from '@/lib/booking/slots'
import { hoyArgentina } from '@/lib/datetime'
import { createClient } from '@/lib/supabase/server'

export type TurnoState = { ok?: boolean; error?: string }

const crearSchema = z.object({
  profesional_id: z.string().uuid('Profesional inválido'),
  servicio_id: z.string().min(1, 'Servicio inválido'),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
  hora_fin: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
  modalidad: z.enum(['presencial', 'virtual']),
  notas: z.string().max(500).optional().default(''),
})

export async function crearTurnoAction(
  _prev: unknown,
  formData: FormData,
): Promise<TurnoState> {
  const parsed = crearSchema.safeParse({
    profesional_id: formData.get('profesional_id'),
    servicio_id: formData.get('servicio_id'),
    fecha: formData.get('fecha'),
    hora_inicio: formData.get('hora_inicio'),
    hora_fin: formData.get('hora_fin'),
    modalidad: formData.get('modalidad') ?? 'presencial',
    notas: formData.get('notas') ?? '',
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }

  if (parsed.data.fecha < hoyArgentina()) {
    return { error: 'No podés reservar un turno en una fecha pasada.' }
  }
  if (parsed.data.hora_fin <= parsed.data.hora_inicio) {
    return { error: 'El horario del turno es inválido.' }
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Tenés que iniciar sesión.' }

  // Revalidar que algún horario del profesional cubra ese día/franja con la
  // modalidad elegida (el cliente ya filtra los slots, pero no confiamos en eso).
  const { data: horariosCompatibles } = await supabase
    .from('horarios_disponibles')
    .select('id')
    .eq('profesional_id', parsed.data.profesional_id)
    .eq('dia_semana', diaSemana(parsed.data.fecha))
    .eq('activo', true)
    .in('modalidad', [parsed.data.modalidad, 'ambas'])
    .lte('hora_inicio', parsed.data.hora_inicio)
    .gte('hora_fin', parsed.data.hora_fin)
    .limit(1)

  if (!horariosCompatibles?.length) {
    return { error: 'Esa modalidad no está disponible para el horario elegido.' }
  }

  // Reverificar disponibilidad: que no exista turno superpuesto del profesional
  const { data: choques } = await supabase
    .from('turnos')
    .select('id')
    .eq('profesional_id', parsed.data.profesional_id)
    .eq('fecha', parsed.data.fecha)
    .in('estado', ['pendiente', 'confirmado'])
    .lt('hora_inicio', parsed.data.hora_fin)
    .gt('hora_fin', parsed.data.hora_inicio)
    .limit(1)

  if (choques?.length) {
    return { error: 'Ese horario ya no está disponible.' }
  }

  const { error } = await supabase.from('turnos').insert({
    paciente_id: user.id,
    profesional_id: parsed.data.profesional_id,
    servicio_id: Number(parsed.data.servicio_id),
    fecha: parsed.data.fecha,
    hora_inicio: parsed.data.hora_inicio,
    hora_fin: parsed.data.hora_fin,
    modalidad: parsed.data.modalidad,
    estado: 'pendiente',
    notas_paciente: parsed.data.notas || null,
  })

  if (error) {
    return { error: 'No pudimos reservar el turno. Probá nuevamente.' }
  }

  revalidatePath('/mis-turnos')
  return { ok: true }
}

export async function cancelarTurnoAction(formData: FormData) {
  const id = Number(formData.get('id'))
  if (!id) return

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('turnos')
    .update({ estado: 'cancelado' })
    .eq('id', id)
    .eq('paciente_id', user.id)
    .in('estado', ['pendiente', 'confirmado'])
    .gte('fecha', hoyArgentina())

  revalidatePath('/mis-turnos')
}

const adminEstadoSchema = z.object({
  id: z.coerce.number().int().positive(),
  estado: z.enum(['pendiente', 'confirmado', 'cancelado', 'completado', 'no_asistio']),
  notas_profesional: z.string().max(2000).optional().default(''),
})

export async function actualizarTurnoStaffAction(
  _prev: unknown,
  formData: FormData,
): Promise<TurnoState> {
  const parsed = adminEstadoSchema.safeParse({
    id: formData.get('id'),
    estado: formData.get('estado'),
    notas_profesional: formData.get('notas_profesional') ?? '',
  })
  if (!parsed.success) return { error: 'Datos inválidos' }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile || !['nutricionista', 'entrenador', 'admin'].includes(profile.rol)) {
    return { error: 'No autorizado' }
  }

  const { data: actual } = await supabase
    .from('turnos')
    .select('estado')
    .eq('id', parsed.data.id)
    .maybeSingle()
  if (!actual || !['pendiente', 'confirmado'].includes(actual.estado)) {
    return { error: 'Este turno ya está cerrado y no puede modificarse.' }
  }

  const { data: actualizado, error } = await supabase
    .from('turnos')
    .update({
      estado: parsed.data.estado,
      notas_profesional: parsed.data.notas_profesional || null,
    })
    .eq('id', parsed.data.id)
    .select('id')

  if (error) return { error: 'No pudimos actualizar el turno.' }
  if (!actualizado?.length) {
    return { error: 'No tenés permiso para modificar este turno.' }
  }

  revalidatePath('/admin/calendario')
  revalidatePath('/admin/dashboard')
  revalidatePath(`/admin/turno/${parsed.data.id}`)
  return { ok: true }
}
