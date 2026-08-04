'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'

export type EjercicioCustomState = { ok?: boolean; error?: string }

const MAX_BYTES = 8 * 1024 * 1024

const CATEGORIAS = ['calentamiento', 'entrenamiento', 'enfriamiento', 'grupo_muscular'] as const

async function requireStaff() {
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

const crearSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(200),
  categoria: z.enum(CATEGORIAS),
  parte_cuerpo: z.string().max(60).optional().or(z.literal('')),
  instrucciones: z.string().max(1000).optional().or(z.literal('')),
})

export async function crearEjercicioCustomAction(
  _prev: unknown,
  formData: FormData,
): Promise<EjercicioCustomState> {
  const ctx = await requireStaff()
  if ('error' in ctx) return { error: ctx.error }

  const parsed = crearSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  const d = parsed.data

  const file = formData.get('gif') as File | null
  if (!file || file.size === 0) return { error: 'Generá el GIF antes de guardar.' }
  if (file.type !== 'image/gif') return { error: 'El archivo generado no es un GIF.' }
  if (file.size > MAX_BYTES) return { error: 'El GIF supera el límite de 8 MB — recortá un rango más corto.' }

  const buf = Buffer.from(await file.arrayBuffer())
  const storagePath = `custom/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.gif`

  const { error: upErr } = await ctx.supabase.storage
    .from('ejercicios-media')
    .upload(storagePath, buf, { contentType: 'image/gif', upsert: false })
  if (upErr) return { error: 'No se pudo subir el GIF.' }

  const gif_url = ctx.supabase.storage.from('ejercicios-media').getPublicUrl(storagePath).data.publicUrl

  const { error } = await ctx.supabase.from('ejercicios').insert({
    nombre: d.nombre.trim(),
    categoria: d.categoria,
    parte_cuerpo: d.parte_cuerpo?.trim() || null,
    instrucciones: d.instrucciones?.trim() || null,
    gif_url,
    origen: 'staff',
    creado_por: ctx.user.id,
  })
  if (error) {
    await ctx.supabase.storage.from('ejercicios-media').remove([storagePath])
    return { error: 'No se pudo guardar el ejercicio.' }
  }

  revalidatePath('/admin/ejercicios')
  return { ok: true }
}

export async function eliminarEjercicioCustomAction(formData: FormData) {
  const id = Number(formData.get('id'))
  if (!id) return

  const ctx = await requireStaff()
  if ('error' in ctx) return

  const { data: ejercicio } = await ctx.supabase
    .from('ejercicios')
    .select('gif_url, origen')
    .eq('id', id)
    .eq('origen', 'staff')
    .maybeSingle()
  if (!ejercicio) return

  const path = ejercicio.gif_url?.split('/ejercicios-media/')[1]
  if (path) await ctx.supabase.storage.from('ejercicios-media').remove([path])

  await ctx.supabase.from('ejercicios').delete().eq('id', id).eq('origen', 'staff')
  revalidatePath('/admin/ejercicios')
}
