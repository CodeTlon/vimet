'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, requireStaff } from '@/lib/supabase/auth-helpers'

export type StaffState = { ok?: boolean; error?: string }

// Los buckets `planes`/`recursos` no cascadean solos al borrar el usuario de
// auth.users — hay que limpiarlos a mano antes de que quede el registro
// huérfano. `recursos` tiene subcarpetas (r/, f/), por eso es recursivo.
async function removeAllUnderPrefix(
  admin: ReturnType<typeof createAdminClient>,
  bucket: string,
  prefix: string,
) {
  const { data } = await admin.storage.from(bucket).list(prefix, { limit: 1000 })
  if (!data || data.length === 0) return
  const files: string[] = []
  for (const item of data) {
    const path = `${prefix}/${item.name}`
    if (item.id === null) {
      await removeAllUnderPrefix(admin, bucket, path)
    } else {
      files.push(path)
    }
  }
  if (files.length) await admin.storage.from(bucket).remove(files)
}

const configurarProfesionalSchema = z.object({
  email: z.string().email('Email inválido'),
  tipo: z.enum(['nutricionista', 'entrenador'], { message: 'Tipo inválido' }),
})

const passwordSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
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
  await requireAdmin()

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

  // 1) Asignar rol al nuevo usuario y activarlo (un profesional siempre va activo)
  await admin.from('profiles').update({ rol: tipo, activo: true }).eq('id', nuevo.id)

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

  // 4) Si el profesional quedó sin horarios (setup inicial, sin profesional
  //    previo del que heredarlos), sembramos una agenda Lun–Vie por defecto.
  //    Sin esto el wizard de reserva no muestra slots para ninguna fecha.
  //    Se puede ajustar después desde la base de datos.
  const { count: horariosCount } = await admin
    .from('horarios_disponibles')
    .select('id', { count: 'exact', head: true })
    .eq('profesional_id', nuevo.id)

  if (!horariosCount) {
    const dias = [1, 2, 3, 4, 5] // lunes a viernes
    await admin.from('horarios_disponibles').insert(
      dias.flatMap((dia) => [
        { profesional_id: nuevo.id, dia_semana: dia, hora_inicio: '09:00', hora_fin: '13:00', modalidad: 'ambas' as const },
        { profesional_id: nuevo.id, dia_semana: dia, hora_inicio: '14:00', hora_fin: '18:00', modalidad: 'ambas' as const },
      ]),
    )
  }

  revalidatePath('/admin', 'layout')
  return { ok: true }
}

export async function toggleActivoAction(formData: FormData): Promise<void> {
  await requireAdmin()

  const id = String(formData.get('id') ?? '')
  const activo = formData.get('activo') === 'true'
  if (!id) return

  const admin = createAdminClient()
  const payload: { activo: boolean; activado_en?: string } = { activo }
  if (activo) {
    // Solo se pisa en la primera activación real (queda null en desactivaciones,
    // así el listado puede distinguir "pendiente" de "inactivo").
    const { data: profile } = await admin
      .from('profiles')
      .select('activado_en')
      .eq('id', id)
      .maybeSingle()
    if (!profile?.activado_en) payload.activado_en = new Date().toISOString()
  }
  const { error } = await admin.from('profiles').update(payload).eq('id', id)
  if (!error) revalidatePath('/admin/pacientes')
}

export async function cambiarPasswordAction(
  _prev: unknown,
  formData: FormData,
): Promise<StaffState> {
  await requireAdmin()

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

export async function eliminarPacienteAction(
  _prev: unknown,
  formData: FormData,
): Promise<StaffState> {
  const { profile } = await requireStaff()
  if (profile.rol !== 'admin') return { error: 'Solo un admin puede eliminar pacientes.' }

  const id = String(formData.get('id') ?? '')
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return { error: 'Datos inválidos' }
  }

  const admin = createAdminClient()
  await removeAllUnderPrefix(admin, 'planes', id)
  await removeAllUnderPrefix(admin, 'recursos', id)

  // Cascada de Postgres (profiles, ficha, mediciones, planes, feedback,
  // objetivos, turnos, etc.) ya está resuelta vía `on delete cascade` desde
  // auth.users.id — borrar acá alcanza para todo el resto de la DB.
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return { error: 'No se pudo eliminar el paciente.' }

  revalidatePath('/admin/pacientes')
  return { ok: true }
}
