// Servicio de secciones modulares de plan. SIN 'use server': recibe al actor (staff) ya autenticado.
import { and, asc, desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'

import { planes, plan_seccion_comidas, plan_seccion_imagenes, plan_secciones } from '@/db/schema'
import { db } from '@/lib/db'
import { TIPO_SECCION_PLAN_LABEL } from '@/lib/seguimiento'
import { optimizeImage } from '@/lib/storage/optimize-image'
import { borrarArchivos, subirArchivo } from '@/lib/storage/disk'

export type SeccionState = { ok?: boolean; error?: string }

const ALLOWED_IMAGEN_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_IMAGEN_BYTES = 10 * 1024 * 1024

// El dueño real del plan sale de la base, no del form: el path de las imágenes cuelga de ese id.
async function pacienteDelPlan(planId: number): Promise<string | null> {
  const [p] = await db.select({ paciente_id: planes.paciente_id }).from(planes).where(eq(planes.id, planId)).limit(1)
  return p?.paciente_id ?? null
}

const baseSchema = z.object({
  plan_id: z.coerce.number().int().positive(),
  paciente_id: z.string().uuid(),
  tipo: z.enum(['pautas_generales', 'receta', 'comidas_dia', 'imagenes']),
  titulo: z.string().max(200).optional().or(z.literal('')),
})

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
  files: File[],
  pacienteId: string,
  seccionId: number,
  ordenInicial: number,
): Promise<{ error?: string }> {
  let orden = ordenInicial
  for (const file of files) {
    const buf = await optimizeImage(Buffer.from(await file.arrayBuffer()))
    const storage_path = `${pacienteId}/secciones/${seccionId}/${Date.now()}_${orden}.webp`
    try {
      await subirArchivo('planes', storage_path, buf, 'image/webp')
    } catch (err) {
      console.error('subirImagenes (subida):', err)
      return { error: 'No se pudo subir una de las imágenes.' }
    }

    try {
      await db.insert(plan_seccion_imagenes).values({ seccion_id: seccionId, storage_path, orden })
    } catch (err) {
      console.error('subirImagenes:', err)
      await borrarArchivos('planes', [storage_path]).catch(() => {})
      return { error: 'No se pudo guardar una de las imágenes.' }
    }
    orden += 1
  }
  return {}
}

type Res = SeccionState & { paciente_id?: string; plan_id?: number }
export type ArchivoImagen = File

function leerMomentosDeRaw(raw: Record<string, unknown>): { nombre_momento: string; contenido: string }[] {
  // La web manda `momento_nombre` / `momento_contenido` repetidos; la app, arrays.
  const nombres = ([] as unknown[]).concat(raw.momento_nombre ?? []).map(String)
  const contenidos = ([] as unknown[]).concat(raw.momento_contenido ?? []).map(String)
  return nombres
    .map((nombre, i) => ({ nombre_momento: nombre.trim(), contenido: (contenidos[i] ?? '').trim() }))
    .filter((m) => m.nombre_momento && m.contenido)
}

export async function crearSeccion(raw: Record<string, unknown>, imagenes: File[] = []): Promise<Res> {
  const parsed = baseSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const { plan_id, tipo } = parsed.data
  const paciente_id = await pacienteDelPlan(plan_id)
  if (!paciente_id) return { error: 'Ese plan ya no existe.' }
  const titulo = parsed.data.titulo?.trim() || TIPO_SECCION_PLAN_LABEL[tipo]
  const files = imagenes.filter((f) => f.size > 0)

  const imgCheck = validarImagenes(files)
  if (imgCheck.error) return imgCheck

  let contenido: string | null = null
  let momentos: { nombre_momento: string; contenido: string }[] = []

  if (tipo === 'pautas_generales' || tipo === 'receta') {
    contenido = String(raw.contenido ?? '').trim()
    if (!contenido) return { error: 'Escribí el contenido de la sección.' }
  } else if (tipo === 'comidas_dia') {
    momentos = leerMomentosDeRaw(raw)
    if (momentos.length === 0) return { error: 'Agregá al menos un momento del día con su contenido.' }
  } else if (tipo === 'imagenes' && files.length === 0) {
    return { error: 'Subí al menos una imagen.' }
  }

  let seccionId: number
  try {
    seccionId = await db.transaction(async (tx) => {
      const [max] = await tx
        .select({ orden: plan_secciones.orden })
        .from(plan_secciones)
        .where(eq(plan_secciones.plan_id, plan_id))
        .orderBy(desc(plan_secciones.orden))
        .limit(1)
      const [seccion] = await tx
        .insert(plan_secciones)
        .values({ plan_id, tipo, titulo, contenido, orden: (max?.orden ?? -1) + 1 })
        .returning({ id: plan_secciones.id })
      if (tipo === 'comidas_dia' && momentos.length > 0) {
        await tx.insert(plan_seccion_comidas).values(momentos.map((m, i) => ({ seccion_id: seccion.id, ...m, orden: i })))
      }
      return seccion.id
    })
  } catch (err) {
    console.error('crearSeccion:', err)
    return { error: 'No se pudo crear la sección.' }
  }

  if (files.length > 0) {
    const imgErr = await subirImagenes(files, paciente_id, seccionId, 0)
    if (imgErr.error) return imgErr
  }
  return { ok: true, paciente_id, plan_id }
}

const updateSchema = baseSchema.extend({ id: z.coerce.number().int().positive() })

export async function actualizarSeccion(raw: Record<string, unknown>, imagenes: File[] = []): Promise<Res> {
  const parsed = updateSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const { id, plan_id, tipo } = parsed.data
  const paciente_id = await pacienteDelPlan(plan_id)
  if (!paciente_id) return { error: 'Ese plan ya no existe.' }
  const titulo = parsed.data.titulo?.trim() || TIPO_SECCION_PLAN_LABEL[tipo]
  const files = imagenes.filter((f) => f.size > 0)

  const imgCheck = validarImagenes(files)
  if (imgCheck.error) return imgCheck

  let contenido: string | null = null
  let momentos: { nombre_momento: string; contenido: string }[] = []

  if (tipo === 'pautas_generales' || tipo === 'receta') {
    contenido = String(raw.contenido ?? '').trim()
    if (!contenido) return { error: 'Escribí el contenido de la sección.' }
  } else if (tipo === 'comidas_dia') {
    momentos = leerMomentosDeRaw(raw)
    if (momentos.length === 0) return { error: 'Agregá al menos un momento del día con su contenido.' }
  }

  // La sección tiene que ser de ESE plan: el id llega del cliente.
  try {
    const res = await db
      .update(plan_secciones)
      .set({ titulo, contenido })
      .where(and(eq(plan_secciones.id, id), eq(plan_secciones.plan_id, plan_id)))
      .returning({ id: plan_secciones.id })
    if (res.length === 0) return { error: 'La sección ya no existe.' }

    if (tipo === 'comidas_dia') {
      await db.transaction(async (tx) => {
        await tx.delete(plan_seccion_comidas).where(eq(plan_seccion_comidas.seccion_id, id))
        await tx.insert(plan_seccion_comidas).values(momentos.map((m, i) => ({ seccion_id: id, ...m, orden: i })))
      })
    }
  } catch (err) {
    console.error('actualizarSeccion:', err)
    return { error: 'No se pudo actualizar la sección.' }
  }

  if (files.length > 0) {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(plan_seccion_imagenes)
      .where(eq(plan_seccion_imagenes.seccion_id, id))
    const imgErr = await subirImagenes(files, paciente_id, id, n)
    if (imgErr.error) return imgErr
  }
  return { ok: true, paciente_id, plan_id }
}

export async function eliminarSeccion(id: number, planId: number): Promise<void> {
  if (!id || !planId) return
  const imagenes = await db
    .select({ storage_path: plan_seccion_imagenes.storage_path })
    .from(plan_seccion_imagenes)
    .where(eq(plan_seccion_imagenes.seccion_id, id))
  if (imagenes.length > 0) {
    await borrarArchivos('planes', imagenes.map((i) => i.storage_path)).catch(() => {})
  }
  await db.delete(plan_secciones).where(and(eq(plan_secciones.id, id), eq(plan_secciones.plan_id, planId)))
}

export async function eliminarImagenSeccion(id: number, planId: number): Promise<void> {
  if (!id || !planId) return
  // La imagen tiene que colgar de una seccion de ESE plan.
  const [imagen] = await db
    .select({ storage_path: plan_seccion_imagenes.storage_path })
    .from(plan_seccion_imagenes)
    .innerJoin(plan_secciones, eq(plan_secciones.id, plan_seccion_imagenes.seccion_id))
    .where(and(eq(plan_seccion_imagenes.id, id), eq(plan_secciones.plan_id, planId)))
    .limit(1)
  if (!imagen) return
  await borrarArchivos('planes', [imagen.storage_path]).catch(() => {})
  await db.delete(plan_seccion_imagenes).where(eq(plan_seccion_imagenes.id, id))
}

export async function moverSeccion(id: number, planId: number, direccion: 'subir' | 'bajar'): Promise<void> {
  if (!id || !planId) return
  const secciones = await db
    .select({ id: plan_secciones.id, orden: plan_secciones.orden })
    .from(plan_secciones)
    .where(eq(plan_secciones.plan_id, planId))
    .orderBy(asc(plan_secciones.orden))

  const idx = secciones.findIndex((s) => s.id === id)
  const vecinoIdx = direccion === 'subir' ? idx - 1 : idx + 1
  if (idx === -1 || vecinoIdx < 0 || vecinoIdx >= secciones.length) return

  const actual = secciones[idx]
  const vecino = secciones[vecinoIdx]
  await db.transaction(async (tx) => {
    await tx.update(plan_secciones).set({ orden: vecino.orden }).where(eq(plan_secciones.id, actual.id))
    await tx.update(plan_secciones).set({ orden: actual.orden }).where(eq(plan_secciones.id, vecino.id))
  })
}
