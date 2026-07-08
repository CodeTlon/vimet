'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type AuthState = {
  ok?: boolean
  error?: string
  fields?: Record<string, string>
}

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

const registerSchema = z
  .object({
    nombre: z.string().min(1, 'El nombre es obligatorio'),
    apellido: z.string().min(1, 'El apellido es obligatorio'),
    email: z.string().email('Email inválido'),
    telefono: z.string().optional().default(''),
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    password_confirm: z.string(),
  })
  .refine((d) => d.password === d.password_confirm, {
    message: 'Las contraseñas no coinciden',
    path: ['password_confirm'],
  })

export async function loginAction(_prev: unknown, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }

  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    return { error: 'Email o contraseña incorrectos.' }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No se pudo iniciar sesión.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol, activo')
    .eq('id', user.id)
    .maybeSingle()

  if (profile && !profile.activo) {
    await supabase.auth.signOut()
    return { error: 'Tu cuenta está pendiente de activación.' }
  }

  const isStaff = profile?.rol && ['nutricionista', 'entrenador', 'admin'].includes(profile.rol)
  revalidatePath('/', 'layout')
  redirect(isStaff ? '/admin/dashboard' : '/mis-turnos')
}

export async function registerAction(_prev: unknown, formData: FormData): Promise<AuthState> {
  const fields = {
    nombre: String(formData.get('nombre') ?? ''),
    apellido: String(formData.get('apellido') ?? ''),
    email: String(formData.get('email') ?? ''),
    telefono: String(formData.get('telefono') ?? ''),
    password: String(formData.get('password') ?? ''),
    password_confirm: String(formData.get('password_confirm') ?? ''),
  }
  const parsed = registerSchema.safeParse(fields)
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? 'Datos inválidos',
      fields: { ...fields, password: '', password_confirm: '' },
    }
  }

  const supabase = createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        nombre: parsed.data.nombre,
        apellido: parsed.data.apellido,
        telefono: parsed.data.telefono,
      },
      emailRedirectTo: `${siteUrl}/auth/confirmar`,
    },
  })

  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('already') || msg.includes('registered')) {
      return { error: 'Ya existe una cuenta con ese email.', fields: { ...fields, password: '', password_confirm: '' } }
    }
    return { error: error.message, fields: { ...fields, password: '', password_confirm: '' } }
  }

  if (data.user) {
    // Marcar como inactivo hasta que el admin lo active
    await createAdminClient().from('profiles').update({ activo: false }).eq('id', data.user.id)
    // Cerrar la sesión que pudo haberse abierto automáticamente
    await createClient().auth.signOut()
  }

  return { ok: true }
}

export async function recuperarContrasenaAction(
  _prev: unknown,
  formData: FormData,
): Promise<AuthState> {
  const parsed = z.string().email().safeParse(formData.get('email'))
  if (!parsed.success) {
    return { error: 'Ingresá un email válido.' }
  }

  const supabase = createClient()
  // Código de 8 dígitos en vez de link clickeable: un link de un solo uso se
  // puede quemar solo con que el cliente de mail lo pre-visite (link preview),
  // dejándolo "vencido" antes de que el usuario lo toque. El código no tiene
  // ese problema. Requiere que la plantilla de mail "Reset Password" en
  // Supabase muestre {{ .Token }} en vez de {{ .ConfirmationURL }}.
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data)
  if (error) console.error('resetPasswordForEmail:', error.message)

  // Siempre devolvemos ok: no revelamos si el email existe o no.
  return { ok: true, fields: { email: parsed.data } }
}

const codigoRecuperacionSchema = z
  .object({
    email: z.string().email(),
    token: z.string().min(8, 'Código inválido').max(8, 'Código inválido'),
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm'],
  })

export async function confirmarRecuperacionAction(
  _prev: unknown,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '')
  const parsed = codigoRecuperacionSchema.safeParse({
    email,
    token: formData.get('token'),
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos', fields: { email } }
  }

  const supabase = createClient()
  const { error: otpError } = await supabase.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.token,
    type: 'recovery',
  })
  if (otpError) {
    console.error('verifyOtp:', otpError.message)
    return { error: 'Código inválido o vencido.', fields: { email } }
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (updateError) {
    // verifyOtp ya autenticó la sesión; si falla el guardado no la dejamos
    // colgada (usuario "logueado" sin haber puesto contraseña nueva).
    await supabase.auth.signOut({ scope: 'local' })
    return { error: `No se pudo guardar la contraseña: ${updateError.message}`, fields: { email } }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user?.id ?? '')
    .maybeSingle()

  revalidatePath('/', 'layout')
  const isStaff = profile?.rol && ['nutricionista', 'entrenador', 'admin'].includes(profile.rol)
  redirect(isStaff ? '/admin/dashboard' : '/mis-turnos')
}

export async function nuevaContrasenaAction(_prev: unknown, formData: FormData): Promise<AuthState> {
  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirm') ?? '')

  if (password.length < 6) return { error: 'Mínimo 6 caracteres.' }
  if (password !== confirm) return { error: 'Las contraseñas no coinciden.' }

  const supabase = createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) return { error: 'No se pudo guardar la contraseña. El link puede haber expirado.' }

  const { data: { user } } = await supabase.auth.getUser()

  // Datos de perfil: para invitados (staff/paciente nuevo) que llegan sin nombre.
  // Solo actualizamos los campos que vengan cargados → un reset de contraseña
  // de alguien existente que los deje vacíos no pisa lo que ya tenía.
  const perfilUpdate: Record<string, string> = {}
  const nombre = String(formData.get('nombre') ?? '').trim()
  const apellido = String(formData.get('apellido') ?? '').trim()
  const telefono = String(formData.get('telefono') ?? '').trim()
  if (nombre) perfilUpdate.nombre = nombre
  if (apellido) perfilUpdate.apellido = apellido
  if (telefono) perfilUpdate.telefono = telefono
  if (user?.id && Object.keys(perfilUpdate).length > 0) {
    await supabase.from('profiles').update(perfilUpdate).eq('id', user.id)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user?.id ?? '')
    .maybeSingle()

  revalidatePath('/', 'layout')
  const isStaff = profile?.rol && ['nutricionista', 'entrenador', 'admin'].includes(profile.rol)
  redirect(isStaff ? '/admin/dashboard' : '/login')
}

export async function logoutAction() {
  const supabase = createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}
