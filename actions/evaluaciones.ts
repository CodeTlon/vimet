'use server'

import { revalidatePath } from 'next/cache'

import { authStaff } from '@/lib/auth/session'
import {
  actualizarEvaluacion,
  crearEvaluacion,
  eliminarEvaluacion,
  type EvalState,
} from '@/lib/services/evaluaciones'

export type { EvalState }

// Solo staff escribe evaluaciones (policy `evals staff write`). La logica vive en lib/services.
export async function crearEvaluacionAction(_prev: unknown, formData: FormData): Promise<EvalState> {
  const ctx = await authStaff()
  if ('error' in ctx) return { error: ctx.error }
  const res = await crearEvaluacion(ctx.user.id, Object.fromEntries(formData))
  if (res.paciente_id) revalidatePath(`/admin/pacientes/${res.paciente_id}/evaluacion-funcional`)
  return { ok: res.ok, error: res.error }
}

export async function actualizarEvaluacionAction(_prev: unknown, formData: FormData): Promise<EvalState> {
  const ctx = await authStaff()
  if ('error' in ctx) return { error: ctx.error }
  const res = await actualizarEvaluacion(ctx.user.id, Object.fromEntries(formData))
  if (res.paciente_id) revalidatePath(`/admin/pacientes/${res.paciente_id}/evaluacion-funcional`)
  return { ok: res.ok, error: res.error }
}

export async function eliminarEvaluacionAction(_prev: unknown, formData: FormData): Promise<EvalState> {
  const ctx = await authStaff()
  if ('error' in ctx) return { error: ctx.error }
  const res = await eliminarEvaluacion(ctx.user.id, Number(formData.get('id')))
  if (res.ok) revalidatePath(`/admin/pacientes/${String(formData.get('paciente_id') ?? '')}/evaluacion-funcional`)
  return res
}
