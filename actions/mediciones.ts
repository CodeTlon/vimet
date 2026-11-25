'use server'

import { revalidatePath } from 'next/cache'

import { authStaff } from '@/lib/auth/session'
import {
  actualizarMedicion,
  crearMedicion,
  eliminarMedicion,
  type MedicionState,
} from '@/lib/services/mediciones'

export type { MedicionState }

// Solo staff escribe mediciones (policy `mediciones staff write`). La logica vive en lib/services.
function revalidar(pacienteId: string) {
  revalidatePath(`/admin/pacientes/${pacienteId}`)
  revalidatePath(`/admin/pacientes/${pacienteId}/antropometria`)
  revalidatePath('/mi-progreso')
}

export async function crearMedicionAction(_prev: unknown, formData: FormData): Promise<MedicionState> {
  const ctx = await authStaff()
  if ('error' in ctx) return { error: ctx.error }
  const res = await crearMedicion(ctx.user.id, Object.fromEntries(formData))
  if (res.paciente_id) revalidar(res.paciente_id)
  return { ok: res.ok, error: res.error }
}

export async function actualizarMedicionAction(_prev: unknown, formData: FormData): Promise<MedicionState> {
  const ctx = await authStaff()
  if ('error' in ctx) return { error: ctx.error }
  const res = await actualizarMedicion(ctx.user.id, Object.fromEntries(formData))
  if (res.paciente_id) revalidar(res.paciente_id)
  return { ok: res.ok, error: res.error }
}

export async function eliminarMedicionAction(_prev: unknown, formData: FormData): Promise<MedicionState> {
  const ctx = await authStaff()
  if ('error' in ctx) return { error: ctx.error }
  const res = await eliminarMedicion(ctx.user.id, Number(formData.get('id')))
  if (res.ok) {
    revalidatePath(`/admin/pacientes/${String(formData.get('paciente_id') ?? '')}/antropometria`)
    revalidatePath('/mi-progreso')
  }
  return res
}
