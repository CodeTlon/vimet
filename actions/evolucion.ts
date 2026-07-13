'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'

export type EvolucionState = { ok?: boolean; error?: string }

const schema = z.object({
  paciente_id: z.string().uuid(),
  origen: z.enum(['nutricion', 'entrenamiento']),
  tipo: z.enum(['evolucion', 'observacion']),
  contenido: z.string().min(1, 'Escribí algo').max(4000),
  visible_paciente: z.enum(['true', 'false']).default('false'),
})

async function getStaff() {
  const supabase = createClient()
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

export async function crearEntradaEvolucionAction(
  _prev: unknown,
  formData: FormData,
): Promise<EvolucionState> {
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const ctx = await getStaff()
  if ('error' in ctx) return { error: ctx.error }

  const d = parsed.data
  const { error } = await ctx.supabase.from('evolucion_entradas').insert({
    paciente_id: d.paciente_id,
    origen: d.origen,
    tipo: d.tipo,
    contenido: d.contenido,
    visible_paciente: d.visible_paciente === 'true',
    registrado_por: ctx.user.id,
  })

  if (error) return { error: 'No se pudo guardar la entrada.' }

  revalidatePath(`/admin/pacientes/${d.paciente_id}/evolucion`)
  revalidatePath('/mi-progreso')
  return { ok: true }
}

const updateSchema = schema.extend({ id: z.coerce.number().int().positive() })

export async function actualizarEntradaEvolucionAction(
  _prev: unknown,
  formData: FormData,
): Promise<EvolucionState> {
  const parsed = updateSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const ctx = await getStaff()
  if ('error' in ctx) return { error: ctx.error }

  const d = parsed.data
  const { error } = await ctx.supabase
    .from('evolucion_entradas')
    .update({
      origen: d.origen,
      tipo: d.tipo,
      contenido: d.contenido,
      visible_paciente: d.visible_paciente === 'true',
    })
    .eq('id', d.id)

  if (error) return { error: 'No se pudo actualizar la entrada.' }

  revalidatePath(`/admin/pacientes/${d.paciente_id}/evolucion`)
  revalidatePath('/mi-progreso')
  return { ok: true }
}

export async function eliminarEntradaEvolucionAction(formData: FormData) {
  const id = Number(formData.get('id'))
  const paciente_id = String(formData.get('paciente_id') ?? '')
  if (!id) return
  const ctx = await getStaff()
  if ('error' in ctx) return
  await ctx.supabase.from('evolucion_entradas').delete().eq('id', id)
  revalidatePath(`/admin/pacientes/${paciente_id}/evolucion`)
}
