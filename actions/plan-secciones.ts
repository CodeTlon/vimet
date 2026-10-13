'use server'

import { revalidatePath } from 'next/cache'

import { authStaff } from '@/lib/auth/session'
import {
  actualizarSeccion,
  crearSeccion,
  eliminarImagenSeccion,
  eliminarSeccion,
  moverSeccion,
  type SeccionState,
} from '@/lib/services/plan-secciones'

export type { SeccionState }

// Solo staff escribe secciones de plan (policies `plan_secciones*  staff write`). La logica vive en lib/services.
function revalidar(pacienteId: string, planId: number) {
  revalidatePath(`/admin/pacientes/${pacienteId}/planes/${planId}`)
  revalidatePath(`/mis-planes/${planId}`)
}

// El form web repite `momento_nombre` / `momento_contenido`: Object.fromEntries los pisaria.
function rawDelForm(formData: FormData): Record<string, unknown> {
  const raw: Record<string, unknown> = Object.fromEntries(formData)
  raw.momento_nombre = formData.getAll('momento_nombre').map(String)
  raw.momento_contenido = formData.getAll('momento_contenido').map(String)
  return raw
}

export async function crearSeccionAction(_prev: unknown, formData: FormData): Promise<SeccionState> {
  const ctx = await authStaff()
  if ('error' in ctx) return { error: ctx.error }
  const res = await crearSeccion(rawDelForm(formData), formData.getAll('imagenes') as File[])
  if (res.paciente_id && res.plan_id) revalidar(res.paciente_id, res.plan_id)
  return { ok: res.ok, error: res.error }
}

export async function actualizarSeccionAction(_prev: unknown, formData: FormData): Promise<SeccionState> {
  const ctx = await authStaff()
  if ('error' in ctx) return { error: ctx.error }
  const res = await actualizarSeccion(rawDelForm(formData), formData.getAll('imagenes') as File[])
  if (res.paciente_id && res.plan_id) revalidar(res.paciente_id, res.plan_id)
  return { ok: res.ok, error: res.error }
}

export async function eliminarSeccionAction(formData: FormData) {
  const ctx = await authStaff()
  if ('error' in ctx) return
  const planId = Number(formData.get('plan_id'))
  await eliminarSeccion(Number(formData.get('id')), planId)
  revalidar(String(formData.get('paciente_id') ?? ''), planId)
}

export async function eliminarImagenSeccionAction(formData: FormData) {
  const ctx = await authStaff()
  if ('error' in ctx) return
  const planId = Number(formData.get('plan_id'))
  await eliminarImagenSeccion(Number(formData.get('id')), planId)
  revalidar(String(formData.get('paciente_id') ?? ''), planId)
}

export async function moverSeccionAction(formData: FormData) {
  const ctx = await authStaff()
  if ('error' in ctx) return
  const direccion = String(formData.get('direccion') ?? '')
  if (direccion !== 'subir' && direccion !== 'bajar') return
  const planId = Number(formData.get('plan_id'))
  await moverSeccion(Number(formData.get('id')), planId, direccion)
  revalidar(String(formData.get('paciente_id') ?? ''), planId)
}
