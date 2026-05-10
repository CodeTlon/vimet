'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

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

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Tenés que iniciar sesión.' }

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
  redirect('/mis-turnos?nuevo=1')
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

  const { error } = await supabase
    .from('turnos')
    .update({
      estado: parsed.data.estado,
      notas_profesional: parsed.data.notas_profesional || null,
    })
    .eq('id', parsed.data.id)

  if (error) return { error: 'No pudimos actualizar el turno.' }

  revalidatePath('/admin/calendario')
  revalidatePath('/admin/dashboard')
  revalidatePath(`/admin/turno/${parsed.data.id}`)
  return { ok: true }
}
