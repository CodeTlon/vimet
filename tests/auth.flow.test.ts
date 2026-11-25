import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { beforeAll, describe, expect, it } from 'vitest'
import type { ReactElement } from 'react'

import { account, profiles, user } from '@/db/schema'
import { crearAuth } from '@/lib/auth'
import { crearDbDePrueba } from './helpers/db'

type Mail = { to: string; subject: string; react: ReactElement }
const enviados: Mail[] = []
const ultimoMail = (to: string) => [...enviados].reverse().find((m) => m.to === to)

let db: Awaited<ReturnType<typeof crearDbDePrueba>>['db']
let auth: ReturnType<typeof crearAuth>

beforeAll(async () => {
  ;({ db } = await crearDbDePrueba())
  process.env.BETTER_AUTH_SECRET = 'x'.repeat(40)
  auth = crearAuth({
    db: db as never,
    enviarEmail: async (m) => {
      enviados.push(m)
    },
  })
})

const esperarMail = async (to: string) => {
  for (let i = 0; i < 50; i++) {
    const m = ultimoMail(to)
    if (m) return m
    await new Promise((r) => setTimeout(r, 20))
  }
  throw new Error(`no llego mail a ${to}`)
}

describe('registro y confirmacion de email', () => {
  const email = 'paciente@example.com'
  const password = 'clave-segura-123'

  it('el registro no abre sesion y exige confirmar', async () => {
    const res = await auth.api.signUpEmail({ body: { name: 'Ana Paz', email, password } })
    expect(res.token).toBeNull()
    await db.insert(profiles).values({ id: res.user.id, nombre: 'Ana', apellido: 'Paz', email, activo: false })
    await expect(auth.api.signInEmail({ body: { email, password } })).rejects.toMatchObject({ status: 'FORBIDDEN' })
  })

  it('confirmar activa el perfil y permite iniciar sesion', async () => {
    const mail = await esperarMail(email)
    const url = (mail.react.props as { url: string }).url
    const token = new URL(url).searchParams.get('token')!
    await auth.api.verifyEmail({ query: { token } })

    const [perfil] = await db.select().from(profiles).where(eq(profiles.email, email))
    expect(perfil.activo).toBe(true)
    expect(perfil.activado_en).not.toBeNull()

    const ok = await auth.api.signInEmail({ body: { email, password } })
    expect(ok.user.email).toBe(email)
  })

  it('rechaza contrasena incorrecta', async () => {
    await expect(auth.api.signInEmail({ body: { email, password: 'otra-clave-123' } })).rejects.toMatchObject({
      status: 'UNAUTHORIZED',
    })
  })
})

describe('usuarios importados de Supabase (bcrypt)', () => {
  it('inicia sesion con un hash bcrypt', async () => {
    const id = '22222222-2222-2222-2222-222222222222'
    const hash = await bcrypt.hash('clave-vieja-123', 10)
    await db.insert(user).values({ id, name: 'Avril J', email: 'avril@example.com', emailVerified: true })
    await db.insert(account).values({ accountId: id, providerId: 'credential', userId: id, password: hash })
    const ok = await auth.api.signInEmail({ body: { email: 'avril@example.com', password: 'clave-vieja-123' } })
    expect(ok.user.id).toBe(id)
  })
})

describe('recuperacion por codigo', () => {
  it('codigo de 8 digitos permite elegir contrasena nueva', async () => {
    const email = 'avril@example.com'
    await auth.api.sendVerificationOTP({ body: { email, type: 'forget-password' } })
    const mail = await esperarMail(email)
    const otp = (mail.react.props as { codigo: string }).codigo
    expect(otp).toMatch(/^\d{8}$/)

    await auth.api.resetPasswordEmailOTP({ body: { email, otp, password: 'clave-nueva-456' } })
    const ok = await auth.api.signInEmail({ body: { email, password: 'clave-nueva-456' } })
    expect(ok.user.email).toBe(email)
    await expect(auth.api.signInEmail({ body: { email, password: 'clave-vieja-123' } })).rejects.toBeTruthy()
  })

  it('un codigo incorrecto no cambia nada', async () => {
    const email = 'avril@example.com'
    await auth.api.sendVerificationOTP({ body: { email, type: 'forget-password' } })
    await expect(
      auth.api.resetPasswordEmailOTP({ body: { email, otp: '00000000', password: 'hackeada-789' } }),
    ).rejects.toBeTruthy()
  })
})

describe('sesion bearer (app mobile)', () => {
  it('el token de sign-in autentica con Authorization: Bearer', async () => {
    const { headers } = await auth.api.signInEmail({
      body: { email: 'avril@example.com', password: 'clave-nueva-456' },
      returnHeaders: true,
    })
    const token = headers.get('set-auth-token')
    expect(token).toBeTruthy()

    const session = await auth.api.getSession({ headers: new Headers({ authorization: `Bearer ${token}` }) })
    expect(session?.user.email).toBe('avril@example.com')

    const sinToken = await auth.api.getSession({ headers: new Headers() })
    expect(sinToken).toBeNull()
  })
})
