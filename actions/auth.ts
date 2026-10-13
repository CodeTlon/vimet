'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { APIError } from 'better-auth/api'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'

import { profiles } from '@/db/schema'
import { auth } from '@/lib/auth'
import { emailExists } from '@/lib/auth/email-exists'
import { consumirInvitacion } from '@/lib/auth/invitaciones'
import { setUserPassword } from '@/lib/auth/password'
import { esStaff, getSessionUser, perfilPorId } from '@/lib/auth/session'
import { registrarPaciente } from '@/lib/auth/registro'
import { db } from '@/lib/db'
import { ipDeLaRequest, rateLimit } from '@/lib/rate-limit'

export type AuthState = {
  ok?: boolean
  error?: string
  fields?: Record<string, string>
  /**
   * Login fallido: `true` solo si el email ni siquiera existe como cuenta.
   * El form lo usa para vaciar el campo email; con `false`/undefined lo deja
   * cargado para que el usuario reintente solo la contraseña.
   */
  clearEmail?: boolean
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
    password: z.string().min(8, 'Mínimo 8 caracteres'),
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

  const ip = await ipDeLaRequest()
  if (!rateLimit(`login:${ip}:${parsed.data.email}`, 10, 5 * 60 * 1000)) {
    return { error: 'Demasiados intentos. Probá de nuevo en unos minutos.' }
  }

  let userId: string
  let token: string | null
  try {
    const res = await auth.api.signInEmail({ body: parsed.data, headers: await headers() })
    userId = res.user.id
    token = res.token
  } catch (err) {
    if (err instanceof APIError && err.body?.code === 'EMAIL_NOT_VERIFIED') {
      return { error: 'Todavía no confirmaste tu email. Revisá tu bandeja de entrada (y el spam).' }
    }
    // El mensaje es idéntico exista o no la cuenta (no filtramos qué emails están registrados).
    // Lo único que cambia es si el form conserva el email tipeado: si la cuenta existe, el error
    // casi seguro es la contraseña y hacerlo retipear todo es molesto al pedo.
    const existe = await emailExists(parsed.data.email)
    return { error: 'Email o contraseña incorrectos.', clearEmail: !existe }
  }

  const profile = await perfilPorId(userId)
  if (!profile || !profile.activo) {
    if (token) {
      await auth.api.signOut({ headers: new Headers({ authorization: `Bearer ${token}` }) }).catch(() => {})
    }
    return { error: 'Tu cuenta está pendiente de activación.' }
  }

  revalidatePath('/', 'layout')
  redirect(esStaff(profile.rol) ? '/admin/dashboard' : '/mis-turnos')
}

// Llamada desde app/auth/confirmar/page.tsx cuando el paciente hace click en "Confirmar cuenta".
// Verificar el token activa el perfil (afterEmailVerification en lib/auth.ts) y abre la sesion.
export async function confirmarEmailAction(token: string): Promise<{ ok: boolean; error?: string }> {
  if (!token || token.length > 512) return { ok: false, error: 'El link es inválido o ya expiró.' }

  const ip = await ipDeLaRequest()
  if (!rateLimit(`confirmar-email:${ip}`, 10, 15 * 60 * 1000)) {
    return { ok: false, error: 'Demasiados intentos. Probá de nuevo en unos minutos.' }
  }
  try {
    await auth.api.verifyEmail({ query: { token }, headers: await headers() })
  } catch {
    return { ok: false, error: 'El link es inválido o ya expiró. Si ya confirmaste tu cuenta, iniciá sesión.' }
  }
  revalidatePath('/admin/pacientes')
  return { ok: true }
}

export async function registerAction(_prev: unknown, formData: FormData): Promise<AuthState> {
  const ip = await ipDeLaRequest()
  if (!rateLimit(`registro:${ip}`, 5, 15 * 60 * 1000)) {
    return { error: 'Demasiados intentos. Probá de nuevo en un rato.' }
  }

  const fields = {
    nombre: String(formData.get('nombre') ?? ''),
    apellido: String(formData.get('apellido') ?? ''),
    email: String(formData.get('email') ?? ''),
    telefono: String(formData.get('telefono') ?? ''),
    password: String(formData.get('password') ?? ''),
    password_confirm: String(formData.get('password_confirm') ?? ''),
  }
  const limpios = { ...fields, password: '', password_confirm: '' }
  const parsed = registerSchema.safeParse(fields)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos', fields: limpios }
  }

  const res = await registrarPaciente(parsed.data, await headers())
  if (!res.ok) return { error: res.error, fields: limpios }
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

  const ip = await ipDeLaRequest()
  const okIp = rateLimit(`recuperar-ip:${ip}`, 10, 60 * 60 * 1000)
  const okEmail = rateLimit(`recuperar-email:${parsed.data}`, 3, 60 * 60 * 1000)
  if (!okIp || !okEmail) {
    // Mismo mensaje "ok" que el caso normal: no delatamos el rate limit.
    return { ok: true, fields: { email: parsed.data } }
  }

  // Código de 8 dígitos en vez de link clickeable: un link de un solo uso se puede quemar solo
  // con que el cliente de mail lo pre-visite (link preview), dejándolo "vencido" antes de que
  // el usuario lo toque. El código no tiene ese problema.
  try {
    await auth.api.sendVerificationOTP({ body: { email: parsed.data, type: 'forget-password' } })
  } catch (err) {
    console.error('sendVerificationOTP:', err)
  }

  // Siempre devolvemos ok: no revelamos si el email existe o no.
  return { ok: true, fields: { email: parsed.data } }
}

const codigoRecuperacionSchema = z
  .object({
    email: z.string().email(),
    token: z.string().min(8, 'Código inválido').max(8, 'Código inválido'),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
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

  const ip = await ipDeLaRequest()
  if (!rateLimit(`confirmar-recuperacion:${ip}:${parsed.data.email}`, 5, 15 * 60 * 1000)) {
    return { error: 'Demasiados intentos. Pedí un código nuevo en unos minutos.', fields: { email } }
  }

  try {
    await auth.api.resetPasswordEmailOTP({
      body: { email: parsed.data.email, otp: parsed.data.token, password: parsed.data.password },
    })
  } catch (err) {
    console.error('resetPasswordEmailOTP:', err instanceof Error ? err.message : err)
    return { error: 'Código inválido o vencido.', fields: { email } }
  }

  // Quien recupera la contraseña ya probó ser dueño del email: se lo deja logueado, como antes.
  let userId: string | null = null
  try {
    const res = await auth.api.signInEmail({
      body: { email: parsed.data.email, password: parsed.data.password },
      headers: await headers(),
    })
    userId = res.user.id
  } catch {
    redirect('/login')
  }

  const profile = userId ? await perfilPorId(userId) : null
  revalidatePath('/', 'layout')
  redirect(esStaff(profile?.rol) ? '/admin/dashboard' : '/mis-turnos')
}

const nuevaContrasenaSchema = z
  .object({
    password: z.string().min(8, 'Mínimo 8 caracteres.'),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: 'Las contraseñas no coinciden.', path: ['confirm'] })

/**
 * Elegir contraseña. Dos orígenes:
 *  - `token` presente: invitación (cuenta creada por staff). Se consume el token y se inicia sesión.
 *  - sin `token`: usuario ya logueado (cambio forzado `debe_cambiar_password`).
 * Los datos de perfil opcionales solo pisan lo que vino cargado.
 */
export async function nuevaContrasenaAction(_prev: unknown, formData: FormData): Promise<AuthState> {
  const parsed = nuevaContrasenaSchema.safeParse({
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const token = String(formData.get('token') ?? '')
  let userId: string | null = null

  if (token) {
    const ip = await ipDeLaRequest()
    if (!rateLimit(`invitacion:${ip}`, 10, 15 * 60 * 1000)) {
      return { error: 'Demasiados intentos. Probá de nuevo en unos minutos.' }
    }
    userId = await consumirInvitacion(token)
    if (!userId) return { error: 'El link es inválido o ya expiró. Pedí que te inviten de nuevo.' }
  } else {
    userId = (await getSessionUser())?.id ?? null
    if (!userId) return { error: 'Tu sesión expiró. Iniciá sesión de nuevo.' }
  }

  try {
    await setUserPassword(userId, parsed.data.password)
  } catch (err) {
    console.error('nuevaContrasenaAction:', err)
    return { error: 'No se pudo guardar la contraseña.' }
  }

  // Datos de perfil: para invitados que llegan sin nombre. debe_cambiar_password se limpia
  // siempre: si estaba en true, este guardado es justamente lo que lo cierra.
  const perfilUpdate: Partial<typeof profiles.$inferInsert> = { debe_cambiar_password: false }
  const nombre = String(formData.get('nombre') ?? '').trim()
  const apellido = String(formData.get('apellido') ?? '').trim()
  const telefono = String(formData.get('telefono') ?? '').trim()
  if (nombre) perfilUpdate.nombre = nombre
  if (apellido) perfilUpdate.apellido = apellido
  if (telefono) perfilUpdate.telefono = telefono
  await db.update(profiles).set(perfilUpdate).where(eq(profiles.id, userId))

  const profile = await perfilPorId(userId)
  if (token && profile) {
    // Invitacion: inicia sesion con la contraseña recien elegida.
    try {
      await auth.api.signInEmail({
        body: { email: profile.email ?? '', password: parsed.data.password },
        headers: await headers(),
      })
    } catch {
      redirect('/login')
    }
  }

  revalidatePath('/', 'layout')
  redirect(esStaff(profile?.rol) ? '/admin/dashboard' : token ? '/mis-turnos' : '/login')
}

export async function logoutAction() {
  await auth.api.signOut({ headers: await headers() }).catch(() => {})
  revalidatePath('/', 'layout')
  redirect('/')
}
