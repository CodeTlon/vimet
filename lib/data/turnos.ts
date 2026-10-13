import { and, eq, gte, inArray, lt, gt, lte, ne } from 'drizzle-orm'

import { horarios_disponibles, profiles, servicios, turnos } from '@/db/schema'
import { diaSemana } from '@/lib/booking/slots'
import { hoyArgentina } from '@/lib/datetime'
import { db as dbGlobal, type Db } from '@/lib/db'
import { PG, pgCode } from '@/lib/db-errors'

// Operaciones de turnos sobre la base. Aca viven las reglas que en Supabase hacian la RLS y los
// triggers `turnos_restrict_patient_update` (ver docs/migracion/inventario.md): el paciente solo
// toca sus turnos y solo para confirmar/cancelar; el staff solo los suyos (admin, todos).
// Sin dependencias de Next: se prueba con PGlite en tests/turnos.authz.test.ts.

export type Actor = { id: string; rol: 'paciente' | 'nutricionista' | 'entrenador' | 'admin' }
export type Franja = { fecha: string; hora_inicio: string; hora_fin: string; modalidad: 'presencial' | 'virtual' }

export type TurnoNotif = {
  id: number
  profesional_id: string
  paciente_id: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  notas_paciente: string | null
  servicio_nombre: string | null
}

const esStaff = (rol: Actor['rol']) => rol !== 'paciente'

/** Regla de la policy de update/select de turnos: paciente dueño, profesional dueño o admin. */
export function puedeGestionarTurno(actor: Actor, t: { paciente_id: string; profesional_id: string }): boolean {
  return actor.rol === 'admin' || t.profesional_id === actor.id || t.paciente_id === actor.id
}

const columnasNotif = {
  id: turnos.id,
  profesional_id: turnos.profesional_id,
  paciente_id: turnos.paciente_id,
  fecha: turnos.fecha,
  hora_inicio: turnos.hora_inicio,
  hora_fin: turnos.hora_fin,
  notas_paciente: turnos.notas_paciente,
  servicio_nombre: servicios.nombre,
}

/**
 * Revalida server-side (no confiamos en los slots que ya filtro el cliente) que el profesional
 * tenga un horario activo que cubra la franja con esa modalidad, y que no choque con un turno
 * pendiente/confirmado suyo. `excludeTurnoId` se usa al reprogramar.
 */
export async function profesionalDisponible(
  profesionalId: string,
  franja: Franja,
  excludeTurnoId?: number,
  db: Db = dbGlobal,
): Promise<boolean> {
  const horarios = await db
    .select({ id: horarios_disponibles.id })
    .from(horarios_disponibles)
    .where(
      and(
        eq(horarios_disponibles.profesional_id, profesionalId),
        eq(horarios_disponibles.dia_semana, diaSemana(franja.fecha)),
        eq(horarios_disponibles.activo, true),
        inArray(horarios_disponibles.modalidad, [franja.modalidad, 'ambas']),
        lte(horarios_disponibles.hora_inicio, franja.hora_inicio),
        gte(horarios_disponibles.hora_fin, franja.hora_fin),
      ),
    )
    .limit(1)
  if (horarios.length === 0) return false

  const choques = await db
    .select({ id: turnos.id })
    .from(turnos)
    .where(
      and(
        eq(turnos.profesional_id, profesionalId),
        eq(turnos.fecha, franja.fecha),
        inArray(turnos.estado, ['pendiente', 'confirmado']),
        lt(turnos.hora_inicio, franja.hora_fin),
        gt(turnos.hora_fin, franja.hora_inicio),
        excludeTurnoId ? ne(turnos.id, excludeTurnoId) : undefined,
      ),
    )
    .limit(1)
  return choques.length === 0
}

/**
 * Inserta el turno (uno, o un par vinculado para servicios combo) en una transaccion. La
 * exclusion constraint de la base es el respaldo final contra dos reservas simultaneas.
 */
export async function insertarTurnos(
  datos: {
    pacienteId: string
    profesionalIds: string[]
    servicioId: number
    franja: Franja
    notas: string | null
  },
  db: Db = dbGlobal,
): Promise<{ ok: true; ids: number[] } | { ok: false; motivo: 'ocupado' | 'error' }> {
  try {
    const ids = await db.transaction(async (tx) => {
      const creados = await tx
        .insert(turnos)
        .values(
          datos.profesionalIds.map((profesional_id) => ({
            paciente_id: datos.pacienteId,
            profesional_id,
            servicio_id: datos.servicioId,
            fecha: datos.franja.fecha,
            hora_inicio: datos.franja.hora_inicio,
            hora_fin: datos.franja.hora_fin,
            modalidad: datos.franja.modalidad,
            estado: 'pendiente' as const,
            notas_paciente: datos.notas,
          })),
        )
        .returning({ id: turnos.id })

      // Vincular cada fila con "la otra" (solo soporta el caso de a pares).
      if (creados.length > 1) {
        for (let i = 0; i < creados.length; i++) {
          await tx
            .update(turnos)
            .set({ turno_par_id: creados[(i + 1) % creados.length].id })
            .where(eq(turnos.id, creados[i].id))
        }
      }
      return creados.map((c) => c.id)
    })
    return { ok: true, ids }
  } catch (err) {
    if (pgCode(err) === PG.EXCLUSION_VIOLATION) return { ok: false, motivo: 'ocupado' }
    console.error('insertarTurnos:', err)
    return { ok: false, motivo: 'error' }
  }
}

/** El paciente cancela SU turno (y el par, si es combo). Solo pendiente/confirmado y de hoy en adelante. */
export async function cancelarComoPaciente(userId: string, id: number, db: Db = dbGlobal): Promise<TurnoNotif[]> {
  const [turno] = await db
    .select({ turno_par_id: turnos.turno_par_id })
    .from(turnos)
    .where(and(eq(turnos.id, id), eq(turnos.paciente_id, userId)))
    .limit(1)
  const ids = turno?.turno_par_id ? [id, turno.turno_par_id] : [id]

  const actualizados = await db
    .update(turnos)
    .set({ estado: 'cancelado' })
    .where(
      and(
        inArray(turnos.id, ids),
        eq(turnos.paciente_id, userId),
        inArray(turnos.estado, ['pendiente', 'confirmado']),
        gte(turnos.fecha, hoyArgentina()),
      ),
    )
    .returning({ id: turnos.id })
  if (actualizados.length === 0) return []
  return db
    .select(columnasNotif)
    .from(turnos)
    .leftJoin(servicios, eq(servicios.id, turnos.servicio_id))
    .where(inArray(turnos.id, actualizados.map((a) => a.id)))
}

export async function turnoParaConfirmar(userId: string, id: number, db: Db = dbGlobal) {
  const [turno] = await db
    .select({ turno_par_id: turnos.turno_par_id, fecha: turnos.fecha, hora_inicio: turnos.hora_inicio })
    .from(turnos)
    .where(and(eq(turnos.id, id), eq(turnos.paciente_id, userId)))
    .limit(1)
  return turno ?? null
}

/** El paciente confirma SU turno pendiente (y el par). */
export async function confirmarComoPaciente(userId: string, ids: number[], db: Db = dbGlobal): Promise<TurnoNotif[]> {
  const actualizados = await db
    .update(turnos)
    .set({ estado: 'confirmado' })
    .where(and(inArray(turnos.id, ids), eq(turnos.paciente_id, userId), eq(turnos.estado, 'pendiente')))
    .returning({ id: turnos.id })
  if (actualizados.length === 0) return []
  return db
    .select(columnasNotif)
    .from(turnos)
    .leftJoin(servicios, eq(servicios.id, turnos.servicio_id))
    .where(inArray(turnos.id, actualizados.map((a) => a.id)))
}

export type TurnoStaffRow = TurnoNotif & {
  estado: (typeof turnos.$inferSelect)['estado']
  turno_par_id: number | null
  modalidad: Franja['modalidad']
}

/** Turno + servicio, o null. La autorizacion la decide el llamador con `puedeGestionarTurno`. */
export async function cargarTurno(id: number, db: Db = dbGlobal): Promise<TurnoStaffRow | null> {
  const [t] = await db
    .select({
      ...columnasNotif,
      estado: turnos.estado,
      turno_par_id: turnos.turno_par_id,
      modalidad: turnos.modalidad,
    })
    .from(turnos)
    .leftJoin(servicios, eq(servicios.id, turnos.servicio_id))
    .where(eq(turnos.id, id))
    .limit(1)
  return t ?? null
}

/** Cambio de estado por staff; se propaga al turno vinculado (el del otro profesional). */
export async function aplicarCambioStaff(
  turno: Pick<TurnoStaffRow, 'id' | 'turno_par_id'>,
  cambio: Partial<typeof turnos.$inferInsert>,
  db: Db = dbGlobal,
): Promise<{ ok: true } | { ok: false; motivo: 'ocupado' | 'error' }> {
  const ids = turno.turno_par_id ? [turno.id, turno.turno_par_id] : [turno.id]
  try {
    await db.update(turnos).set(cambio).where(inArray(turnos.id, ids))
    return { ok: true }
  } catch (err) {
    if (pgCode(err) === PG.EXCLUSION_VIOLATION) return { ok: false, motivo: 'ocupado' }
    console.error('aplicarCambioStaff:', err)
    return { ok: false, motivo: 'error' }
  }
}

export async function nombreDePerfil(id: string, db: Db = dbGlobal): Promise<{ nombre: string; email: string | null } | null> {
  const [p] = await db
    .select({ nombre: profiles.nombre, apellido: profiles.apellido, email: profiles.email })
    .from(profiles)
    .where(eq(profiles.id, id))
    .limit(1)
  return p ? { nombre: `${p.nombre} ${p.apellido}`.trim(), email: p.email } : null
}

export { esStaff }
