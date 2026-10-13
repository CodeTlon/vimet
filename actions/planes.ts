'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { planes } from '@/db/schema'
import { authStaff, authUsuario, esStaff } from '@/lib/auth/session'
import { encryptClinical } from '@/lib/crypto/clinical'
import { conActor, db } from '@/lib/db'
import { pareceUnPdf } from '@/lib/file-sniff'
import { borrarArchivos, subirArchivo, urlFirmada } from '@/lib/storage/s3'

export type PlanState = { ok?: boolean; error?: string; planId?: number }

const planObjectSchema = z.object({
  paciente_id: z.string().uuid(),
  tipo: z.enum(['nutricion', 'entrenamiento', 'combo']),
  titulo: z.string().min(1, 'Indicá un título').max(200),
  estado: z.enum(['vigente', 'archivado', 'borrador']).default('vigente'),
  fecha_desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fecha_hasta: z.string().optional().or(z.literal('')),
  // entreno
  disciplina: z.string().max(200).optional().or(z.literal('')),
  experiencia_previa: z.string().max(1000).optional().or(z.literal('')),
  frecuencia: z.string().max(200).optional().or(z.literal('')),
  volumen: z.string().max(500).optional().or(z.literal('')),
  disponibilidad_lunes: z.string().max(200).optional().or(z.literal('')),
  disponibilidad_martes: z.string().max(200).optional().or(z.literal('')),
  disponibilidad_miercoles: z.string().max(200).optional().or(z.literal('')),
  disponibilidad_jueves: z.string().max(200).optional().or(z.literal('')),
  disponibilidad_viernes: z.string().max(200).optional().or(z.literal('')),
  disponibilidad_sabado: z.string().max(200).optional().or(z.literal('')),
  notas: z.string().max(4000).optional().or(z.literal('')),
})

const vigenciaRefine = (d: { fecha_desde: string; fecha_hasta?: string }) =>
  !d.fecha_hasta || d.fecha_hasta >= d.fecha_desde
const vigenciaRefineOpts = {
  message: 'La vigencia hasta no puede ser anterior a la vigencia desde',
  path: ['fecha_hasta'] as string[],
}

const ENTRENO_FIELDS = [
  'disciplina',
  'experiencia_previa',
  'frecuencia',
  'volumen',
  'disponibilidad_lunes',
  'disponibilidad_martes',
  'disponibilidad_miercoles',
  'disponibilidad_jueves',
  'disponibilidad_viernes',
  'disponibilidad_sabado',
] as const
const tieneDatos = (d: Record<string, string | undefined>, fields: readonly string[]) =>
  fields.some((f) => (d[f] ?? '').trim() !== '')

// El contenido nutricional ahora vive en secciones modulares opcionales
// (plan_secciones, agregadas después de guardar el plan), así que solo el
// bloque fijo de "Datos de entrenamiento" sigue exigiendo al menos un dato.
const minimoRefine = (d: { tipo: string } & Record<string, string | undefined>) => {
  if (d.tipo === 'nutricion') return true
  return tieneDatos(d, ENTRENO_FIELDS)
}
const minimoRefineOpts = {
  message: 'Cargá al menos un dato de entrenamiento para este tipo de plan',
  path: ['tipo'] as string[],
}

const baseSchema = planObjectSchema
  .refine(vigenciaRefine, vigenciaRefineOpts)
  .refine(minimoRefine, minimoRefineOpts)

const toStr = (v: string | undefined) => (v && v.trim() !== '' ? v.trim() : null)

// Solo staff escribe planes (policy `planes staff write`).
const getStaff = authStaff

function buildPayload(d: z.infer<typeof baseSchema>, profesional_id: string): typeof planes.$inferInsert {
  return {
    paciente_id: d.paciente_id,
    profesional_id,
    tipo: d.tipo,
    titulo: d.titulo,
    estado: d.estado,
    fecha_desde: d.fecha_desde,
    fecha_hasta: toStr(d.fecha_hasta),
    disciplina: toStr(d.disciplina),
    experiencia_previa: toStr(d.experiencia_previa),
    frecuencia: toStr(d.frecuencia),
    volumen: toStr(d.volumen),
    disponibilidad_lunes: toStr(d.disponibilidad_lunes),
    disponibilidad_martes: toStr(d.disponibilidad_martes),
    disponibilidad_miercoles: toStr(d.disponibilidad_miercoles),
    disponibilidad_jueves: toStr(d.disponibilidad_jueves),
    disponibilidad_viernes: toStr(d.disponibilidad_viernes),
    disponibilidad_sabado: toStr(d.disponibilidad_sabado),
    // `notas` cifrado en Node antes de escribir (ver lib/crypto/clinical.ts)
    // — la columna vieja queda en null a partir de acá.
    notas: null,
    notas_enc: encryptClinical(toStr(d.notas)),
  }
}

export async function crearPlanAction(
  _prev: unknown,
  formData: FormData,
): Promise<PlanState> {
  const raw = Object.fromEntries(formData)
  const parsed = baseSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const ctx = await getStaff()
  if ('error' in ctx) return { error: ctx.error }

  const d = parsed.data
  const file = formData.get('archivo') as File | null

  let payload: typeof planes.$inferInsert
  try {
    payload = buildPayload(d, ctx.user.id)
  } catch (e) {
    console.error('crearPlanAction: fallo al cifrar notas', e)
    return { error: 'No se pudo crear el plan (falló el cifrado — revisar CLINICAL_DATA_ENCRYPTION_KEY del entorno).' }
  }

  let archivo_path: string | null = null
  if (file && file.size > 0) {
    if (file.type !== 'application/pdf') {
      return { error: 'El archivo debe ser PDF.' }
    }
    if (file.size > 15 * 1024 * 1024) {
      return { error: 'El PDF supera 15MB.' }
    }
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    archivo_path = `${d.paciente_id}/${Date.now()}_${safeName}`
    const buf = Buffer.from(await file.arrayBuffer())
    if (!pareceUnPdf(buf)) return { error: 'El archivo no es un PDF válido.' }
    try {
      await subirArchivo('planes', archivo_path, buf, 'application/pdf')
    } catch (err) {
      console.error('crearPlanAction (subida):', err)
      return { error: 'No se pudo subir el PDF.' }
    }
  }

  let created: { id: number }
  try {
    ;[created] = await conActor(ctx.user.id, (tx) =>
      tx.insert(planes).values({ ...payload, archivo_path }).returning({ id: planes.id }),
    )
  } catch (err) {
    console.error('crearPlanAction:', err)
    if (archivo_path) await borrarArchivos('planes', [archivo_path]).catch(() => {})
    return { error: 'No se pudo crear el plan.' }
  }

  revalidatePath(`/admin/pacientes/${d.paciente_id}/planes`)
  revalidatePath('/mis-planes')
  return { ok: true, planId: created.id }
}

const updateSchema = planObjectSchema
  .extend({ id: z.string().regex(/^\d+$/) })
  .refine(vigenciaRefine, vigenciaRefineOpts)
  .refine(minimoRefine, minimoRefineOpts)

export async function actualizarPlanAction(
  _prev: unknown,
  formData: FormData,
): Promise<PlanState> {
  const parsed = updateSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const ctx = await getStaff()
  if ('error' in ctx) return { error: ctx.error }

  const d = parsed.data
  const id = Number(d.id)
  const file = formData.get('archivo') as File | null

  // El dueño real del plan sale de la DB, no del form: un paciente_id
  // hidden desactualizado o manipulado no debe poder reasignar el plan.
  const [existente] = await db
    .select({ paciente_id: planes.paciente_id, archivo_path: planes.archivo_path })
    .from(planes)
    .where(eq(planes.id, id))
    .limit(1)
  if (!existente) return { error: 'Ese plan ya no existe.' }

  let payload: typeof planes.$inferInsert
  try {
    payload = buildPayload({ ...d, paciente_id: existente.paciente_id }, ctx.user.id)
  } catch (e) {
    console.error('actualizarPlanAction: fallo al cifrar notas', e)
    return { error: 'No se pudo actualizar el plan (falló el cifrado — revisar CLINICAL_DATA_ENCRYPTION_KEY del entorno).' }
  }

  if (file && file.size > 0) {
    if (file.type !== 'application/pdf') return { error: 'El archivo debe ser PDF.' }
    if (file.size > 15 * 1024 * 1024) return { error: 'El PDF supera 15MB.' }

    const prev = existente

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const archivo_path = `${existente.paciente_id}/${Date.now()}_${safeName}`
    const buf = Buffer.from(await file.arrayBuffer())
    if (!pareceUnPdf(buf)) return { error: 'El archivo no es un PDF válido.' }
    try {
      await subirArchivo('planes', archivo_path, buf, 'application/pdf')
    } catch (err) {
      console.error('actualizarPlanAction (subida):', err)
      return { error: 'No se pudo subir el PDF.' }
    }
    payload.archivo_path = archivo_path

    // Si había un PDF previo, lo borramos del bucket recién después de subir el nuevo: así nunca
    // quedan huérfanos y si falla el upload no perdemos el viejo.
    if (prev?.archivo_path && prev.archivo_path !== archivo_path) {
      await borrarArchivos('planes', [prev.archivo_path]).catch(() => {})
    }
  }

  try {
    // El dueño del plan no se reasigna al actualizar.
    const cambios: Partial<typeof payload> = { ...payload }
    delete cambios.paciente_id
    await conActor(ctx.user.id, (tx) => tx.update(planes).set(cambios).where(eq(planes.id, id)))
  } catch (err) {
    console.error('actualizarPlanAction:', err)
    return { error: 'No se pudo actualizar el plan.' }
  }

  revalidatePath(`/admin/pacientes/${existente.paciente_id}/planes`)
  revalidatePath(`/admin/pacientes/${existente.paciente_id}/planes/${id}`)
  revalidatePath('/mis-planes')
  revalidatePath(`/mis-planes/${id}`)
  return { ok: true, planId: id }
}

export async function eliminarPlanAction(formData: FormData) {
  const id = Number(formData.get('id'))
  const paciente_id = String(formData.get('paciente_id') ?? '')
  if (!id) return
  const ctx = await getStaff()
  if ('error' in ctx) return
  const [plan] = await db.select({ archivo_path: planes.archivo_path }).from(planes).where(eq(planes.id, id)).limit(1)
  if (plan?.archivo_path) {
    await borrarArchivos('planes', [plan.archivo_path]).catch(() => {})
  }
  await conActor(ctx.user.id, (tx) => tx.delete(planes).where(eq(planes.id, id)))
  revalidatePath(`/admin/pacientes/${paciente_id}/planes`)
  revalidatePath('/mis-planes')
}

// Genera URL firmada para descargar/visualizar el PDF
export async function obtenerUrlPlanAction(formData: FormData): Promise<{ url?: string; error?: string }> {
  const id = Number(formData.get('id'))
  if (!id) return { error: 'Plan inválido' }
  const ctx = await authUsuario()
  if ('error' in ctx) return { error: ctx.error }

  const [plan] = await db
    .select({ paciente_id: planes.paciente_id, archivo_path: planes.archivo_path })
    .from(planes)
    .where(eq(planes.id, id))
    .limit(1)
  if (!plan?.archivo_path) return { error: 'Plan sin archivo' }

  // Reemplaza la policy de storage `planes storage paciente read own` (carpeta = id del paciente).
  if (!esStaff(ctx.profile.rol) && plan.paciente_id !== ctx.user.id) return { error: 'No autorizado' }

  const url = await urlFirmada('planes', plan.archivo_path, 60 * 5)
  if (!url) return { error: 'No se pudo generar el enlace' }
  return { url }
}
