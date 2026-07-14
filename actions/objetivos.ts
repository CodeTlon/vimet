'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { hoyArgentina } from '@/lib/datetime'

export type ObjetivoState = { ok?: boolean; error?: string }

const schema = z.object({
  paciente_id: z.string().uuid(),
  categoria: z.enum(['nutricional', 'antropometrico', 'clinico', 'entrenamiento', 'rendimiento']),
  descripcion: z.string().min(1, 'Escribí el objetivo').max(500),
  estado: z.enum(['pendiente', 'en_progreso', 'cumplido', 'descartado']).default('pendiente'),
  fecha_objetivo: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || v >= hoyArgentina(), 'La fecha objetivo no puede ser pasada'),
})

async function getStaff() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' as const }
  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile || !['nutricionista', 'entrenador', 'admin'].includes(profile.rol)) {
    return { error: 'No autorizado' as const }
  }
  return { user, supabase }
}

export async function crearObjetivoAction(
  _prev: unknown,
  formData: FormData,
): Promise<ObjetivoState> {
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const ctx = await getStaff()
  if ('error' in ctx) return { error: ctx.error }

  const d = parsed.data
  const { error } = await ctx.supabase.from('objetivos').insert({
    paciente_id: d.paciente_id,
    categoria: d.categoria,
    descripcion: d.descripcion,
    estado: d.estado,
    fecha_objetivo: d.fecha_objetivo && d.fecha_objetivo !== '' ? d.fecha_objetivo : null,
    registrado_por: ctx.user.id,
  })

  if (error) return { error: 'No se pudo crear el objetivo.' }

  revalidatePath(`/admin/pacientes/${d.paciente_id}/objetivos`)
  revalidatePath('/mis-objetivos')
  return { ok: true }
}

const cambioEstadoSchema = z.object({
  id: z.coerce.number().int().positive(),
  paciente_id: z.string().uuid(),
  estado: z.enum(['pendiente', 'en_progreso', 'cumplido', 'descartado']),
})

export async function cambiarEstadoObjetivoAction(formData: FormData) {
  const parsed = cambioEstadoSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return
  const ctx = await getStaff()
  if ('error' in ctx) return
  await ctx.supabase
    .from('objetivos')
    .update({ estado: parsed.data.estado })
    .eq('id', parsed.data.id)
  revalidatePath(`/admin/pacientes/${parsed.data.paciente_id}/objetivos`)
  revalidatePath('/mis-objetivos')
}

export async function eliminarObjetivoAction(formData: FormData) {
  const id = Number(formData.get('id'))
  const paciente_id = String(formData.get('paciente_id') ?? '')
  if (!id) return
  const ctx = await getStaff()
  if ('error' in ctx) return
  await ctx.supabase.from('objetivos').delete().eq('id', id)
  revalidatePath(`/admin/pacientes/${paciente_id}/objetivos`)
  revalidatePath('/mis-objetivos')
}
