'use server'

import { getSessionUser } from '@/lib/auth/session'
import {
  actualizarTurnoStaff,
  adminEstadoSchema,
  cancelarTurno,
  confirmarTurno,
  crearTurno,
  reprogramarStaffSchema,
  reprogramarTurno,
  type TurnoState,
} from '@/lib/services/turnos'
import { crearSchema } from '@/lib/validation/turnos'

export type { TurnoState }

// Server Actions de turnos (web). Solo exportan las *Action: toman la identidad de la sesion y
// delegan en lib/services/turnos.ts. Las reglas de negocio NO viven aca porque todo export de un
// archivo 'use server' es invocable desde el cliente.

export async function crearTurnoAction(_prev: unknown, formData: FormData): Promise<TurnoState> {
  const parsed = crearSchema.safeParse({
    profesional_id: formData.get('profesional_id'),
    servicio_id: formData.get('servicio_id'),
    fecha: formData.get('fecha'),
    hora_inicio: formData.get('hora_inicio'),
    hora_fin: formData.get('hora_fin'),
    modalidad: formData.get('modalidad') ?? 'presencial',
    notas: formData.get('notas') ?? '',
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }

  const user = await getSessionUser()
  if (!user) return { error: 'Tenés que iniciar sesión.' }

  return crearTurno(user.id, parsed.data)
}


export async function cancelarTurnoAction(formData: FormData) {
  const id = Number(formData.get('id'))
  if (!id) return

  const user = await getSessionUser()
  if (!user) return

  await cancelarTurno(user.id, id)
}


export async function confirmarTurnoAction(formData: FormData) {
  const id = Number(formData.get('id'))
  if (!id) return

  const user = await getSessionUser()
  if (!user) return

  await confirmarTurno(user.id, id)
}


export async function actualizarTurnoStaffAction(_prev: unknown, formData: FormData): Promise<TurnoState> {
  const parsed = adminEstadoSchema.safeParse({
    id: formData.get('id'),
    estado: formData.get('estado'),
    notas_profesional: formData.get('notas_profesional') ?? '',
    motivo_cancelacion: formData.get('motivo_cancelacion') ?? '',
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const user = await getSessionUser()
  if (!user) return { error: 'No autenticado' }

  return actualizarTurnoStaff(user.id, parsed.data)
}


export async function reprogramarTurnoAction(_prev: unknown, formData: FormData): Promise<TurnoState> {
  const parsed = reprogramarStaffSchema.safeParse({
    id: formData.get('id'),
    fecha: formData.get('fecha'),
    hora_inicio: formData.get('hora_inicio'),
    hora_fin: formData.get('hora_fin'),
    motivo_reprogramacion: formData.get('motivo_reprogramacion') ?? '',
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const user = await getSessionUser()
  if (!user) return { error: 'No autenticado' }

  return reprogramarTurno(user.id, parsed.data)
}
