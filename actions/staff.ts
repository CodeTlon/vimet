'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaff } from '@/lib/supabase/auth-helpers'

export type StaffState = { ok?: boolean; error?: string }

const configurarProfesionalSchema = z.object({
  email: z.string().email('Email inválido'),
  tipo: z.enum(['nutricionista', 'entrenador'], { message: 'Tipo inválido' }),
})

const passwordSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

// tipo de servicio que corresponde a cada rol
const SERVICIO_TIPO: Record<'nutricionista' | 'entrenador', string> = {
  nutricionista: 'nutricion',
  entrenador: 'entrenamiento',
}

export async function configurarProfesionalAction(
  _prev: unknown,
  formData: FormData,
): Promise<StaffState> {
  await requireStaff()

  const parsed = configurarProfesionalSchema.safeParse({
    email: formData.get('email'),
    tipo: formData.get('tipo'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const { email, tipo } = parsed.data
  const admin = createAdminClient()

  // Buscar nuevo usuario
  const { data: nuevo } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()
  if (!nuevo) return { error: 'No se encontró ningún usuario con ese email.' }

  // Buscar profesional anterior del mismo tipo (si existe)
  const { data: anterior } = await admin
    .from('profiles')
    .select('id')
    .eq('rol', tipo)
    .neq('id', nuevo.id)
    .maybeSingle()

  // 1) Asignar rol al nuevo usuario
  await admin.from('profiles').update({ rol: tipo }).eq('id', nuevo.id)

  // 2) Linkear servicios del tipo correspondiente al nuevo usuario
  await admin
    .from('servicios')
    .update({ profesional_id: nuevo.id })
    .eq('tipo', SERVICIO_TIPO[tipo])

  // 3) Reasignar horarios del profesional anterior (si había uno)
  if (anterior) {
    await admin
      .from('horarios_disponibles')
      .update({ profesional_id: nuevo.id })
      .eq('profesional_id', anterior.id)
  }

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

  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', parsed.data.email)
    .maybeSingle()

  if (!profile) return { error: 'No se encontró ningún usuario con ese email.' }

  const { error } = await admin.auth.admin.updateUserById(profile.id, {
    password: parsed.data.password,
  })

  if (error) return { error: 'No se pudo cambiar la contraseña.' }

  return { ok: true }
}
