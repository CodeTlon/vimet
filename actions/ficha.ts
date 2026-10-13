'use server'

import { revalidatePath } from 'next/cache'

import { authStaff } from '@/lib/auth/session'
import { guardarFicha, type FichaState } from '@/lib/services/ficha'

export type { FichaState }

// Solo staff escribe fichas (policy `fichas staff write`). La logica vive en lib/services/ficha.ts.
export async function guardarFichaAction(_prev: unknown, formData: FormData): Promise<FichaState> {
  const ctx = await authStaff()
  if ('error' in ctx) return { error: ctx.error }

  const raw = Object.fromEntries(formData)
  const res = await guardarFicha(ctx.user.id, raw)
  if (!res.ok) return res

  const pacienteId = String(raw.paciente_id ?? '')
  revalidatePath(`/admin/pacientes/${pacienteId}`)
  revalidatePath(`/admin/pacientes/${pacienteId}/ficha`)
  revalidatePath('/mi-ficha')
  return { ok: true }
}
