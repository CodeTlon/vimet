'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'

export type PlanState = { ok?: boolean; error?: string; planId?: number }

const planObjectSchema = z.object({
  paciente_id: z.string().uuid(),
  tipo: z.enum(['nutricion', 'entrenamiento', 'combo']),
  titulo: z.string().min(1, 'Indicá un título').max(200),
  estado: z.enum(['vigente', 'archivado', 'borrador']).default('vigente'),
  fecha_desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fecha_hasta: z.string().optional().or(z.literal('')),
  // nutri
  pautas_generales: z.string().max(4000).optional().or(z.literal('')),
  pautas_hidratacion: z.string().max(2000).optional().or(z.literal('')),
  pre_entreno: z.string().max(1000).optional().or(z.literal('')),
  intra_entreno: z.string().max(1000).optional().or(z.literal('')),
  post_entreno: z.string().max(1000).optional().or(z.literal('')),
  suplementacion: z.string().max(2000).optional().or(z.literal('')),
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

const baseSchema = planObjectSchema.refine(vigenciaRefine, vigenciaRefineOpts)

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

function buildPayload(d: z.infer<typeof baseSchema>, profesional_id: string) {
  return {
    paciente_id: d.paciente_id,
    profesional_id,
    tipo: d.tipo,
    titulo: d.titulo,
    estado: d.estado,
    fecha_desde: d.fecha_desde,
    fecha_hasta: toStr(d.fecha_hasta),
    pautas_generales: toStr(d.pautas_generales),
    pautas_hidratacion: toStr(d.pautas_hidratacion),
    pre_entreno: toStr(d.pre_entreno),
    intra_entreno: toStr(d.intra_entreno),
    post_entreno: toStr(d.post_entreno),
    suplementacion: toStr(d.suplementacion),
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
    notas: toStr(d.notas),
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

  const payload = buildPayload(d, ctx.user.id)

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
    const { error: upErr } = await ctx.supabase.storage
      .from('planes')
      .upload(archivo_path, buf, { contentType: 'application/pdf', upsert: false })
    if (upErr) return { error: 'No se pudo subir el PDF.' }
  }

  const { data: created, error } = await ctx.supabase
    .from('planes')
    .insert({ ...payload, archivo_path })
    .select('id')
    .single()

  if (error) return { error: 'No se pudo crear el plan.' }

  revalidatePath(`/admin/pacientes/${d.paciente_id}/planes`)
  revalidatePath('/mis-planes')
  return { ok: true, planId: created.id }
}

const updateSchema = planObjectSchema
  .extend({ id: z.string().regex(/^\d+$/) })
  .refine(vigenciaRefine, vigenciaRefineOpts)

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

  const payload: Record<string, unknown> = buildPayload(d, ctx.user.id)

  if (file && file.size > 0) {
    if (file.type !== 'application/pdf') return { error: 'El archivo debe ser PDF.' }
    if (file.size > 15 * 1024 * 1024) return { error: 'El PDF supera 15MB.' }

    const { data: prev } = await ctx.supabase
      .from('planes')
      .select('archivo_path')
      .eq('id', id)
      .maybeSingle()

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const archivo_path = `${d.paciente_id}/${Date.now()}_${safeName}`
    const buf = Buffer.from(await file.arrayBuffer())
    const { error: upErr } = await ctx.supabase.storage
      .from('planes')
      .upload(archivo_path, buf, { contentType: 'application/pdf', upsert: false })
    if (upErr) return { error: 'No se pudo subir el PDF.' }
    payload.archivo_path = archivo_path

    // Si había un PDF previo, lo borramos del bucket recién después de subir el
    // nuevo: así nunca quedan huérfanos y si falla el upload no perdemos el viejo.
    if (prev?.archivo_path && prev.archivo_path !== archivo_path) {
      await ctx.supabase.storage.from('planes').remove([prev.archivo_path])
    }
  }

  const { error } = await ctx.supabase.from('planes').update(payload).eq('id', id)
  if (error) return { error: 'No se pudo actualizar el plan.' }

  revalidatePath(`/admin/pacientes/${d.paciente_id}/planes`)
  revalidatePath(`/admin/pacientes/${d.paciente_id}/planes/${id}`)
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
  const { data: plan } = await ctx.supabase
    .from('planes')
    .select('archivo_path')
    .eq('id', id)
    .maybeSingle()
  if (plan?.archivo_path) {
    await ctx.supabase.storage.from('planes').remove([plan.archivo_path])
  }
  await ctx.supabase.from('planes').delete().eq('id', id)
  revalidatePath(`/admin/pacientes/${paciente_id}/planes`)
  revalidatePath('/mis-planes')
}

// Genera URL firmada para descargar/visualizar el PDF
export async function obtenerUrlPlanAction(formData: FormData): Promise<{ url?: string; error?: string }> {
  const id = Number(formData.get('id'))
  if (!id) return { error: 'Plan inválido' }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: plan } = await supabase
    .from('planes')
    .select('paciente_id, archivo_path')
    .eq('id', id)
    .maybeSingle()
  if (!plan?.archivo_path) return { error: 'Plan sin archivo' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle()
  const isStaff =
    profile && ['nutricionista', 'entrenador', 'admin'].includes(profile.rol)
  if (!isStaff && plan.paciente_id !== user.id) return { error: 'No autorizado' }

  const { data: signed, error } = await supabase.storage
    .from('planes')
    .createSignedUrl(plan.archivo_path, 60 * 5)
  if (error || !signed) return { error: 'No se pudo generar el enlace' }
  return { url: signed.signedUrl }
}
