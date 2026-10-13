// Servicio de ficha clinica. SIN 'use server': recibe al actor (staff) ya autenticado; lo usan
// actions/ficha.ts (web) y lib/mobile (app). El dato clinico se cifra aca, nunca en el cliente.
import { z } from 'zod'

import { fichas_paciente } from '@/db/schema'
import { encryptClinical } from '@/lib/crypto/clinical'
import { hoyArgentina } from '@/lib/datetime'
import { conActor } from '@/lib/db'

export type FichaState = { ok?: boolean; error?: string }

const fechaNoFutura = (v: string) => v === '' || v <= hoyArgentina()

const fichaSchema = z.object({
  paciente_id: z.string().uuid(),
  fecha_nacimiento: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => fechaNoFutura(v ?? ''), 'La fecha de nacimiento no puede ser futura'),
  sexo: z.enum(['femenino', 'masculino', 'otro']).optional().or(z.literal('')),
  ocupacion: z.string().max(200).optional().or(z.literal('')),
  fecha_primera_consulta: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => fechaNoFutura(v ?? ''), 'La fecha de primera consulta no puede ser futura'),
  fuma: z.enum(['true', 'false', '']).optional(),
  bebe: z.enum(['true', 'false', '']).optional(),
  drogas: z.enum(['true', 'false', '']).optional(),
  entrena: z.enum(['true', 'false', '']).optional(),
  actividad_diaria: z.string().max(120).optional().or(z.literal('')),
  horas_sueno: z.string().optional().or(z.literal('')),
  dx_medico: z.string().max(2000).optional().or(z.literal('')),
  dx_nutricional: z.string().max(2000).optional().or(z.literal('')),
  medicacion: z.string().max(2000).optional().or(z.literal('')),
  suplementacion: z.string().max(2000).optional().or(z.literal('')),
  lesiones: z.string().max(2000).optional().or(z.literal('')),
  molestias: z.string().max(2000).optional().or(z.literal('')),
  datos_laboratorio: z.string().max(4000).optional().or(z.literal('')),
  motivos_consulta: z.string().max(2000).optional().or(z.literal('')),
  observaciones_internas: z.string().max(4000).optional().or(z.literal('')),
})

const toBool = (v: string | undefined) =>
  v === 'true' ? true : v === 'false' ? false : null
const toNullableString = (v: string | undefined) =>
  v && v.trim() !== '' ? v.trim() : null
const toNullableNumber = (v: string | undefined) => {
  if (!v || v.trim() === '') return null
  const n = Number(v.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** Guarda (upsert) la ficha de un paciente. `raw` son los campos del form (todo string). */
export async function guardarFicha(actorId: string, raw: Record<string, unknown>): Promise<FichaState> {
  const parsed = fichaSchema.safeParse(raw)
  if (!parsed.success) return { error: 'Datos inválidos' }

  const d = parsed.data
  let payload: typeof fichas_paciente.$inferInsert
  try {
    payload = {
      paciente_id: d.paciente_id,
      fecha_nacimiento: toNullableString(d.fecha_nacimiento),
      sexo: toNullableString(d.sexo) as typeof fichas_paciente.$inferInsert['sexo'],
      ocupacion: toNullableString(d.ocupacion),
      fecha_primera_consulta: toNullableString(d.fecha_primera_consulta),
      fuma: toBool(d.fuma),
      bebe: toBool(d.bebe),
      drogas: toBool(d.drogas),
      entrena: toBool(d.entrena),
      actividad_diaria: toNullableString(d.actividad_diaria),
      horas_sueno: toNullableNumber(d.horas_sueno),
      // Campos clínicos sensibles: cifrados en Node antes de escribir (lib/crypto/clinical.ts); la
      // columna vieja se limpia en la misma escritura.
      dx_medico: null,
      dx_medico_enc: encryptClinical(toNullableString(d.dx_medico)),
      dx_nutricional: null,
      dx_nutricional_enc: encryptClinical(toNullableString(d.dx_nutricional)),
      medicacion: null,
      medicacion_enc: encryptClinical(toNullableString(d.medicacion)),
      datos_laboratorio: null,
      datos_laboratorio_enc: encryptClinical(toNullableString(d.datos_laboratorio)),
      observaciones_internas: null,
      observaciones_internas_enc: encryptClinical(toNullableString(d.observaciones_internas)),
      suplementacion: toNullableString(d.suplementacion),
      lesiones: toNullableString(d.lesiones),
      molestias: toNullableString(d.molestias),
      motivos_consulta: toNullableString(d.motivos_consulta),
      updated_by: actorId,
    }
  } catch (e) {
    console.error('guardarFicha: fallo al cifrar campos clínicos', e)
    return { error: 'No se pudo guardar la ficha (falló el cifrado — revisar CLINICAL_DATA_ENCRYPTION_KEY del entorno).' }
  }

  try {
    const cambios: Partial<typeof payload> = { ...payload }
    delete cambios.paciente_id
    await conActor(actorId, (tx) =>
      tx.insert(fichas_paciente).values(payload).onConflictDoUpdate({ target: fichas_paciente.paciente_id, set: cambios }),
    )
  } catch (err) {
    console.error('guardarFicha:', err)
    return { error: 'No se pudo guardar la ficha.' }
  }
  return { ok: true }
}
