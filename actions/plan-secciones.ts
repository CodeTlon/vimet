'use server'

import { and, asc, desc, eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { planes, plan_seccion_comidas, plan_seccion_imagenes, plan_secciones } from '@/db/schema'
import { authStaff } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { TIPO_SECCION_PLAN_LABEL } from '@/lib/seguimiento'
import { optimizeImage } from '@/lib/storage/optimize-image'
import { borrarArchivos, subirArchivo } from '@/lib/storage/s3'

export type SeccionState = { ok?: boolean; error?: string }

const ALLOWED_IMAGEN_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_IMAGEN_BYTES = 10 * 1024 * 1024

// Solo staff escribe secciones de plan (policies `plan_secciones*  staff write`).
const requireStaff = authStaff

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

  const { plan_id, tipo } = parsed.data
  const paciente_id = await pacienteDelPlan(plan_id)
  if (!paciente_id) return { error: 'Ese plan ya no existe.' }
  const titulo = parsed.data.titulo?.trim() || TIPO_SECCION_PLAN_LABEL[tipo]
  const imagenes = (formData.getAll('imagenes') as File[]).filter((f) => f.size > 0)

  const imgCheck = validarImagenes(imagenes)
  if (imgCheck.error) return imgCheck

  let contenido: string | null = null
  let momentos: { nombre_momento: string; contenido: string }[] = []

  if (tipo === 'pautas_generales' || tipo === 'receta') {
    contenido = String(formData.get('contenido') ?? '').trim()
    if (!contenido) return { error: 'Escribí el contenido de la sección.' }
  } else if (tipo === 'comidas_dia') {
    momentos = leerMomentos(formData)
    if (momentos.length === 0) return { error: 'Agregá al menos un momento del día con su contenido.' }
  } else if (tipo === 'imagenes' && imagenes.length === 0) {
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
    console.error('crearSeccionAction:', err)
    return { error: 'No se pudo crear la sección.' }
  }

  if (imagenes.length > 0) {
    const imgErr = await subirImagenes(imagenes, paciente_id, seccionId, 0)
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

  const { id, plan_id, tipo } = parsed.data
  const paciente_id = await pacienteDelPlan(plan_id)
  if (!paciente_id) return { error: 'Ese plan ya no existe.' }
  const titulo = parsed.data.titulo?.trim() || TIPO_SECCION_PLAN_LABEL[tipo]
  const imagenes = (formData.getAll('imagenes') as File[]).filter((f) => f.size > 0)

  const imgCheck = validarImagenes(imagenes)
  if (imgCheck.error) return imgCheck

  let contenido: string | null = null
  let momentos: { nombre_momento: string; contenido: string }[] = []

  if (tipo === 'pautas_generales' || tipo === 'receta') {
    contenido = String(formData.get('contenido') ?? '').trim()
    if (!contenido) return { error: 'Escribí el contenido de la sección.' }
  } else if (tipo === 'comidas_dia') {
    momentos = leerMomentos(formData)
    if (momentos.length === 0) return { error: 'Agregá al menos un momento del día con su contenido.' }
  }

  // La sección tiene que ser de ESE plan: el id llega del form.
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
    console.error('actualizarSeccionAction:', err)
    return { error: 'No se pudo actualizar la sección.' }
  }

  if (imagenes.length > 0) {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(plan_seccion_imagenes)
      .where(eq(plan_seccion_imagenes.seccion_id, id))
    const imgErr = await subirImagenes(imagenes, paciente_id, id, n)
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

  const imagenes = await db
    .select({ storage_path: plan_seccion_imagenes.storage_path })
    .from(plan_seccion_imagenes)
    .where(eq(plan_seccion_imagenes.seccion_id, id))
  if (imagenes.length > 0) {
    await borrarArchivos('planes', imagenes.map((i) => i.storage_path)).catch(() => {})
  }

  await db.delete(plan_secciones).where(and(eq(plan_secciones.id, id), eq(plan_secciones.plan_id, plan_id)))
  revalidar(paciente_id, plan_id)
}

export async function eliminarImagenSeccionAction(formData: FormData) {
  const id = Number(formData.get('id'))
  const plan_id = Number(formData.get('plan_id'))
  const paciente_id = String(formData.get('paciente_id') ?? '')
  if (!id || !plan_id) return

  const ctx = await requireStaff()
  if ('error' in ctx) return

  const [imagen] = await db
    .select({ storage_path: plan_seccion_imagenes.storage_path })
    .from(plan_seccion_imagenes)
    .where(eq(plan_seccion_imagenes.id, id))
    .limit(1)
  if (imagen?.storage_path) {
    await borrarArchivos('planes', [imagen.storage_path]).catch(() => {})
  }
  await db.delete(plan_seccion_imagenes).where(eq(plan_seccion_imagenes.id, id))
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

  const secciones = await db
    .select({ id: plan_secciones.id, orden: plan_secciones.orden })
    .from(plan_secciones)
    .where(eq(plan_secciones.plan_id, plan_id))
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

  revalidar(paciente_id, plan_id)
}
