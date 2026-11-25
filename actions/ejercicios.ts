'use server'

import { and, eq, ilike } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { ejercicios } from '@/db/schema'
import { esStaff, getUserAndProfile } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { PG, pgCode } from '@/lib/db-errors'
import { pareceUnGif } from '@/lib/file-sniff'
import { borrarArchivos, subirArchivo, urlPublica } from '@/lib/storage/disk'
import { extraerYoutubeId } from '@/lib/youtube'

export type EjercicioCustomState = { ok?: boolean; error?: string }

const MAX_BYTES = 8 * 1024 * 1024

const CATEGORIAS = ['calentamiento', 'entrenamiento', 'enfriamiento', 'grupo_muscular'] as const
const MODOS = ['fuerza', 'cardio'] as const

// Escritura del catalogo: solo staff (policy `ejercicios staff write`).
async function requireStaff() {
  const { user, profile } = await getUserAndProfile()
  if (!user) return { error: 'No autenticado' as const }
  if (!profile || !esStaff(profile.rol)) return { error: 'No autorizado' as const }
  return { user, profile }
}

// La categoría (calentamiento/entrenamiento/enfriamiento/grupo_muscular) solo
// aplica a ejercicios de fuerza — uno de cardio ya trae sus propias 3 fases
// adentro, no tiene sentido clasificarlo también por fase de sesión.
const crearSchema = z
  .object({
    nombre: z.string().min(1, 'El nombre es requerido').max(200),
    categoria: z.enum(CATEGORIAS).optional(),
    modo: z.enum(MODOS).default('fuerza'),
    parte_cuerpo: z.string().max(60).optional().or(z.literal('')),
    instrucciones: z.string().max(1000).optional().or(z.literal('')),
  })
  .refine((d) => d.modo === 'cardio' || d.categoria != null, {
    message: 'La categoría es requerida',
    path: ['categoria'],
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
  // `ilike` sin comodines salvo que el nombre los traiga: se escapan para comparar literal.
  const nombreLiteral = d.nombre.trim().replace(/[\\%_]/g, '\\$&')
  const [existente] = await db
    .select({ id: ejercicios.id })
    .from(ejercicios)
    .where(ilike(ejercicios.nombre, nombreLiteral))
    .limit(1)
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

    try {
      await subirArchivo('ejercicios-media', storagePath, buf, 'image/gif')
    } catch (err) {
      console.error('crearEjercicioCustomAction (subida):', err)
      return { error: 'No se pudo subir el GIF.' }
    }

    gif_url = urlPublica('ejercicios-media', storagePath)
  }

  try {
    await db.insert(ejercicios).values({
      nombre: d.nombre.trim(),
      categoria: d.modo === 'cardio' ? null : d.categoria,
      modo: d.modo,
      parte_cuerpo: d.parte_cuerpo?.trim() || null,
      instrucciones: d.instrucciones?.trim() || null,
      gif_url,
      youtube_url,
      origen: 'staff',
      creado_por: ctx.user.id,
    })
  } catch (err) {
    console.error('crearEjercicioCustomAction:', err)
    if (storagePath) await borrarArchivos('ejercicios-media', [storagePath]).catch(() => {})
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

  const [ejercicio] = await db
    .select({ gif_url: ejercicios.gif_url })
    .from(ejercicios)
    .where(and(eq(ejercicios.id, id), eq(ejercicios.origen, 'staff')))
    .limit(1)
  if (!ejercicio) return { error: 'Ejercicio no encontrado.' }

  // Borrar primero la fila: si la FK `plan_ejercicios.ejercicio_id` (on delete restrict) rechaza el
  // delete porque el ejercicio está en uso, el GIF del storage queda intacto.
  try {
    await db.delete(ejercicios).where(and(eq(ejercicios.id, id), eq(ejercicios.origen, 'staff')))
  } catch (err) {
    if (pgCode(err) === PG.FOREIGN_KEY_VIOLATION) {
      return { error: 'No se puede borrar: este ejercicio está siendo usado en un plan. Quitalo del plan primero.' }
    }
    console.error('eliminarEjercicioCustomAction:', err)
    return { error: 'No se pudo eliminar el ejercicio.' }
  }

  const idx = ejercicio.gif_url?.indexOf('custom/') ?? -1
  if (ejercicio.gif_url && idx >= 0) {
    await borrarArchivos('ejercicios-media', [ejercicio.gif_url.slice(idx)]).catch(() => {})
  }

  revalidatePath('/admin/ejercicios')
  return { ok: true }
}
