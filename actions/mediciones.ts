'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { haceDiasArgentina, hoyArgentina } from '@/lib/datetime'
import { createClient } from '@/lib/supabase/server'

export type MedicionState = { ok?: boolean; error?: string }

const schema = z.object({
  paciente_id: z.string().uuid(),
  fecha_medicion: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((v) => v >= haceDiasArgentina(7) && v <= hoyArgentina(), 'La fecha debe estar dentro de los últimos 7 días'),
  peso_kg: z.string().optional().or(z.literal('')),
  talla_cm: z.string().optional().or(z.literal('')),
  porc_grasa: z.string().optional().or(z.literal('')),
  porc_masa_muscular: z.string().optional().or(z.literal('')),
  kg_grasa: z.string().optional().or(z.literal('')),
  kg_musculo: z.string().optional().or(z.literal('')),
  dx_antropometrico: z.string().max(500).optional().or(z.literal('')),
  observaciones: z.string().max(2000).optional().or(z.literal('')),
})

const toNum = (v: string | undefined) => {
  if (!v || v.trim() === '') return null
  const n = Number(v.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
const toStr = (v: string | undefined) => (v && v.trim() !== '' ? v.trim() : null)

async function getStaff() {
  const supabase = createClient()
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
  if (!parsed.success) return { error: 'Datos inválidos' }

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

export async function eliminarMedicionAction(formData: FormData) {
  const id = Number(formData.get('id'))
  const paciente_id = String(formData.get('paciente_id') ?? '')
  if (!id) return
  const ctx = await getStaff()
  if ('error' in ctx) return
  await ctx.supabase.from('mediciones_antropometricas').delete().eq('id', id)
  revalidatePath(`/admin/pacientes/${paciente_id}/antropometria`)
}
