'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { objetivos } from '@/db/schema'
import { authStaff } from '@/lib/auth/session'
import { hoyArgentina } from '@/lib/datetime'
import { db } from '@/lib/db'

export type ObjetivoState = { ok?: boolean; error?: string }

const schema = z.object({
  paciente_id: z.string().uuid(),
  categoria: z.enum(['nutricional', 'antropometrico', 'clinico', 'entrenamiento', 'rendimiento']),
  descripcion: z.string().min(1, 'Escribí el objetivo').max(500),
  estado: z.enum(['pendiente', 'en_progreso', 'cumplido', 'descartado']).default('pendiente'),
  fecha_objetivo: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || v >= hoyArgentina(), 'La fecha objetivo no puede ser pasada'),
})

// Solo staff escribe objetivos (policy `objetivos staff write`).
const getStaff = authStaff

export async function crearObjetivoAction(
  _prev: unknown,
  formData: FormData,
): Promise<ObjetivoState> {
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const ctx = await getStaff()
  if ('error' in ctx) return { error: ctx.error }

  const d = parsed.data
  try {
    await db.insert(objetivos).values({
      paciente_id: d.paciente_id,
      categoria: d.categoria,
      descripcion: d.descripcion,
      estado: d.estado,
      fecha_objetivo: d.fecha_objetivo && d.fecha_objetivo !== '' ? d.fecha_objetivo : null,
      registrado_por: ctx.user.id,
    })
  } catch (err) {
    console.error('crearObjetivoAction:', err)
    return { error: 'No se pudo crear el objetivo.' }
  }

  revalidatePath(`/admin/pacientes/${d.paciente_id}/objetivos`)
  revalidatePath('/mis-objetivos')
  return { ok: true }
}

const cambioEstadoSchema = z.object({
  id: z.coerce.number().int().positive(),
  paciente_id: z.string().uuid(),
  estado: z.enum(['pendiente', 'en_progreso', 'cumplido', 'descartado']),
})

export async function cambiarEstadoObjetivoAction(formData: FormData) {
  const parsed = cambioEstadoSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return
  const ctx = await getStaff()
  if ('error' in ctx) return
  await db.update(objetivos).set({ estado: parsed.data.estado }).where(eq(objetivos.id, parsed.data.id))
  revalidatePath(`/admin/pacientes/${parsed.data.paciente_id}/objetivos`)
  revalidatePath('/mis-objetivos')
}

export async function eliminarObjetivoAction(formData: FormData) {
  const id = Number(formData.get('id'))
  const paciente_id = String(formData.get('paciente_id') ?? '')
  if (!id) return
  const ctx = await getStaff()
  if ('error' in ctx) return
  await db.delete(objetivos).where(eq(objetivos.id, id))
  revalidatePath(`/admin/pacientes/${paciente_id}/objetivos`)
  revalidatePath('/mis-objetivos')
}
