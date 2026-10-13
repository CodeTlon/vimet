import { eq } from 'drizzle-orm'
import { beforeAll, describe, expect, it } from 'vitest'

import { profiles, user } from '@/db/schema'
import { crearAuth } from '@/lib/auth'
import { consumirInvitacion, crearInvitacion } from '@/lib/auth/invitaciones'
import { setUserPassword } from '@/lib/auth/password'
import { crearUsuario, eliminarUsuario } from '@/lib/auth/usuarios'
import { crearDbDePrueba } from './helpers/db'

let db: Awaited<ReturnType<typeof crearDbDePrueba>>['db']
let auth: ReturnType<typeof crearAuth>

beforeAll(async () => {
  ;({ db } = await crearDbDePrueba())
  process.env.BETTER_AUTH_SECRET = 'y'.repeat(40)
  auth = crearAuth({ db: db as never, enviarEmail: async () => {} })
})

describe('alta de cuentas por staff', () => {
  it('crearUsuario deja usuario, credencial y perfil coherentes', async () => {
    const { id } = await crearUsuario(
      { email: 'Nutri@Example.com', nombre: 'Nora', apellido: 'Sol', rol: 'nutricionista', password: 'inicial-1234' },
      db as never,
    )
    const [p] = await db.select().from(profiles).where(eq(profiles.id, id))
    expect(p).toMatchObject({ email: 'nutri@example.com', rol: 'nutricionista', activo: true })
    const ok = await auth.api.signInEmail({ body: { email: 'nutri@example.com', password: 'inicial-1234' } })
    expect(ok.user.id).toBe(id)
  })

  it('la invitacion es de un solo uso y permite fijar la contrasena', async () => {
    const { id } = await crearUsuario({ email: 'gero@example.com', nombre: 'Gero', apellido: 'G', rol: 'entrenador' }, db as never)
    const token = await crearInvitacion(id, db as never)

    expect(await consumirInvitacion(token, db as never)).toBe(id)
    expect(await consumirInvitacion(token, db as never)).toBeNull() // ya usado

    await setUserPassword(id, 'elegida-por-gero-1', db as never)
    const ok = await auth.api.signInEmail({ body: { email: 'gero@example.com', password: 'elegida-por-gero-1' } })
    expect(ok.user.id).toBe(id)
  })

  it('rechaza tokens manipulados o de otro usuario', async () => {
    const { id } = await crearUsuario({ email: 'otra@example.com', nombre: 'O', apellido: 'T' }, db as never)
    const token = await crearInvitacion(id, db as never)
    expect(await consumirInvitacion(`${id}.secreto-falso`, db as never)).toBeNull()
    expect(await consumirInvitacion('basura', db as never)).toBeNull()
    expect(await consumirInvitacion(token.replace(id, '33333333-3333-3333-3333-333333333333'), db as never)).toBeNull()
    expect(await consumirInvitacion(token, db as never)).toBe(id) // el original sigue valido
  })

  it('eliminarUsuario borra perfil y usuario', async () => {
    const { id } = await crearUsuario({ email: 'baja@example.com', nombre: 'B', apellido: 'J' }, db as never)
    await eliminarUsuario(id, db as never)
    expect(await db.select().from(profiles).where(eq(profiles.id, id))).toHaveLength(0)
    expect(await db.select().from(user).where(eq(user.id, id))).toHaveLength(0)
  })
})
