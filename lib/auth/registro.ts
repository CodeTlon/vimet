import { APIError } from 'better-auth/api'

import { profiles } from '@/db/schema'
import { auth } from '@/lib/auth'
import { emailExists } from '@/lib/auth/email-exists'
import { eliminarUsuario } from '@/lib/auth/usuarios'
import { db } from '@/lib/db'

export type DatosRegistro = { nombre: string; apellido: string; email: string; telefono: string; password: string }
export type ResultadoRegistro = { ok: true } | { ok: false; error: string; status: 400 | 409 | 500 }

/**
 * Alta de paciente por auto-registro (web y app mobile comparten esta logica). La cuenta queda
 * inactiva hasta que confirme el email: `afterEmailVerification` (lib/auth.ts) activa el perfil.
 */
export async function registrarPaciente(datos: DatosRegistro, headers?: Headers): Promise<ResultadoRegistro> {
  // Con requireEmailVerification Better Auth responde "ok" aunque el email ya exista (para no
  // filtrarlo). El producto ya avisa "Ya existe una cuenta", asi que se chequea antes.
  if (await emailExists(datos.email)) {
    return { ok: false, error: 'Ya existe una cuenta con ese email.', status: 409 }
  }

  let userId: string
  try {
    const res = await auth.api.signUpEmail({
      body: { name: `${datos.nombre} ${datos.apellido}`.trim(), email: datos.email, password: datos.password },
      headers,
    })
    userId = res.user.id
  } catch (err) {
    if (err instanceof APIError) return { ok: false, error: err.message, status: 400 }
    throw err
  }

  // Si no se puede crear el perfil la cuenta queda inusable, asi que se deshace el usuario.
  try {
    await db.insert(profiles).values({
      id: userId,
      email: datos.email.trim().toLowerCase(),
      nombre: datos.nombre,
      apellido: datos.apellido,
      telefono: datos.telefono || null,
      rol: 'paciente',
      activo: false,
    })
  } catch (err) {
    console.error('registro: no se pudo crear el perfil', err)
    await eliminarUsuario(userId).catch(() => {})
    return { ok: false, error: 'No pudimos crear tu cuenta. Probá de nuevo en un rato.', status: 500 }
  }
  return { ok: true }
}
