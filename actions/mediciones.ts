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

const schema = z.object({
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
  dx_antropometrico: z.string().max(500).optional().or(z.literal('')),
  observaciones: z.string().max(2000).optional().or(z.literal('')),
}).refine(
  (d) =>
    [d.peso_kg, d.talla_cm, d.porc_grasa, d.porc_masa_muscular, d.kg_grasa, d.kg_musculo].some(
      (v) => (v ?? '').trim() !== '',
    ),
  { message: 'Cargá al menos un dato de la medición.', path: ['peso_kg'] },
)

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
