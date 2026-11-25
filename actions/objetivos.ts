'use server'

import { revalidatePath } from 'next/cache'

import { authStaff } from '@/lib/auth/session'
import {
  cambiarEstadoObjetivo,
  crearObjetivo,
  eliminarObjetivo,
  type ObjetivoState,
} from '@/lib/services/objetivos'

export type { ObjetivoState }

// Solo staff escribe objetivos (policy `objetivos staff write`). La logica vive en lib/services.
export async function crearObjetivoAction(_prev: unknown, formData: FormData): Promise<ObjetivoState> {
  const ctx = await authStaff()
  if ('error' in ctx) return { error: ctx.error }
  const res = await crearObjetivo(ctx.user.id, Object.fromEntries(formData))
  if (res.paciente_id) {
    revalidatePath(`/admin/pacientes/${res.paciente_id}/objetivos`)
    revalidatePath('/mis-objetivos')
  }
  return { ok: res.ok, error: res.error }
}

export async function cambiarEstadoObjetivoAction(formData: FormData) {
  const ctx = await authStaff()
  if ('error' in ctx) return
  const res = await cambiarEstadoObjetivo(Object.fromEntries(formData))
  if (res.paciente_id) {
    revalidatePath(`/admin/pacientes/${res.paciente_id}/objetivos`)
    revalidatePath('/mis-objetivos')
  }
}

export async function eliminarObjetivoAction(formData: FormData) {
  const ctx = await authStaff()
  if ('error' in ctx) return
  const pacienteId = String(formData.get('paciente_id') ?? '')
  await eliminarObjetivo(Number(formData.get('id')), pacienteId || undefined)
  revalidatePath(`/admin/pacientes/${pacienteId}/objetivos`)
  revalidatePath('/mis-objetivos')
}
