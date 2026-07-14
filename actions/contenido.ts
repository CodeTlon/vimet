'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { optimizeImage } from '@/lib/storage/optimize-image'
import { createClient } from '@/lib/supabase/server'

export type ContenidoState = { ok?: boolean; error?: string }

const STAFF_ROLES = ['nutricionista', 'entrenador', 'admin']

// Todo el staff (no solo admin) administra el contenido del sitio: hoy los
// únicos usuarios staff son Avril y Gero, y ambos cumplen ese rol.
async function requireStaffAction() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' as const }
  const { data: profile } = await supabase.from('profiles').select('rol').eq('id', user.id).maybeSingle()
  if (!profile || !STAFF_ROLES.includes(profile.rol)) return { error: 'No autorizado' as const }
  return { user, supabase }
}

async function requireSelfOrAdmin(profileId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' as const }
  const { data: profile } = await supabase.from('profiles').select('rol').eq('id', user.id).maybeSingle()
  if (!profile) return { error: 'No autorizado' as const }
  if (!STAFF_ROLES.includes(profile.rol) && user.id !== profileId) return { error: 'No autorizado' as const }
  return { user, supabase }
}

function extractRows(formData: FormData, prefix: string, count: number, fields: string[]) {
  return Array.from({ length: count }, (_, i) => {
    const row: Record<string, string> = {}
    for (const f of fields) row[f] = String(formData.get(`${prefix}_${i + 1}_${f}`) ?? '').trim()
    return row
  })
}

// Variante sin tope fijo: el cliente renumera sus filas 1..N al agregar/quitar,
// así que alcanza con detectar el índice más alto presente en el FormData.
function extractDynamicRows(formData: FormData, prefix: string, fields: string[]) {
  const re = new RegExp(`^${prefix}_(\\d+)_`)
  let max = 0
  for (const key of formData.keys()) {
    const m = key.match(re)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return extractRows(formData, prefix, max, fields)
}

// ─────────────────────────────────────────────────────────
// Ubicación y contacto
// ─────────────────────────────────────────────────────────
const ubicacionSchema = z.object({
  direccion: z.string().min(1, 'Falta la dirección'),
  lugar: z.string().min(1, 'Falta el lugar'),
  ciudad: z.string().min(1, 'Falta la ciudad'),
  map_embed_url: z.string().url('URL de mapa inválida'),
  email_contacto: z.string().email('Email inválido'),
  whatsapp_general: z.string().url('El WhatsApp debe ser una URL wa.me'),
  instagram_handle: z.string().min(1, 'Falta el usuario de Instagram'),
  instagram_url: z.string().url('URL de Instagram inválida'),
})

export async function actualizarUbicacionAction(
  _prev: unknown,
  formData: FormData,
): Promise<ContenidoState> {
  const ctx = await requireStaffAction()
  if ('error' in ctx) return { error: ctx.error }

  const parsed = ubicacionSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const { error } = await ctx.supabase
    .from('contenido_sitio')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', 1)

  if (error) return { error: 'No se pudo guardar.' }
  revalidatePath('/')
  revalidatePath('/contacto')
  revalidatePath('/admin/contenido/ubicacion')
  return { ok: true }
}

// ─────────────────────────────────────────────────────────
// Metodología (pasos, pilares, a quién va dirigido)
// ─────────────────────────────────────────────────────────
export async function actualizarMetodologiaAction(
  _prev: unknown,
  formData: FormData,
): Promise<ContenidoState> {
  const ctx = await requireStaffAction()
  if ('error' in ctx) return { error: ctx.error }

  const pasos = extractDynamicRows(formData, 'paso', ['titulo', 'desc', 'icon'])
  const pilares = extractDynamicRows(formData, 'pilar', ['titulo', 'desc', 'icon'])
  const dirigidoA = extractDynamicRows(formData, 'dirigido', ['text', 'icon'])

  if (pasos.some((p) => !p.titulo || !p.desc) || pilares.some((p) => !p.titulo || !p.desc) || dirigidoA.some((d) => !d.text)) {
    return { error: 'Completá todos los campos.' }
  }

  const { error } = await ctx.supabase
    .from('contenido_sitio')
    .update({
      metodologia_pasos: pasos,
      metodologia_pilares: pilares,
      metodologia_dirigido_a: dirigidoA,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)

  if (error) return { error: 'No se pudo guardar.' }
  revalidatePath('/metodologia')
  revalidatePath('/admin/contenido/metodologia')
  return { ok: true }
}

// ─────────────────────────────────────────────────────────
// Servicios (CRUD completo, desactivar en vez de borrar)
// ─────────────────────────────────────────────────────────
const servicioSchema = z.object({
  nombre: z.string().min(1, 'Falta el nombre').max(120),
  descripcion: z.string().max(500).optional().or(z.literal('')),
  duracion_minutos: z.coerce.number().int().min(5).max(300),
  tipo: z.enum(['nutricion', 'entrenamiento', 'combo']),
  icono: z.string().min(1, 'Elegí un ícono'),
  profesional_id: z.string().uuid().optional().or(z.literal('')),
})

export async function crearServicioAction(
  _prev: unknown,
  formData: FormData,
): Promise<ContenidoState> {
  const ctx = await requireStaffAction()
  if ('error' in ctx) return { error: ctx.error }

  const parsed = servicioSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  const d = parsed.data

  const { error } = await ctx.supabase.from('servicios').insert({
    nombre: d.nombre,
    descripcion: d.descripcion || null,
    duracion_minutos: d.duracion_minutos,
    tipo: d.tipo,
    icono: d.icono,
    profesional_id: d.profesional_id || null,
  })

  if (error) return { error: 'No se pudo crear el servicio.' }
  revalidatePath('/servicios')
  revalidatePath('/admin/contenido/servicios')
  return { ok: true }
}

export async function actualizarServicioAction(
  _prev: unknown,
  formData: FormData,
): Promise<ContenidoState> {
  const ctx = await requireStaffAction()
  if ('error' in ctx) return { error: ctx.error }

  const id = Number(formData.get('id'))
  if (!id) return { error: 'Servicio inválido.' }

  const parsed = servicioSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  const d = parsed.data

  const { error } = await ctx.supabase
    .from('servicios')
    .update({
      nombre: d.nombre,
      descripcion: d.descripcion || null,
      duracion_minutos: d.duracion_minutos,
      tipo: d.tipo,
      icono: d.icono,
      profesional_id: d.profesional_id || null,
    })
    .eq('id', id)

  if (error) return { error: 'No se pudo guardar.' }
  revalidatePath('/servicios')
  revalidatePath('/admin/contenido/servicios')
  return { ok: true }
}

export async function toggleServicioActivoAction(formData: FormData) {
  const ctx = await requireStaffAction()
  if ('error' in ctx) return

  const id = Number(formData.get('id'))
  const activo = formData.get('activo') === 'true'
  if (!id) return

  await ctx.supabase.from('servicios').update({ activo: !activo }).eq('id', id)
  revalidatePath('/servicios')
  revalidatePath('/admin/contenido/servicios')
}

// ─────────────────────────────────────────────────────────
// Perfil público del profesional (propio, o cualquiera si admin)
// ─────────────────────────────────────────────────────────
const perfilSchema = z.object({
  profile_id: z.string().uuid(),
  titulo: z.string().max(120).optional().or(z.literal('')),
  matricula: z.string().max(60).optional().or(z.literal('')),
  bio_corta: z.string().max(300).optional().or(z.literal('')),
  bio: z.string().max(2000).optional().or(z.literal('')),
  instagram_handle: z.string().max(60).optional().or(z.literal('')),
  instagram_url: z.string().url().optional().or(z.literal('')),
  whatsapp_url: z.string().url().optional().or(z.literal('')),
  especialidades: z.string().optional().or(z.literal('')),
})

export async function actualizarPerfilPublicoAction(
  _prev: unknown,
  formData: FormData,
): Promise<ContenidoState> {
  const profileId = String(formData.get('profile_id') ?? '')
  if (!profileId) return { error: 'Perfil inválido.' }

  const ctx = await requireSelfOrAdmin(profileId)
  if ('error' in ctx) return { error: ctx.error }

  const parsed = perfilSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  const d = parsed.data

  const areasTrabajo = extractRows(formData, 'area', 4, ['icon', 'title', 'desc']).filter(
    (a) => a.title || a.desc,
  )

  let fotoUrl: string | undefined
  const file = formData.get('foto') as File | null
  if (file && file.size > 0) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return { error: 'La foto debe ser JPG, PNG o WEBP.' }
    }
    if (file.size > 5 * 1024 * 1024) return { error: 'La foto no puede superar 5 MB.' }

    const { data: prevProfile } = await ctx.supabase
      .from('profiles')
      .select('foto_url')
      .eq('id', profileId)
      .maybeSingle()

    const buf = await optimizeImage(Buffer.from(await file.arrayBuffer()))
    const path = `staff/${profileId}/${Date.now()}.webp`
    const { error: uploadError } = await ctx.supabase.storage.from('sitio').upload(path, buf, {
      contentType: 'image/webp',
      upsert: true,
    })
    if (uploadError) return { error: 'No se pudo subir la foto.' }
    fotoUrl = ctx.supabase.storage.from('sitio').getPublicUrl(path).data.publicUrl

    // Recién borramos la foto vieja después de subir la nueva con éxito, para
    // no quedarnos sin ninguna si el upload hubiera fallado.
    const prevPath = prevProfile?.foto_url?.split('/object/public/sitio/')[1]
    if (prevPath) await ctx.supabase.storage.from('sitio').remove([prevPath])
  }

  const { error } = await ctx.supabase
    .from('profiles')
    .update({
      titulo: d.titulo || null,
      matricula: d.matricula || null,
      bio_corta: d.bio_corta || null,
      bio: d.bio || null,
      instagram_handle: d.instagram_handle || null,
      instagram_url: d.instagram_url || null,
      whatsapp_url: d.whatsapp_url || null,
      especialidades: d.especialidades
        ? d.especialidades
            .split(',')
            .map((e) => e.trim())
            .filter(Boolean)
        : [],
      areas_trabajo: areasTrabajo,
      ...(fotoUrl ? { foto_url: fotoUrl } : {}),
    })
    .eq('id', profileId)

  if (error) return { error: 'No se pudo guardar.' }
  revalidatePath('/nosotros')
  revalidatePath('/')
  revalidatePath('/admin/configuracion')
  return { ok: true }
}
