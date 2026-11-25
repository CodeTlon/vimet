import { eq } from 'drizzle-orm'
import { beforeAll, describe, expect, it } from 'vitest'

import { audit_log, fichas_paciente, planes, profiles, user } from '@/db/schema'
import { crearUsuario, eliminarUsuario } from '@/lib/auth/usuarios'
import { crearDbDePrueba } from './helpers/db'

let db: Awaited<ReturnType<typeof crearDbDePrueba>>['db']
beforeAll(async () => {
  ;({ db } = await crearDbDePrueba())
})

describe('eliminar un paciente con datos clinicos', () => {
  it('borra perfil, usuario y datos asociados sin que el audit_log lo bloquee', async () => {
    const { id } = await crearUsuario({ email: 'p@example.com', nombre: 'P', apellido: 'P' }, db as never)
    await db.insert(fichas_paciente).values({ paciente_id: id })
    await db.insert(planes).values({ paciente_id: id, tipo: 'nutricion', titulo: 'Plan' })

    await eliminarUsuario(id, db as never)

    expect(await db.select().from(profiles).where(eq(profiles.id, id))).toHaveLength(0)
    expect(await db.select().from(user).where(eq(user.id, id))).toHaveLength(0)
    expect(await db.select().from(fichas_paciente).where(eq(fichas_paciente.paciente_id, id))).toHaveLength(0)
    // El rastro de auditoria sobrevive sin referencia al paciente borrado.
    const rastro = await db.select().from(audit_log)
    expect(rastro.length).toBeGreaterThan(0)
  })
})
