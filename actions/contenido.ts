'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { contenido_sitio, profiles, servicios } from '@/db/schema'
import { esStaff, getUserAndProfile } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { optimizeImage } from '@/lib/storage/optimize-image'
import { borrarArchivos, subirArchivo, urlPublica } from '@/lib/storage/s3'

export type ContenidoState = { ok?: boolean; error?: string }

// Todo el staff (no solo admin) administra el contenido del sitio: hoy los únicos usuarios staff
// son Avril y Gero, y ambos cumplen ese rol. Reemplaza la policy `is_staff()` de servicios y
// contenido_sitio.
async function requireStaffAction() {
  const { user, profile } = await getUserAndProfile()
  if (!user) return { error: 'No autenticado' as const }
  if (!profile || !esStaff(profile.rol)) return { error: 'No autorizado' as const }
  return { user, profile }
}

// Perfil público: cada uno edita el suyo; el staff puede editar el de cualquiera (policy
// `profiles update own`: `auth.uid() = id or is_staff()`).
async function requireSelfOrStaff(profileId: string) {
  const { user, profile } = await getUserAndProfile()
  if (!user) return { error: 'No autenticado' as const }
  if (!profile) return { error: 'No autorizado' as const }
  if (!esStaff(profile.rol) && user.id !== profileId) return { error: 'No autorizado' as const }
  return { user, profile }
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

  try {
    await db
      .update(contenido_sitio)
      .set({ ...parsed.data, updated_at: new Date().toISOString() })
      .where(eq(contenido_sitio.id, 1))
  } catch (err) {
    console.error('actualizarUbicacionAction:', err)
    return { error: 'No se pudo guardar.' }
  }
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

  try {
    await db
      .update(contenido_sitio)
      .set({
        metodologia_pasos: pasos,
        metodologia_pilares: pilares,
        metodologia_dirigido_a: dirigidoA,
        updated_at: new Date().toISOString(),
      })
      .where(eq(contenido_sitio.id, 1))
  } catch (err) {
    console.error('actualizarMetodologiaAction:', err)
    return { error: 'No se pudo guardar.' }
  }
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

  try {
    await db.insert(servicios).values({
      nombre: d.nombre,
      descripcion: d.descripcion || null,
      duracion_minutos: d.duracion_minutos,
      tipo: d.tipo,
      icono: d.icono,
      profesional_id: d.profesional_id || null,
    })
  } catch (err) {
    console.error('crearServicioAction:', err)
    return { error: 'No se pudo crear el servicio.' }
  }
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

  try {
    await db
      .update(servicios)
      .set({
        nombre: d.nombre,
        descripcion: d.descripcion || null,
        duracion_minutos: d.duracion_minutos,
        tipo: d.tipo,
        icono: d.icono,
        profesional_id: d.profesional_id || null,
      })
      .where(eq(servicios.id, id))
  } catch (err) {
    console.error('actualizarServicioAction:', err)
    return { error: 'No se pudo guardar.' }
  }
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

  await db.update(servicios).set({ activo: !activo }).where(eq(servicios.id, id))
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
  telefono: z.string().max(30).optional().or(z.literal('')),
  especialidades: z.string().optional().or(z.literal('')),
})

export async function actualizarPerfilPublicoAction(
  _prev: unknown,
  formData: FormData,
): Promise<ContenidoState> {
  const profileId = String(formData.get('profile_id') ?? '')
  if (!profileId) return { error: 'Perfil inválido.' }

  const ctx = await requireSelfOrStaff(profileId)
  if ('error' in ctx) return { error: ctx.error }

  const parsed = perfilSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  const d = parsed.data

  const telefonoDigitos = (d.telefono ?? '').replace(/\D/g, '')
  if (telefonoDigitos && (telefonoDigitos.length < 8 || telefonoDigitos.length > 15)) {
    return { error: 'Teléfono inválido.' }
  }
  const whatsappUrl = telefonoDigitos ? `https://wa.me/54${telefonoDigitos}` : null

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

    const [prevProfile] = await db
      .select({ foto_url: profiles.foto_url })
      .from(profiles)
      .where(eq(profiles.id, profileId))
      .limit(1)

    const buf = await optimizeImage(Buffer.from(await file.arrayBuffer()))
    const path = `staff/${profileId}/${Date.now()}.webp`
    try {
      await subirArchivo('sitio', path, buf, 'image/webp')
    } catch (err) {
      console.error('actualizarPerfilPublicoAction (subida):', err)
      return { error: 'No se pudo subir la foto.' }
    }
    fotoUrl = urlPublica('sitio', path)

    // Recién borramos la foto vieja después de subir la nueva con éxito, para no quedarnos sin
    // ninguna si el upload hubiera fallado. Solo se borra si cuelga del prefijo de ESTE perfil.
    const idx = prevProfile?.foto_url?.indexOf(`staff/${profileId}/`) ?? -1
    if (prevProfile?.foto_url && idx >= 0) {
      await borrarArchivos('sitio', [prevProfile.foto_url.slice(idx)]).catch(() => {})
    }
  }

  try {
    await db
      .update(profiles)
      .set({
      titulo: d.titulo || null,
      matricula: d.matricula || null,
      bio_corta: d.bio_corta || null,
      bio: d.bio || null,
      instagram_handle: d.instagram_handle || null,
      instagram_url: d.instagram_url || null,
      whatsapp_url: whatsappUrl,
      especialidades: d.especialidades
        ? d.especialidades
            .split(',')
            .map((e) => e.trim())
            .filter(Boolean)
        : [],
      areas_trabajo: areasTrabajo,
      ...(fotoUrl ? { foto_url: fotoUrl } : {}),
    })
      .where(eq(profiles.id, profileId))
  } catch (err) {
    console.error('actualizarPerfilPublicoAction:', err)
    return { error: 'No se pudo guardar.' }
  }
  revalidatePath('/nosotros')
  revalidatePath('/')
  revalidatePath('/admin/configuracion')
  return { ok: true }
}
