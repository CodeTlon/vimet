'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { haceDiasArgentina, hoyArgentina } from '@/lib/datetime'
import { createClient } from '@/lib/supabase/server'

export type MedicionState = { ok?: boolean; error?: string }

// Campo numérico opcional cargado como string desde un <input>: si viene con
// contenido, tiene que parsear a un número dentro de un rango fisiológico
// razonable. Vacío sigue siendo válido (no todos los campos se cargan juntos).
const numStr = (min: number, max: number, label: string) =>
  z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => {
      if (!v || v.trim() === '') return true
      const n = Number(v.replace(',', '.'))
      return Number.isFinite(n) && n >= min && n <= max
    }, `${label} debe estar entre ${min} y ${max}`)

// Cada grupo se completa entero o se deja entero vacío — un subconjunto
// parcial (ej. un solo pliegue de los 13 de ISAK) no sirve para calcular
// nada y queda como basura en el histórico. dx_antropometrico/observaciones
// quedan afuera de esta regla: son anotaciones de texto libre, nunca
// alcanzaron por sí solas para guardar una medición.
const CAMPOS_BASICOS = ['peso_kg', 'talla_cm', 'porc_grasa', 'porc_masa_muscular', 'kg_grasa', 'kg_musculo'] as const
const CAMPOS_ISAK = [
  'pliegue_triceps_mm',
  'pliegue_subescapular_mm',
  'pliegue_supraespinal_mm',
  'pliegue_abdominal_mm',
  'pliegue_muslo_mm',
  'pliegue_pierna_mm',
  'pliegue_biceps_mm',
  'pliegue_cresta_iliaca_mm',
  'perimetro_brazo_cm',
  'perimetro_muslo_cm',
  'perimetro_pierna_cm',
  'kg_tejido_muscular',
  'kg_tejido_oseo',
] as const

function estadoGrupo(d: Record<string, unknown>, campos: readonly string[]) {
  const llenos = campos.filter((c) => String(d[c] ?? '').trim() !== '').length
  if (llenos === 0) return 'vacio' as const
  if (llenos === campos.length) return 'completo' as const
  return 'parcial' as const
}

const schema = z
  .object({
    id: z.coerce.number().int().positive().optional(),
    paciente_id: z.string().uuid(),
    fecha_medicion: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((v) => v >= haceDiasArgentina(7) && v <= hoyArgentina(), 'La fecha debe estar dentro de los últimos 7 días'),
    peso_kg: numStr(1, 400, 'El peso'),
    talla_cm: numStr(30, 250, 'La talla'),
    porc_grasa: numStr(0, 100, 'El % de grasa'),
    porc_masa_muscular: numStr(0, 100, 'El % de masa muscular'),
    kg_grasa: numStr(0, 200, 'Los kg de grasa'),
    kg_musculo: numStr(0, 200, 'Los kg de músculo'),
    pliegue_triceps_mm: numStr(1, 80, 'El pliegue tricipital'),
    pliegue_subescapular_mm: numStr(1, 80, 'El pliegue subescapular'),
    pliegue_supraespinal_mm: numStr(1, 80, 'El pliegue supraespinal'),
    pliegue_abdominal_mm: numStr(1, 80, 'El pliegue abdominal'),
    pliegue_muslo_mm: numStr(1, 80, 'El pliegue del muslo'),
    pliegue_pierna_mm: numStr(1, 80, 'El pliegue de la pierna'),
    pliegue_biceps_mm: numStr(1, 80, 'El pliegue bicipital'),
    pliegue_cresta_iliaca_mm: numStr(1, 80, 'El pliegue de cresta ilíaca'),
    perimetro_brazo_cm: numStr(10, 100, 'El perímetro de brazo'),
    perimetro_muslo_cm: numStr(10, 120, 'El perímetro de muslo'),
    perimetro_pierna_cm: numStr(10, 100, 'El perímetro de pierna'),
    kg_tejido_muscular: numStr(0, 100, 'Los kg de tejido muscular'),
    kg_tejido_oseo: numStr(0, 30, 'Los kg de tejido óseo'),
    dx_antropometrico: z.string().max(500).optional().or(z.literal('')),
    observaciones: z.string().max(2000).optional().or(z.literal('')),
  })
  .superRefine((d, ctx) => {
    const basicos = estadoGrupo(d, CAMPOS_BASICOS)
    const isak = estadoGrupo(d, CAMPOS_ISAK)

    if (basicos === 'parcial') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Completá todos los campos de Medidas básicas (peso, talla, % grasa, % músculo, kg grasa, kg músculo) o dejalos todos vacíos.',
        path: ['peso_kg'],
      })
    }
    if (isak === 'parcial') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Completá los 13 campos de Datos ISAK o dejalos todos vacíos.',
        path: ['pliegue_triceps_mm'],
      })
    }
    if (basicos === 'vacio' && isak === 'vacio') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Cargá al menos un dato de la medición.',
        path: ['peso_kg'],
      })
    }
  })

const toNum = (v: string | undefined) => {
  if (!v || v.trim() === '') return null
  const n = Number(v.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
const toStr = (v: string | undefined) => (v && v.trim() !== '' ? v.trim() : null)

async function getStaff() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' as const }
  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile || !['nutricionista', 'entrenador', 'admin'].includes(profile.rol)) {
    return { error: 'No autorizado' as const }
  }
  return { user, supabase }
}

export async function crearMedicionAction(
  _prev: unknown,
  formData: FormData,
): Promise<MedicionState> {
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const ctx = await getStaff()
  if ('error' in ctx) return { error: ctx.error }

  const d = parsed.data
  const peso = toNum(d.peso_kg)
  const talla = toNum(d.talla_cm)
  const imc =
    peso != null && talla != null && talla > 0
      ? Math.round((peso / Math.pow(talla / 100, 2)) * 100) / 100
      : null

  const { error } = await ctx.supabase.from('mediciones_antropometricas').insert({
    paciente_id: d.paciente_id,
    fecha_medicion: d.fecha_medicion,
    peso_kg: peso,
    talla_cm: talla,
    imc,
    porc_grasa: toNum(d.porc_grasa),
    porc_masa_muscular: toNum(d.porc_masa_muscular),
    kg_grasa: toNum(d.kg_grasa),
    kg_musculo: toNum(d.kg_musculo),
    pliegue_triceps_mm: toNum(d.pliegue_triceps_mm),
    pliegue_subescapular_mm: toNum(d.pliegue_subescapular_mm),
    pliegue_supraespinal_mm: toNum(d.pliegue_supraespinal_mm),
    pliegue_abdominal_mm: toNum(d.pliegue_abdominal_mm),
    pliegue_muslo_mm: toNum(d.pliegue_muslo_mm),
    pliegue_pierna_mm: toNum(d.pliegue_pierna_mm),
    pliegue_biceps_mm: toNum(d.pliegue_biceps_mm),
    pliegue_cresta_iliaca_mm: toNum(d.pliegue_cresta_iliaca_mm),
    perimetro_brazo_cm: toNum(d.perimetro_brazo_cm),
    perimetro_muslo_cm: toNum(d.perimetro_muslo_cm),
    perimetro_pierna_cm: toNum(d.perimetro_pierna_cm),
    kg_tejido_muscular: toNum(d.kg_tejido_muscular),
    kg_tejido_oseo: toNum(d.kg_tejido_oseo),
    dx_antropometrico: toStr(d.dx_antropometrico),
    observaciones: toStr(d.observaciones),
    registrado_por: ctx.user.id,
  })

  if (error) return { error: 'No se pudo guardar la medición.' }

  revalidatePath(`/admin/pacientes/${d.paciente_id}`)
  revalidatePath(`/admin/pacientes/${d.paciente_id}/antropometria`)
  revalidatePath('/mi-progreso')
  return { ok: true }
}

export async function actualizarMedicionAction(
  _prev: unknown,
  formData: FormData,
): Promise<MedicionState> {
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  if (!parsed.data.id) return { error: 'Falta el id de la medición.' }

  const ctx = await getStaff()
  if ('error' in ctx) return { error: ctx.error }

  const d = parsed.data
  const peso = toNum(d.peso_kg)
  const talla = toNum(d.talla_cm)
  const imc =
    peso != null && talla != null && talla > 0
      ? Math.round((peso / Math.pow(talla / 100, 2)) * 100) / 100
      : null

  const { error } = await ctx.supabase
    .from('mediciones_antropometricas')
    .update({
      fecha_medicion: d.fecha_medicion,
      peso_kg: peso,
      talla_cm: talla,
      imc,
      porc_grasa: toNum(d.porc_grasa),
      porc_masa_muscular: toNum(d.porc_masa_muscular),
      kg_grasa: toNum(d.kg_grasa),
      kg_musculo: toNum(d.kg_musculo),
      pliegue_triceps_mm: toNum(d.pliegue_triceps_mm),
      pliegue_subescapular_mm: toNum(d.pliegue_subescapular_mm),
      pliegue_supraespinal_mm: toNum(d.pliegue_supraespinal_mm),
      pliegue_abdominal_mm: toNum(d.pliegue_abdominal_mm),
      pliegue_muslo_mm: toNum(d.pliegue_muslo_mm),
      pliegue_pierna_mm: toNum(d.pliegue_pierna_mm),
      pliegue_biceps_mm: toNum(d.pliegue_biceps_mm),
      pliegue_cresta_iliaca_mm: toNum(d.pliegue_cresta_iliaca_mm),
      perimetro_brazo_cm: toNum(d.perimetro_brazo_cm),
      perimetro_muslo_cm: toNum(d.perimetro_muslo_cm),
      perimetro_pierna_cm: toNum(d.perimetro_pierna_cm),
      kg_tejido_muscular: toNum(d.kg_tejido_muscular),
      kg_tejido_oseo: toNum(d.kg_tejido_oseo),
      dx_antropometrico: toStr(d.dx_antropometrico),
      observaciones: toStr(d.observaciones),
    })
    .eq('id', d.id)

  if (error) return { error: 'No se pudo actualizar la medición.' }

  revalidatePath(`/admin/pacientes/${d.paciente_id}`)
  revalidatePath(`/admin/pacientes/${d.paciente_id}/antropometria`)
  revalidatePath('/mi-progreso')
  return { ok: true }
}

export async function eliminarMedicionAction(
  _prev: unknown,
  formData: FormData,
): Promise<MedicionState> {
  const id = Number(formData.get('id'))
  const paciente_id = String(formData.get('paciente_id') ?? '')
  if (!id) return { error: 'Datos inválidos' }
  const ctx = await getStaff()
  if ('error' in ctx) return { error: ctx.error }
  const { error } = await ctx.supabase.from('mediciones_antropometricas').delete().eq('id', id)
  if (error) return { error: 'No se pudo eliminar la medición.' }
  revalidatePath(`/admin/pacientes/${paciente_id}/antropometria`)
  revalidatePath('/mi-progreso')
  return { ok: true }
}
