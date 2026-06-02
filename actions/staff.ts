'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaff } from '@/lib/supabase/auth-helpers'

export type StaffState = { ok?: boolean; error?: string }

const rolSchema = z.object({
  email: z.string().email('Email inválido'),
  rol: z.enum(['admin', 'nutricionista', 'entrenador', 'paciente'], { message: 'Rol inválido' }),
})

const passwordSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

export async function asignarRolAction(_prev: unknown, formData: FormData): Promise<StaffState> {
  await requireStaff()

  const parsed = rolSchema.safeParse({
    email: formData.get('email'),
    rol: formData.get('rol'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const admin = createAdminClient()
  const { error, count } = await admin
    .from('profiles')
    .update({ rol: parsed.data.rol })
    .eq('email', parsed.data.email)
    .select('id', { count: 'exact', head: true })

  if (error) return { error: 'Error al actualizar el rol.' }
  if (count === 0) return { error: 'No se encontró ningún usuario con ese email.' }

  revalidatePath('/admin', 'layout')
  return { ok: true }
}

export async function cambiarPasswordAction(
  _prev: unknown,
  formData: FormData,
): Promise<StaffState> {
  await requireStaff()

  const parsed = passwordSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const admin = createAdminClient()

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id')
    .eq('email', parsed.data.email)
    .maybeSingle()

  if (profileError || !profile) return { error: 'No se encontró ningún usuario con ese email.' }

  const { error } = await admin.auth.admin.updateUserById(profile.id, {
    password: parsed.data.password,
  })

  if (error) return { error: 'No se pudo cambiar la contraseña.' }

  return { ok: true }
}
