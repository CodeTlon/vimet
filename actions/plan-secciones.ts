'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { TIPO_SECCION_PLAN_LABEL } from '@/lib/seguimiento'
import { optimizeImage } from '@/lib/storage/optimize-image'
import { createClient } from '@/lib/supabase/server'

export type SeccionState = { ok?: boolean; error?: string }

type SupabaseServer = Awaited<ReturnType<typeof createClient>>

const ALLOWED_IMAGEN_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_IMAGEN_BYTES = 10 * 1024 * 1024

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

const baseSchema = z.object({
  plan_id: z.coerce.number().int().positive(),
  paciente_id: z.string().uuid(),
  // 'pautas_generales' no es un tipo elegible acá: sigue siendo el bloque
  // fijo de siempre en `planes` (actions/planes.ts), no una sección modular.
  // 'imagenes' tampoco: retirado en favor de 'recomendaciones'.
  tipo: z.enum(['receta', 'comidas_dia', 'recomendaciones']),
  titulo: z.string().max(200).optional().or(z.literal('')),
})

function revalidar(pacienteId: string, planId: number) {
  revalidatePath(`/admin/pacientes/${pacienteId}/planes/${planId}`)
  revalidatePath(`/mis-planes/${planId}`)
}

function validarImagenes(files: File[]): { error?: string } {
  for (const f of files) {
    if (!ALLOWED_IMAGEN_MIME.includes(f.type)) return { error: 'Tipo de imagen no permitido.' }
    if (f.size > MAX_IMAGEN_BYTES) return { error: 'Cada imagen debe pesar menos de 10MB.' }
  }
  return {}
}

// Sube y guarda imágenes ya validadas — usado tanto al crear como al agregar
// imágenes nuevas a una sección existente (ordenInicial = cantidad ya guardada).
async function subirImagenes(
  supabase: SupabaseServer,
  files: File[],
  pacienteId: string,
  seccionId: number,
  ordenInicial: number,
): Promise<{ error?: string }> {
  let orden = ordenInicial
  for (const file of files) {
    const buf = await optimizeImage(Buffer.from(await file.arrayBuffer()))
    const storage_path = `${pacienteId}/secciones/${seccionId}/${Date.now()}_${orden}.webp`
    const { error: upErr } = await supabase.storage
      .from('planes')
      .upload(storage_path, buf, { contentType: 'image/webp', upsert: false })
    if (upErr) return { error: 'No se pudo subir una de las imágenes.' }

    const { error } = await supabase
      .from('plan_seccion_imagenes')
      .insert({ seccion_id: seccionId, storage_path, orden })
    if (error) return { error: 'No se pudo guardar una de las imágenes.' }
    orden += 1
  }
  return {}
}

function leerMomentos(formData: FormData) {
  const nombres = formData.getAll('momento_nombre').map(String)
  const contenidos = formData.getAll('momento_contenido').map(String)
  return nombres
    .map((nombre, i) => ({ nombre_momento: nombre.trim(), contenido: (contenidos[i] ?? '').trim() }))
    .filter((m) => m.nombre_momento && m.contenido)
}

export async function crearSeccionAction(_prev: unknown, formData: FormData): Promise<SeccionState> {
  const parsed = baseSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const ctx = await requireStaff()
  if ('error' in ctx) return { error: ctx.error }

  const { plan_id, paciente_id, tipo } = parsed.data
  const titulo = parsed.data.titulo?.trim() || TIPO_SECCION_PLAN_LABEL[tipo]
  const imagenes = (formData.getAll('imagenes') as File[]).filter((f) => f.size > 0)

  const imgCheck = validarImagenes(imagenes)
  if (imgCheck.error) return imgCheck

  let contenido: string | null = null
  let momentos: { nombre_momento: string; contenido: string }[] = []

  if (tipo === 'receta' || tipo === 'recomendaciones') {
    contenido = String(formData.get('contenido') ?? '').trim()
    if (!contenido) return { error: 'Escribí el contenido de la sección.' }
  } else if (tipo === 'comidas_dia') {
    momentos = leerMomentos(formData)
    if (momentos.length === 0) return { error: 'Agregá al menos un momento del día con su contenido.' }
  }

  const { data: max } = await ctx.supabase
    .from('plan_secciones')
    .select('orden')
    .eq('plan_id', plan_id)
    .order('orden', { ascending: false })
    .limit(1)
    .maybeSingle()
  const orden = (max?.orden ?? -1) + 1

  const { data: seccion, error } = await ctx.supabase
    .from('plan_secciones')
    .insert({ plan_id, tipo, titulo, contenido, orden })
    .select('id')
    .single()
  if (error || !seccion) return { error: 'No se pudo crear la sección.' }

  if (tipo === 'comidas_dia' && momentos.length > 0) {
    const { error: momErr } = await ctx.supabase
      .from('plan_seccion_comidas')
      .insert(momentos.map((m, i) => ({ seccion_id: seccion.id, ...m, orden: i })))
    if (momErr) return { error: 'La sección se creó pero no se pudieron guardar los momentos.' }
  }

  if (imagenes.length > 0) {
    const imgErr = await subirImagenes(ctx.supabase, imagenes, paciente_id, seccion.id, 0)
    if (imgErr.error) return imgErr
  }

  revalidar(paciente_id, plan_id)
  return { ok: true }
}

const updateSchema = baseSchema.extend({ id: z.coerce.number().int().positive() })

export async function actualizarSeccionAction(_prev: unknown, formData: FormData): Promise<SeccionState> {
  const parsed = updateSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const ctx = await requireStaff()
  if ('error' in ctx) return { error: ctx.error }

  const { id, plan_id, paciente_id, tipo } = parsed.data
  const titulo = parsed.data.titulo?.trim() || TIPO_SECCION_PLAN_LABEL[tipo]
  const imagenes = (formData.getAll('imagenes') as File[]).filter((f) => f.size > 0)

  const imgCheck = validarImagenes(imagenes)
  if (imgCheck.error) return imgCheck

  let contenido: string | null = null
  let momentos: { nombre_momento: string; contenido: string }[] = []

  if (tipo === 'receta' || tipo === 'recomendaciones') {
    contenido = String(formData.get('contenido') ?? '').trim()
    if (!contenido) return { error: 'Escribí el contenido de la sección.' }
  } else if (tipo === 'comidas_dia') {
    momentos = leerMomentos(formData)
    if (momentos.length === 0) return { error: 'Agregá al menos un momento del día con su contenido.' }
  }

  const { error } = await ctx.supabase.from('plan_secciones').update({ titulo, contenido }).eq('id', id)
  if (error) return { error: 'No se pudo actualizar la sección.' }

  if (tipo === 'comidas_dia') {
    await ctx.supabase.from('plan_seccion_comidas').delete().eq('seccion_id', id)
    const { error: momErr } = await ctx.supabase
      .from('plan_seccion_comidas')
      .insert(momentos.map((m, i) => ({ seccion_id: id, ...m, orden: i })))
    if (momErr) return { error: 'No se pudieron guardar los momentos.' }
  }

  if (imagenes.length > 0) {
    const { count } = await ctx.supabase
      .from('plan_seccion_imagenes')
      .select('id', { count: 'exact', head: true })
      .eq('seccion_id', id)
    const imgErr = await subirImagenes(ctx.supabase, imagenes, paciente_id, id, count ?? 0)
    if (imgErr.error) return imgErr
  }

  revalidar(paciente_id, plan_id)
  return { ok: true }
}

export async function eliminarSeccionAction(formData: FormData) {
  const id = Number(formData.get('id'))
  const plan_id = Number(formData.get('plan_id'))
  const paciente_id = String(formData.get('paciente_id') ?? '')
  if (!id || !plan_id) return

  const ctx = await requireStaff()
  if ('error' in ctx) return

  const { data: imagenes } = await ctx.supabase
    .from('plan_seccion_imagenes')
    .select('storage_path')
    .eq('seccion_id', id)
  if (imagenes && imagenes.length > 0) {
    await ctx.supabase.storage.from('planes').remove(imagenes.map((i) => i.storage_path))
  }

  await ctx.supabase.from('plan_secciones').delete().eq('id', id)
  revalidar(paciente_id, plan_id)
}

export async function eliminarImagenSeccionAction(formData: FormData) {
  const id = Number(formData.get('id'))
  const plan_id = Number(formData.get('plan_id'))
  const paciente_id = String(formData.get('paciente_id') ?? '')
  if (!id || !plan_id) return

  const ctx = await requireStaff()
  if ('error' in ctx) return

  const { data: imagen } = await ctx.supabase
    .from('plan_seccion_imagenes')
    .select('storage_path')
    .eq('id', id)
    .maybeSingle()
  if (imagen?.storage_path) {
    await ctx.supabase.storage.from('planes').remove([imagen.storage_path])
  }
  await ctx.supabase.from('plan_seccion_imagenes').delete().eq('id', id)
  revalidar(paciente_id, plan_id)
}

export async function moverSeccionAction(formData: FormData) {
  const id = Number(formData.get('id'))
  const plan_id = Number(formData.get('plan_id'))
  const paciente_id = String(formData.get('paciente_id') ?? '')
  const direccion = String(formData.get('direccion') ?? '')
  if (!id || !plan_id || (direccion !== 'subir' && direccion !== 'bajar')) return

  const ctx = await requireStaff()
  if ('error' in ctx) return

  const { data: secciones } = await ctx.supabase
    .from('plan_secciones')
    .select('id, orden')
    .eq('plan_id', plan_id)
    .order('orden', { ascending: true })
  if (!secciones) return

  const idx = secciones.findIndex((s) => s.id === id)
  const vecinoIdx = direccion === 'subir' ? idx - 1 : idx + 1
  if (idx === -1 || vecinoIdx < 0 || vecinoIdx >= secciones.length) return

  const actual = secciones[idx]
  const vecino = secciones[vecinoIdx]

  await ctx.supabase.from('plan_secciones').update({ orden: vecino.orden }).eq('id', actual.id)
  await ctx.supabase.from('plan_secciones').update({ orden: actual.orden }).eq('id', vecino.id)

  revalidar(paciente_id, plan_id)
}
