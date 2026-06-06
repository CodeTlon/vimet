'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireStaff } from '@/lib/supabase/auth-helpers'
import { createClient } from '@/lib/supabase/server'

export type HorarioState = { ok?: boolean; error?: string }

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

export async function eliminarHorarioAction(formData: FormData): Promise<void> {
  const { user } = await requireStaff()

  const id = Number(formData.get('id'))
  if (!id) return

  const supabase = createClient()
  // El filtro por profesional_id asegura que solo borre franjas propias.
  await supabase
    .from('horarios_disponibles')
    .delete()
    .eq('id', id)
    .eq('profesional_id', user.id)

  revalidatePath('/admin/horarios')
}
