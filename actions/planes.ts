'use server'

import { revalidatePath } from 'next/cache'

import { authStaff, authUsuario } from '@/lib/auth/session'
import {
  actualizarPlan,
  crearPlan,
  eliminarPlan,
  urlArchivoPlan,
  type PlanState,
} from '@/lib/services/planes'

export type { PlanState }

// Solo staff escribe planes (policy `planes staff write`). La logica vive en lib/services/planes.ts.
export async function crearPlanAction(_prev: unknown, formData: FormData): Promise<PlanState> {
  const ctx = await authStaff()
  if ('error' in ctx) return { error: ctx.error }
  const res = await crearPlan(ctx.user.id, Object.fromEntries(formData), formData.get('archivo') as File | null)
  if (res.paciente_id) {
    revalidatePath(`/admin/pacientes/${res.paciente_id}/planes`)
    revalidatePath('/mis-planes')
  }
  return { ok: res.ok, error: res.error, planId: res.planId }
}

export async function actualizarPlanAction(_prev: unknown, formData: FormData): Promise<PlanState> {
  const ctx = await authStaff()
  if ('error' in ctx) return { error: ctx.error }
  const res = await actualizarPlan(ctx.user.id, Object.fromEntries(formData), formData.get('archivo') as File | null)
  if (res.paciente_id && res.planId) {
    revalidatePath(`/admin/pacientes/${res.paciente_id}/planes`)
    revalidatePath(`/admin/pacientes/${res.paciente_id}/planes/${res.planId}`)
    revalidatePath('/mis-planes')
    revalidatePath(`/mis-planes/${res.planId}`)
  }
  return { ok: res.ok, error: res.error, planId: res.planId }
}

export async function eliminarPlanAction(formData: FormData) {
  const ctx = await authStaff()
  if ('error' in ctx) return
  const pacienteId = String(formData.get('paciente_id') ?? '')
  await eliminarPlan(ctx.user.id, Number(formData.get('id')), pacienteId || undefined)
  revalidatePath(`/admin/pacientes/${pacienteId}/planes`)
  revalidatePath('/mis-planes')
}

// URL firmada para descargar/visualizar el PDF (paciente dueño o staff).
export async function obtenerUrlPlanAction(formData: FormData): Promise<{ url?: string; error?: string }> {
  const ctx = await authUsuario()
  if ('error' in ctx) return { error: ctx.error }
  return urlArchivoPlan(ctx.profile, Number(formData.get('id')))
}
