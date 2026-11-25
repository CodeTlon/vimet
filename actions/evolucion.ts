'use server'

import { revalidatePath } from 'next/cache'

import { authStaff } from '@/lib/auth/session'
import {
  actualizarEntradaEvolucion,
  crearEntradaEvolucion,
  eliminarEntradaEvolucion,
  type EvolucionState,
} from '@/lib/services/evolucion'

export type { EvolucionState }

// Solo staff escribe evolucion (policy `evolucion staff all`). La logica vive en lib/services.
export async function crearEntradaEvolucionAction(_prev: unknown, formData: FormData): Promise<EvolucionState> {
  const ctx = await authStaff()
  if ('error' in ctx) return { error: ctx.error }
  const res = await crearEntradaEvolucion(ctx.user.id, Object.fromEntries(formData))
  if (res.paciente_id) {
    revalidatePath(`/admin/pacientes/${res.paciente_id}/evolucion`)
    revalidatePath('/mi-progreso')
  }
  return { ok: res.ok, error: res.error }
}

export async function actualizarEntradaEvolucionAction(_prev: unknown, formData: FormData): Promise<EvolucionState> {
  const ctx = await authStaff()
  if ('error' in ctx) return { error: ctx.error }
  const res = await actualizarEntradaEvolucion(ctx.user.id, Object.fromEntries(formData))
  if (res.paciente_id) {
    revalidatePath(`/admin/pacientes/${res.paciente_id}/evolucion`)
    revalidatePath('/mi-progreso')
  }
  return { ok: res.ok, error: res.error }
}

export async function eliminarEntradaEvolucionAction(formData: FormData) {
  const ctx = await authStaff()
  if ('error' in ctx) return
  const pacienteId = String(formData.get('paciente_id') ?? '')
  await eliminarEntradaEvolucion(ctx.user.id, Number(formData.get('id')), pacienteId || undefined)
  revalidatePath(`/admin/pacientes/${pacienteId}/evolucion`)
}
