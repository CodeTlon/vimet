// Servicio de administracion de cuentas y profesionales. SIN 'use server': recibe al actor ya
// autenticado; lo usan actions/staff.ts (web) y app/api/mobile/staff/* (bearer).
import { and, eq, ne, sql } from 'drizzle-orm'

import { horarios_disponibles, profiles, servicios } from '@/db/schema'
import { setUserPassword } from '@/lib/auth/password'
import { crearUsuario, eliminarUsuario } from '@/lib/auth/usuarios'
import { db as dbGlobal, type Db } from '@/lib/db'
import { PG, pgCode } from '@/lib/db-errors'
import { borrarArchivos, listarArchivos } from '@/lib/storage/s3'

export type Resultado<T = object> = ({ ok: true } & T) | { ok: false; error: string; status?: number }

type Rol = (typeof profiles.$inferSelect)['rol']

const SERVICIO_TIPO = { nutricionista: 'nutricion', entrenador: 'entrenamiento' } as const

export async function perfilPorEmail(email: string, db: Db = dbGlobal) {
  const [p] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(sql`lower(${profiles.email})`, email.trim().toLowerCase()))
    .limit(1)
  return p ?? null
}

/** Asigna rol de profesional, linkea servicios y hereda (o siembra) la agenda. Solo admin (lo valida el llamador). */
export async function configurarProfesional(
  email: string,
  tipo: 'nutricionista' | 'entrenador',
  db: Db = dbGlobal,
): Promise<Resultado> {
  const nuevo = await perfilPorEmail(email, db)
  if (!nuevo) return { ok: false, error: 'No se encontró ningún usuario con ese email.', status: 404 }

  await db.transaction(async (tx) => {
    const [anterior] = await tx
      .select({ id: profiles.id })
      .from(profiles)
      .where(and(eq(profiles.rol, tipo), ne(profiles.id, nuevo.id)))
      .limit(1)

    // 1) rol + activo (un profesional siempre va activo)
    await tx.update(profiles).set({ rol: tipo, activo: true }).where(eq(profiles.id, nuevo.id))
    // 2) servicios del tipo correspondiente
    await tx.update(servicios).set({ profesional_id: nuevo.id }).where(eq(servicios.tipo, SERVICIO_TIPO[tipo]))
    // 3) horarios del profesional anterior
    if (anterior) {
      await tx
        .update(horarios_disponibles)
        .set({ profesional_id: nuevo.id })
        .where(eq(horarios_disponibles.profesional_id, anterior.id))
    }
    // 4) sin horarios (setup inicial): agenda Lun-Vie por defecto; sin esto el wizard no muestra slots
    const [{ n }] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(horarios_disponibles)
      .where(eq(horarios_disponibles.profesional_id, nuevo.id))
    if (n === 0) {
      await tx.insert(horarios_disponibles).values(
        [1, 2, 3, 4, 5].flatMap((dia) => [
          { profesional_id: nuevo.id, dia_semana: dia, hora_inicio: '09:00', hora_fin: '13:00', modalidad: 'ambas' as const },
          { profesional_id: nuevo.id, dia_semana: dia, hora_inicio: '14:00', hora_fin: '18:00', modalidad: 'ambas' as const },
        ]),
      )
    }
  })
  return { ok: true }
}

/**
 * Alta de un paciente que nunca inicia sesion (adultos mayores o con dificultad de acceso). La
 * contrasena queda aleatoria y no se comunica; sin email real se genera uno sintetico no enviable
 * y `profiles.email` queda en null. Activo desde el alta: el staff lo da de alta en persona.
 */
export async function crearPacienteGestionado(
  datos: { nombre: string; apellido: string; telefono: string; email?: string },
  db: Db = dbGlobal,
): Promise<Resultado<{ id: string }>> {
  const emailReal = datos.email ? datos.email.trim().toLowerCase() : null
  try {
    const { id } = await crearUsuario(
      {
        email: emailReal ?? `paciente.${crypto.randomUUID()}@sinacceso.vimet.local`,
        nombre: datos.nombre,
        apellido: datos.apellido,
        telefono: datos.telefono,
        rol: 'paciente',
        emailVerificado: true,
        activo: true,
        gestionadoPorStaff: true,
      },
      db,
    )
    if (!emailReal) await db.update(profiles).set({ email: null }).where(eq(profiles.id, id))
    return { ok: true, id }
  } catch (err) {
    if (pgCode(err) === PG.UNIQUE_VIOLATION) return { ok: false, error: 'Ya existe una cuenta con ese email.', status: 400 }
    console.error('crearPacienteGestionado:', err)
    return { ok: false, error: 'No se pudo crear el paciente.', status: 400 }
  }
}

/**
 * Activa/desactiva una cuenta. Cualquier staff puede hacerlo sobre PACIENTES; sobre otra cuenta de
 * staff solo un admin (antes el cliente admin dejaba que cualquier staff desactivara al admin).
 */
export async function cambiarActivo(
  actor: { rol: Rol },
  id: string,
  activo: boolean,
  db: Db = dbGlobal,
): Promise<Resultado> {
  const [objetivo] = await db
    .select({ rol: profiles.rol, activado_en: profiles.activado_en })
    .from(profiles)
    .where(eq(profiles.id, id))
    .limit(1)
  if (!objetivo) return { ok: false, error: 'Paciente inválido', status: 404 }
  if (objetivo.rol !== 'paciente' && actor.rol !== 'admin') {
    return { ok: false, error: 'Solo un administrador puede cambiar el estado de otra cuenta del equipo.', status: 403 }
  }
  // Solo se pisa `activado_en` en la primera activacion real (queda null en desactivaciones, asi el
  // listado distingue "sin confirmar" de "inactivo").
  await db
    .update(profiles)
    .set({ activo, ...(activo && !objetivo.activado_en ? { activado_en: new Date().toISOString() } : {}) })
    .where(eq(profiles.id, id))
  return { ok: true }
}

/** Fija la contrasena de la cuenta con ese email. Solo admin (lo valida el llamador). */
export async function cambiarPasswordDe(email: string, password: string, db: Db = dbGlobal): Promise<Resultado> {
  const p = await perfilPorEmail(email, db)
  if (!p) return { ok: false, error: 'No se encontró ningún usuario con ese email.', status: 404 }
  try {
    await setUserPassword(p.id, password, db)
  } catch (err) {
    console.error('cambiarPasswordDe:', err)
    return { ok: false, error: 'No se pudo cambiar la contraseña.', status: 400 }
  }
  return { ok: true }
}

async function borrarPrefijo(bucket: 'planes' | 'recursos', prefijo: string) {
  await borrarArchivos(bucket, await listarArchivos(bucket, `${prefijo}/`))
}

/** Elimina un paciente DESACTIVADO (nunca una cuenta del equipo): archivos primero, luego la cuenta. */
export async function eliminarPaciente(id: string, db: Db = dbGlobal): Promise<Resultado> {
  const [objetivo] = await db.select({ rol: profiles.rol, activo: profiles.activo }).from(profiles).where(eq(profiles.id, id)).limit(1)
  if (!objetivo || objetivo.rol !== 'paciente' || objetivo.activo) {
    return { ok: false, error: 'Solo se puede eliminar un paciente desactivado.', status: 400 }
  }
  try {
    await borrarPrefijo('planes', id)
    await borrarPrefijo('recursos', id)
    // La cascada de Postgres resuelve ficha, mediciones, planes, feedback, objetivos, turnos, etc.
    await eliminarUsuario(id, db)
  } catch (err) {
    console.error('eliminarPaciente:', err)
    return { ok: false, error: 'No se pudo eliminar el paciente.', status: 400 }
  }
  return { ok: true }
}
