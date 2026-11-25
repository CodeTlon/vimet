'use server'

import { revalidatePath } from 'next/cache'

import { authUsuario } from '@/lib/auth/session'
import {
  editarMensajeFeedback,
  enviarFeedback,
  enviarMensajeFeedback,
  type FeedbackState,
} from '@/lib/services/feedback'

export type { FeedbackState }

// La logica vive en lib/services/feedback.ts; acá solo se toma la identidad de la sesion.
export async function enviarFeedbackAction(_prev: unknown, formData: FormData): Promise<FeedbackState> {
  const ctx = await authUsuario()
  if ('error' in ctx) return { error: ctx.error }
  const res = await enviarFeedback(ctx.user.id, Object.fromEntries(formData), formData.get('adjunto') as File | null)
  if (res.ok) {
    revalidatePath('/feedback-semanal')
    revalidatePath('/admin/pacientes')
  }
  return res
}

export async function enviarMensajeFeedbackAction(_prev: unknown, formData: FormData): Promise<FeedbackState> {
  const ctx = await authUsuario()
  if ('error' in ctx) return { error: ctx.error }
  const res = await enviarMensajeFeedback(ctx.profile, Object.fromEntries(formData))
  if (res.paciente_id) {
    revalidatePath('/feedback-semanal')
    revalidatePath(`/admin/pacientes/${res.paciente_id}/feedback`)
  }
  return { ok: res.ok, error: res.error }
}

export async function editarMensajeFeedbackAction(_prev: unknown, formData: FormData): Promise<FeedbackState> {
  const ctx = await authUsuario()
  if ('error' in ctx) return { error: ctx.error }
  const res = await editarMensajeFeedback(ctx.user.id, Object.fromEntries(formData))
  if (res.paciente_id) {
    revalidatePath('/feedback-semanal')
    revalidatePath(`/admin/pacientes/${res.paciente_id}/feedback`)
  }
  return { ok: res.ok, error: res.error }
}
