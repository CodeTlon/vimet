// Servicio de planes. SIN 'use server': recibe al actor ya autenticado; lo usan actions/planes.ts (web)
// y lib/mobile (app).
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { planes } from '@/db/schema'
import { esStaff, type Profile } from '@/lib/auth/session'
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

export type PlanArchivo = { name: string; type: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> } | null | undefined

async function subirPdf(pacienteId: string, file: NonNullable<PlanArchivo>): Promise<{ path: string } | { error: string }> {
  if (file.type !== 'application/pdf') return { error: 'El archivo debe ser PDF.' }
  if (file.size > 15 * 1024 * 1024) return { error: 'El PDF supera 15MB.' }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${pacienteId}/${Date.now()}_${safeName}`
  const buf = Buffer.from(await file.arrayBuffer())
  if (!pareceUnPdf(buf)) return { error: 'El archivo no es un PDF válido.' }
  try {
    await subirArchivo('planes', path, buf, 'application/pdf')
  } catch (err) {
    console.error('subirPdf:', err)
    return { error: 'No se pudo subir el PDF.' }
  }
  return { path }
}

export async function crearPlan(actorId: string, raw: Record<string, unknown>, archivo?: PlanArchivo): Promise<PlanState & { paciente_id?: string }> {
  const parsed = baseSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  const d = parsed.data

  let payload: typeof planes.$inferInsert
  try {
    payload = buildPayload(d, actorId)
  } catch (e) {
    console.error('crearPlan: fallo al cifrar notas', e)
    return { error: 'No se pudo crear el plan (falló el cifrado — revisar CLINICAL_DATA_ENCRYPTION_KEY del entorno).' }
  }

  let archivo_path: string | null = null
  if (archivo && archivo.size > 0) {
    const sub = await subirPdf(d.paciente_id, archivo)
    if ('error' in sub) return { error: sub.error }
    archivo_path = sub.path
  }

  try {
    const [created] = await conActor(actorId, (tx) =>
      tx.insert(planes).values({ ...payload, archivo_path }).returning({ id: planes.id }),
    )
    return { ok: true, planId: created.id, paciente_id: d.paciente_id }
  } catch (err) {
    console.error('crearPlan:', err)
    if (archivo_path) await borrarArchivos('planes', [archivo_path]).catch(() => {})
    return { error: 'No se pudo crear el plan.' }
  }
}

const updateSchema = planObjectSchema
  .extend({ id: z.string().regex(/^\d+$/) })
  .refine(vigenciaRefine, vigenciaRefineOpts)
  .refine(minimoRefine, minimoRefineOpts)

export async function actualizarPlan(actorId: string, raw: Record<string, unknown>, archivo?: PlanArchivo): Promise<PlanState & { paciente_id?: string }> {
  const parsed = updateSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  const d = parsed.data
  const id = Number(d.id)

  // El dueño real del plan sale de la base, no del form: un paciente_id manipulado no reasigna el plan.
  const [existente] = await db
    .select({ paciente_id: planes.paciente_id, archivo_path: planes.archivo_path })
    .from(planes)
    .where(eq(planes.id, id))
    .limit(1)
  if (!existente) return { error: 'Ese plan ya no existe.' }

  let payload: typeof planes.$inferInsert
  try {
    payload = buildPayload({ ...d, paciente_id: existente.paciente_id }, actorId)
  } catch (e) {
    console.error('actualizarPlan: fallo al cifrar notas', e)
    return { error: 'No se pudo actualizar el plan (falló el cifrado — revisar CLINICAL_DATA_ENCRYPTION_KEY del entorno).' }
  }

  if (archivo && archivo.size > 0) {
    const sub = await subirPdf(existente.paciente_id, archivo)
    if ('error' in sub) return { error: sub.error }
    payload.archivo_path = sub.path
    // El PDF previo se borra recién después de subir el nuevo: nunca quedan huérfanos ni se pierde el viejo.
    if (existente.archivo_path && existente.archivo_path !== sub.path) {
      await borrarArchivos('planes', [existente.archivo_path]).catch(() => {})
    }
  }

  try {
    const cambios: Partial<typeof payload> = { ...payload }
    delete cambios.paciente_id // el dueño del plan no se reasigna
    await conActor(actorId, (tx) => tx.update(planes).set(cambios).where(eq(planes.id, id)))
  } catch (err) {
    console.error('actualizarPlan:', err)
    return { error: 'No se pudo actualizar el plan.' }
  }
  return { ok: true, planId: id, paciente_id: existente.paciente_id }
}

/** `pacienteId` acota el borrado a un paciente (la app lo manda siempre). */
export async function eliminarPlan(actorId: string, id: number, pacienteId?: string): Promise<PlanState> {
  if (!id) return { error: 'Datos inválidos' }
  const [plan] = await db
    .select({ archivo_path: planes.archivo_path, paciente_id: planes.paciente_id })
    .from(planes)
    .where(eq(planes.id, id))
    .limit(1)
  if (!plan || (pacienteId && plan.paciente_id !== pacienteId)) return { error: 'Ese plan ya no existe.' }
  if (plan.archivo_path) await borrarArchivos('planes', [plan.archivo_path]).catch(() => {})
  await conActor(actorId, (tx) => tx.delete(planes).where(eq(planes.id, id)))
  return { ok: true }
}

/** URL firmada (5 min) del PDF: el paciente dueño o staff (policy `planes storage paciente read own`). */
export async function urlArchivoPlan(actor: Pick<Profile, 'id' | 'rol'>, id: number): Promise<{ url?: string; error?: string }> {
  if (!id) return { error: 'Plan inválido' }
  const [plan] = await db
    .select({ paciente_id: planes.paciente_id, archivo_path: planes.archivo_path })
    .from(planes)
    .where(eq(planes.id, id))
    .limit(1)
  if (!plan?.archivo_path) return { error: 'Plan sin archivo' }
  if (!esStaff(actor.rol) && plan.paciente_id !== actor.id) return { error: 'No autorizado' }
  const url = await urlFirmada('planes', plan.archivo_path, 60 * 5)
  if (!url) return { error: 'No se pudo generar el enlace' }
  return { url }
}
