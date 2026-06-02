'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'

export type RecursoState = { ok?: boolean; error?: string }

const ALLOWED_MIME = {
  pdf:    ['application/pdf'],
  imagen: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  video:  ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
} as const

const MAX_BYTES = {
  pdf:    20 * 1024 * 1024,
  imagen: 10 * 1024 * 1024,
  video: 100 * 1024 * 1024,
} as const

async function requireStaff() {
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

const commonFields = {
  paciente_id:      z.string().uuid(),
  categoria:        z.enum(['ejercicio', 'nutricion', 'progreso', 'educativo', 'otro']),
  titulo:           z.string().min(1, 'El título es requerido').max(200),
  descripcion:      z.string().max(1000).optional().or(z.literal('')),
  visible_paciente: z.string().transform((v) => v === 'true'),
  plan_id:          z.string().optional().or(z.literal('')),
}

const linkSchema = z.object({
  ...commonFields,
  tipo: z.literal('link'),
  url:  z.string().url('Ingresá una URL válida'),
})

const fileSchema = z.object({
  ...commonFields,
  tipo: z.enum(['pdf', 'imagen', 'video']),
})

export async function crearRecursoAction(
  _prev: unknown,
  formData: FormData,
): Promise<RecursoState> {
  const ctx = await requireStaff()
  if ('error' in ctx) return { error: ctx.error }

  const tipo       = formData.get('tipo') as string
  const paciente_id = formData.get('paciente_id') as string
  const plan_id_raw = (formData.get('plan_id') as string | null) ?? ''

  if (tipo === 'link') {
    const parsed = linkSchema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
    const d = parsed.data

    const { error } = await ctx.supabase.from('recursos_paciente').insert({
      paciente_id:      d.paciente_id,
      tipo:             'link',
      categoria:        d.categoria,
      titulo:           d.titulo.trim(),
      descripcion:      d.descripcion?.trim() || null,
      url:              d.url,
      visible_paciente: d.visible_paciente,
      plan_id:          plan_id_raw ? (Number(plan_id_raw) || null) : null,
      creado_por:       ctx.user.id,
    })
    if (error) return { error: 'No se pudo guardar el recurso.' }
  } else {
    const parsed = fileSchema.safeParse(Object.fromEntries(formData))
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
    const d = parsed.data

    const file = formData.get('archivo') as File | null
    if (!file || file.size === 0) return { error: 'Seleccioná un archivo.' }

    const t = d.tipo as 'pdf' | 'imagen' | 'video'
    if (!(ALLOWED_MIME[t] as readonly string[]).includes(file.type)) {
      return { error: `Tipo de archivo no permitido para ${d.tipo}.` }
    }
    if (file.size > MAX_BYTES[t]) {
      return { error: `El archivo supera el límite de ${MAX_BYTES[t] / 1024 / 1024} MB.` }
    }

    const safeName    = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storage_path = `${d.paciente_id}/r/${Date.now()}_${safeName}`
    const buf         = Buffer.from(await file.arrayBuffer())

    const { error: upErr } = await ctx.supabase.storage
      .from('recursos')
      .upload(storage_path, buf, { contentType: file.type, upsert: false })
    if (upErr) return { error: 'No se pudo subir el archivo.' }

    const { error } = await ctx.supabase.from('recursos_paciente').insert({
      paciente_id:      d.paciente_id,
      tipo:             d.tipo,
      categoria:        d.categoria,
      titulo:           d.titulo.trim(),
      descripcion:      d.descripcion?.trim() || null,
      storage_path,
      visible_paciente: d.visible_paciente,
      plan_id:          plan_id_raw ? (Number(plan_id_raw) || null) : null,
      creado_por:       ctx.user.id,
    })
    if (error) {
      await ctx.supabase.storage.from('recursos').remove([storage_path])
      return { error: 'No se pudo guardar el recurso.' }
    }
  }

  revalidatePath(`/admin/pacientes/${paciente_id}/recursos`)
  revalidatePath('/mis-recursos')
  return { ok: true }
}

export async function eliminarRecursoAction(formData: FormData) {
  const id          = Number(formData.get('id'))
  const paciente_id = String(formData.get('paciente_id') ?? '')
  if (!id) return

  const ctx = await requireStaff()
  if ('error' in ctx) return

  const { data: recurso } = await ctx.supabase
    .from('recursos_paciente')
    .select('storage_path')
    .eq('id', id)
    .maybeSingle()

  if (recurso?.storage_path) {
    await ctx.supabase.storage.from('recursos').remove([recurso.storage_path])
  }

  await ctx.supabase.from('recursos_paciente').delete().eq('id', id)
  revalidatePath(`/admin/pacientes/${paciente_id}/recursos`)
  revalidatePath('/mis-recursos')
}

const toggleSchema = z.object({
  id:               z.coerce.number().int().positive(),
  paciente_id:      z.string().uuid(),
  visible_paciente: z.enum(['true', 'false']),
})

export async function toggleVisibilidadRecursoAction(formData: FormData) {
  const parsed = toggleSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return

  const ctx = await requireStaff()
  if ('error' in ctx) return

  await ctx.supabase
    .from('recursos_paciente')
    .update({ visible_paciente: parsed.data.visible_paciente === 'true' })
    .eq('id', parsed.data.id)

  revalidatePath(`/admin/pacientes/${parsed.data.paciente_id}/recursos`)
  revalidatePath('/mis-recursos')
}
