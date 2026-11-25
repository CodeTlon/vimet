'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireStaff } from '@/lib/auth/session'
import {
  actualizarFranja,
  agregarFranja,
  cancelarYNotificar,
  eliminarFranja,
  franjaPropia,
  franjaSeSolapa,
  turnosSinCobertura,
  type CanceladoInfo,
  type HorarioState,
} from '@/lib/services/horarios'

export type { CanceladoInfo, HorarioState }

const horarioSchema = z.object({
  dia_semana: z.coerce.number().int().min(0).max(6),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, 'Hora de inicio inválida'),
  hora_fin: z.string().regex(/^\d{2}:\d{2}$/, 'Hora de fin inválida'),
  modalidad: z.enum(['presencial', 'virtual', 'ambas'], { message: 'Modalidad inválida' }),
})

const horarioUpdateSchema = horarioSchema.extend({
  id: z.coerce.number().int().positive(),
})

function revalidarAgenda() {
  revalidatePath('/admin/horarios')
  revalidatePath('/admin/calendario')
  revalidatePath('/admin/dashboard')
  revalidatePath('/mis-turnos')
}

// El profesional administra SU propia agenda: profesional_id = usuario logueado, siempre.
export async function agregarHorarioAction(_prev: unknown, formData: FormData): Promise<HorarioState> {
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
  if (await franjaSeSolapa(user.id, parsed.data)) {
    return { error: 'Esa franja se superpone con otra que ya tenés cargada ese día.' }
  }

  try {
    await agregarFranja(user.id, parsed.data)
  } catch (err) {
    console.error('agregarHorarioAction:', err)
    return { error: 'No se pudo agregar la franja horaria.' }
  }

  revalidatePath('/admin/horarios')
  return { ok: true }
}

export async function eliminarHorarioAction(_prev: unknown, formData: FormData): Promise<HorarioState> {
  const { user } = await requireStaff()

  const id = Number(formData.get('id'))
  if (!id) return {}

  // franjaPropia asegura que solo se borre una franja del propio profesional.
  const horario = await franjaPropia(user.id, id)
  await eliminarFranja(user.id, id)

  const afectados = horario ? await turnosSinCobertura(user.id, [horario.dia_semana]) : []
  const cancelados = await cancelarYNotificar(afectados)

  revalidarAgenda()
  return { ok: true, cancelados }
}

export async function actualizarHorarioAction(_prev: unknown, formData: FormData): Promise<HorarioState> {
  const { user } = await requireStaff()

  const parsed = horarioUpdateSchema.safeParse({
    id: formData.get('id'),
    dia_semana: formData.get('dia_semana'),
    hora_inicio: formData.get('hora_inicio'),
    hora_fin: formData.get('hora_fin'),
    modalidad: formData.get('modalidad'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  if (parsed.data.hora_inicio >= parsed.data.hora_fin) {
    return { error: 'La hora de inicio debe ser anterior a la de fin.' }
  }

  const actual = await franjaPropia(user.id, parsed.data.id)
  if (!actual) return { error: 'Franja no encontrada.' }

  if (await franjaSeSolapa(user.id, parsed.data, parsed.data.id)) {
    return { error: 'Esa franja se superpone con otra que ya tenés cargada ese día.' }
  }

  const { id, ...franja } = parsed.data
  try {
    await actualizarFranja(user.id, id, franja)
  } catch (err) {
    console.error('actualizarHorarioAction:', err)
    return { error: 'No se pudo guardar la franja horaria.' }
  }

  const dias = [...new Set([actual.dia_semana, parsed.data.dia_semana])]
  const afectados = await turnosSinCobertura(user.id, dias)
  const cancelados = await cancelarYNotificar(afectados)

  revalidarAgenda()
  return { ok: true, cancelados }
}
