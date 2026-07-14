'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { hoyArgentina } from '@/lib/datetime'

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
  const payload = {
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
    dx_medico: toNullableString(d.dx_medico),
    dx_nutricional: toNullableString(d.dx_nutricional),
    medicacion: toNullableString(d.medicacion),
    suplementacion: toNullableString(d.suplementacion),
    lesiones: toNullableString(d.lesiones),
    molestias: toNullableString(d.molestias),
    datos_laboratorio: toNullableString(d.datos_laboratorio),
    motivos_consulta: toNullableString(d.motivos_consulta),
    observaciones_internas: toNullableString(d.observaciones_internas),
    updated_by: user.id,
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
