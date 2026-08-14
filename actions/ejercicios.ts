'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { pareceUnGif } from '@/lib/file-sniff'
import { createClient } from '@/lib/supabase/server'
import { extraerYoutubeId } from '@/lib/youtube'

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

  // ponytail: dedup simple por nombre (case-insensitive). No chequea hash de
  // archivo — si hace falta detectar el mismo video con nombre distinto, sumarlo.
  const { data: existente } = await ctx.supabase
    .from('ejercicios')
    .select('id')
    .ilike('nombre', d.nombre.trim())
    .maybeSingle()
  if (existente) return { error: 'Ya existe un ejercicio con ese nombre.' }

  // Alternativa al GIF: un link de YouTube pegado por el staff. Se guarda
  // uno de los dos medios, nunca los dos (constraint `ejercicios_media_check`
  // en la migración 0030 blinda esto también a nivel DB).
  const youtubeUrlRaw = String(formData.get('youtube_url') ?? '').trim()

  let gif_url: string | null = null
  let youtube_url: string | null = null
  let storagePath: string | null = null

  if (youtubeUrlRaw) {
    if (!extraerYoutubeId(youtubeUrlRaw)) return { error: 'Link de YouTube inválido.' }
    youtube_url = youtubeUrlRaw
  } else {
    const file = formData.get('gif') as File | null
    if (!file || file.size === 0) return { error: 'Generá el GIF antes de guardar.' }
    if (file.type !== 'image/gif') return { error: 'El archivo generado no es un GIF.' }
    if (file.size > MAX_BYTES) return { error: 'El GIF supera el límite de 8 MB — recortá un rango más corto.' }

    const buf = Buffer.from(await file.arrayBuffer())
    if (!pareceUnGif(buf)) return { error: 'El archivo generado no es un GIF.' }
    storagePath = `custom/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.gif`

    const { error: upErr } = await ctx.supabase.storage
      .from('ejercicios-media')
      .upload(storagePath, buf, { contentType: 'image/gif', upsert: false })
    if (upErr) return { error: 'No se pudo subir el GIF.' }

    gif_url = ctx.supabase.storage.from('ejercicios-media').getPublicUrl(storagePath).data.publicUrl
  }

  const { error } = await ctx.supabase.from('ejercicios').insert({
    nombre: d.nombre.trim(),
    categoria: d.categoria,
    parte_cuerpo: d.parte_cuerpo?.trim() || null,
    instrucciones: d.instrucciones?.trim() || null,
    gif_url,
    youtube_url,
    origen: 'staff',
    creado_por: ctx.user.id,
  })
  if (error) {
    if (storagePath) await ctx.supabase.storage.from('ejercicios-media').remove([storagePath])
    return { error: 'No se pudo guardar el ejercicio.' }
  }

  revalidatePath('/admin/ejercicios')
  return { ok: true }
}

export async function eliminarEjercicioCustomAction(
  _prev: unknown,
  formData: FormData,
): Promise<EjercicioCustomState> {
  const id = Number(formData.get('id'))
  if (!id) return { error: 'Datos inválidos' }

  const ctx = await requireStaff()
  if ('error' in ctx) return { error: ctx.error }

  const { data: ejercicio } = await ctx.supabase
    .from('ejercicios')
    .select('gif_url, origen')
    .eq('id', id)
    .eq('origen', 'staff')
    .maybeSingle()
  if (!ejercicio) return { error: 'Ejercicio no encontrado.' }

  // Borrar primero la fila: si la FK `plan_ejercicios.ejercicio_id` (on delete
  // restrict) rechaza el delete porque el ejercicio está en uso, el GIF del
  // storage queda intacto (antes se borraba el storage primero y quedaba huérfano).
  const { error } = await ctx.supabase.from('ejercicios').delete().eq('id', id).eq('origen', 'staff')
  if (error) {
    if (error.code === '23503') {
      return { error: 'No se puede borrar: este ejercicio está siendo usado en un plan. Quitalo del plan primero.' }
    }
    return { error: 'No se pudo eliminar el ejercicio.' }
  }

  const path = ejercicio.gif_url?.split('/ejercicios-media/')[1]
  if (path) await ctx.supabase.storage.from('ejercicios-media').remove([path])

  revalidatePath('/admin/ejercicios')
  return { ok: true }
}
