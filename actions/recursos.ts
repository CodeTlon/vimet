'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { authStaff } from '@/lib/auth/session'
import { crearRecurso, recursoEliminar, recursoVisibilidad } from '@/lib/services/recursos'

export type RecursoState = { ok?: boolean; error?: string }

// Solo staff gestiona recursos (policy `recursos staff all`).
const requireStaff = authStaff

export async function crearRecursoAction(_prev: unknown, formData: FormData): Promise<RecursoState> {
  const ctx = await requireStaff()
  if ('error' in ctx) return { error: ctx.error }

  const paciente_id = String(formData.get('paciente_id') ?? '')
  const planIdRaw = String(formData.get('plan_id') ?? '')

  const res = await crearRecurso(ctx.user.id, {
    tipo: String(formData.get('tipo') ?? ''),
    paciente_id,
    categoria: String(formData.get('categoria') ?? ''),
    titulo: String(formData.get('titulo') ?? ''),
    descripcion: String(formData.get('descripcion') ?? ''),
    visible_paciente: formData.get('visible_paciente') === 'true',
    plan_id: planIdRaw ? Number(planIdRaw) || null : null,
    url: String(formData.get('url') ?? ''),
    archivo: formData.get('archivo') as File | null,
  })
  if (!res.ok) return { error: res.error }

  revalidatePath(`/admin/pacientes/${paciente_id}/recursos`)
  revalidatePath('/mis-recursos')
  return { ok: true }
}

export async function eliminarRecursoAction(formData: FormData) {
  const id = Number(formData.get('id'))
  const paciente_id = String(formData.get('paciente_id') ?? '')
  if (!id) return

  const ctx = await requireStaff()
  if ('error' in ctx) return

  await recursoEliminar(id, paciente_id)
  revalidatePath(`/admin/pacientes/${paciente_id}/recursos`)
  revalidatePath('/mis-recursos')
}

const toggleSchema = z.object({
  id: z.coerce.number().int().positive(),
  paciente_id: z.string().uuid(),
  visible_paciente: z.enum(['true', 'false']),
})

export async function toggleVisibilidadRecursoAction(formData: FormData) {
  const parsed = toggleSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return

  const ctx = await requireStaff()
  if ('error' in ctx) return

  await recursoVisibilidad(parsed.data.id, parsed.data.paciente_id, parsed.data.visible_paciente === 'true')

  revalidatePath(`/admin/pacientes/${parsed.data.paciente_id}/recursos`)
  revalidatePath('/mis-recursos')
}
