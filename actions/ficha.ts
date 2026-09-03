'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { hoyArgentina } from '@/lib/datetime'
import { encryptClinical } from '@/lib/crypto/clinical'

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

export async function guardarFichaAction(
  _prev: unknown,
  formData: FormData,
): Promise<FichaState> {
  const parsed = fichaSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Datos inválidos' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile || !['nutricionista', 'entrenador', 'admin'].includes(profile.rol)) {
    return { error: 'No autorizado' }
  }

  const d = parsed.data
  let payload: Record<string, unknown>
  try {
    payload = {
      paciente_id: d.paciente_id,
      fecha_nacimiento: toNullableString(d.fecha_nacimiento),
      sexo: toNullableString(d.sexo),
      ocupacion: toNullableString(d.ocupacion),
      fecha_primera_consulta: toNullableString(d.fecha_primera_consulta),
      fuma: toBool(d.fuma),
      bebe: toBool(d.bebe),
      drogas: toBool(d.drogas),
      entrena: toBool(d.entrena),
      actividad_diaria: toNullableString(d.actividad_diaria),
      horas_sueno: toNullableNumber(d.horas_sueno),
      // Campos clínicos sensibles: cifrados en Node antes de escribir (ver
      // lib/crypto/clinical.ts) — la columna vieja se limpia en la misma
      // escritura para no dejar el dato en texto plano a partir de acá.
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
      // No clínicos en el sentido estricto (suplementación/lesiones/molestias/
      // motivos son datos de seguimiento, no diagnóstico/lab/medicación) —
      // scope de cifrado acordado, quedan en texto plano por ahora.
      suplementacion: toNullableString(d.suplementacion),
      lesiones: toNullableString(d.lesiones),
      molestias: toNullableString(d.molestias),
      motivos_consulta: toNullableString(d.motivos_consulta),
      updated_by: user.id,
    }
  } catch (e) {
    console.error('guardarFichaAction: fallo al cifrar campos clínicos', e)
    return { error: 'No se pudo guardar la ficha (falló el cifrado — revisar CLINICAL_DATA_ENCRYPTION_KEY del entorno).' }
  }

  const { error } = await supabase
    .from('fichas_paciente')
    .upsert(payload, { onConflict: 'paciente_id' })

  if (error) return { error: 'No se pudo guardar la ficha.' }

  revalidatePath(`/admin/pacientes/${d.paciente_id}`)
  revalidatePath(`/admin/pacientes/${d.paciente_id}/ficha`)
  revalidatePath('/mi-ficha')
  return { ok: true }
}
