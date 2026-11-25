import { randomBytes, randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { hashPassword } from 'better-auth/crypto'

import { account, profiles, user } from '@/db/schema'
import { db as dbGlobal, type Db } from '@/lib/db'

type Rol = (typeof profiles.$inferSelect)['rol']

export type NuevoUsuario = {
  email: string
  nombre: string
  apellido: string
  telefono?: string | null
  rol?: Rol
  /** Sin contraseña: se genera una aleatoria que nadie conoce (cuenta gestionada o invitacion). */
  password?: string
  /** Cuenta ya verificada (staff que da de alta a mano, invitaciones, pacientes gestionados). */
  emailVerificado?: boolean
  activo?: boolean
  gestionadoPorStaff?: boolean
}

/**
 * Crea usuario + credencial + perfil en una transaccion. Es el unico camino para crear
 * cuentas "a mano" (alta de paciente gestionado, invitacion de staff, scripts, e2e); el
 * auto-registro pasa por `auth.api.signUpEmail`. El perfil reemplaza al trigger
 * `handle_new_user` de Supabase.
 */
export async function crearUsuario(datos: NuevoUsuario, db: Db = dbGlobal): Promise<{ id: string }> {
  const id = randomUUID()
  const email = datos.email.trim().toLowerCase()
  const passwordHash = await hashPassword(datos.password ?? randomBytes(32).toString('base64url'))
  const activo = datos.activo ?? true

  await db.transaction(async (tx) => {
    await tx.insert(user).values({
      id,
      name: `${datos.nombre} ${datos.apellido}`.trim() || email,
      email,
      emailVerified: datos.emailVerificado ?? true,
    })
    await tx.insert(account).values({ accountId: id, providerId: 'credential', userId: id, password: passwordHash })
    await tx.insert(profiles).values({
      id,
      email,
      nombre: datos.nombre,
      apellido: datos.apellido,
      telefono: datos.telefono ?? null,
      rol: datos.rol ?? 'paciente',
      activo,
      activado_en: activo ? new Date().toISOString() : null,
      gestionado_por_staff: datos.gestionadoPorStaff ?? false,
    })
  })
  return { id }
}

/** Borra usuario y perfil (las FK de las tablas de negocio cascadean desde `profiles`). */
export async function eliminarUsuario(id: string, db: Db = dbGlobal): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(profiles).where(eq(profiles.id, id))
    await tx.delete(user).where(eq(user.id, id))
  })
}
