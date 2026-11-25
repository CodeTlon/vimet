'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireAdmin, requireStaff } from '@/lib/auth/session'
import {
  cambiarActivo,
  cambiarPasswordDe,
  configurarProfesional,
  crearPacienteGestionado,
  eliminarPaciente,
} from '@/lib/services/staff'
import { crearPacienteSchema } from '@/lib/validation/staff'

export type StaffState = { ok?: boolean; error?: string }
export type CrearPacienteState = StaffState & { id?: string }

const configurarProfesionalSchema = z.object({
  email: z.string().email('Email inválido'),
  tipo: z.enum(['nutricionista', 'entrenador'], { message: 'Tipo inválido' }),
})

const passwordSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
})

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function configurarProfesionalAction(_prev: unknown, formData: FormData): Promise<StaffState> {
  await requireAdmin()

  const parsed = configurarProfesionalSchema.safeParse({
    email: formData.get('email'),
    tipo: formData.get('tipo'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const res = await configurarProfesional(parsed.data.email, parsed.data.tipo)
  if (!res.ok) return { error: res.error }

  revalidatePath('/admin', 'layout')
  return { ok: true }
}

// Alta de pacientes que nunca van a iniciar sesión: el staff carga los datos y gestiona todo.
export async function crearPacienteGestionadoAction(_prev: unknown, formData: FormData): Promise<CrearPacienteState> {
  await requireStaff()

  const parsed = crearPacienteSchema.safeParse({
    nombre: formData.get('nombre'),
    apellido: formData.get('apellido'),
    telefono: formData.get('telefono'),
    email: formData.get('email'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const res = await crearPacienteGestionado(parsed.data)
  if (!res.ok) return { error: res.error }

  revalidatePath('/admin/pacientes')
  return { ok: true, id: res.id }
}

export async function toggleActivoAction(formData: FormData): Promise<void> {
  const { profile } = await requireStaff()

  const id = String(formData.get('id') ?? '')
  const activo = formData.get('activo') === 'true'
  if (!UUID_RE.test(id)) return

  const res = await cambiarActivo(profile, id, activo)
  if (res.ok) revalidatePath('/admin/pacientes')
}

export async function cambiarPasswordAction(_prev: unknown, formData: FormData): Promise<StaffState> {
  await requireAdmin()

  const parsed = passwordSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const res = await cambiarPasswordDe(parsed.data.email, parsed.data.password)
  if (!res.ok) return { error: res.error }
  return { ok: true }
}

export async function eliminarPacienteAction(_prev: unknown, formData: FormData): Promise<StaffState> {
  await requireStaff()

  const id = String(formData.get('id') ?? '')
  if (!UUID_RE.test(id)) return { error: 'Datos inválidos' }

  const res = await eliminarPaciente(id)
  if (!res.ok) return { error: res.error }

  revalidatePath('/admin/pacientes')
  return { ok: true }
}
