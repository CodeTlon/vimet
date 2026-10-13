// Registro de sesiones de entrenamiento del paciente (app mobile). SIN 'use server'.
// Reemplaza las policies `sesiones_entrenamiento paciente rw` y `sets_completados paciente rw`:
// el paciente solo toca sesiones propias, y solo sobre ejercicios de SU plan.
import { and, desc, eq, isNull, isNotNull, sql } from 'drizzle-orm'

import {
  ejercicios,
  plan_ejercicios,
  planes,
  sesiones_entrenamiento,
  sets_completados,
} from '@/db/schema'
import { db as dbGlobal, type Db } from '@/lib/db'

const diaOrNull = (dia: string | null | undefined) => (dia ? dia : null)

/** ¿El plan es del paciente? Base de todas las operaciones del paciente. */
async function planEsDe(userId: string, planId: number, db: Db): Promise<boolean> {
  const [p] = await db
    .select({ id: planes.id })
    .from(planes)
    .where(and(eq(planes.id, planId), eq(planes.paciente_id, userId)))
    .limit(1)
  return Boolean(p)
}

/** Sesiones ya finalizadas del paciente en ese plan/dia (para el "ya entrenaste hoy"). */
export async function sesionesFinalizadas(
  userId: string,
  planId: number,
  dia: string | null | undefined,
  limite = 20,
  db: Db = dbGlobal,
) {
  const d = diaOrNull(dia)
  return db
    .select({ dia_semana: sesiones_entrenamiento.dia_semana, iniciada_at: sesiones_entrenamiento.iniciada_at })
    .from(sesiones_entrenamiento)
    .where(
      and(
        eq(sesiones_entrenamiento.plan_id, planId),
        eq(sesiones_entrenamiento.paciente_id, userId),
        isNotNull(sesiones_entrenamiento.finalizada_at),
        d === null ? undefined : eq(sesiones_entrenamiento.dia_semana, d),
      ),
    )
    .orderBy(desc(sesiones_entrenamiento.iniciada_at))
    .limit(limite)
}

/** Ejercicios del dia de un plan PROPIO, con el ejercicio embebido. */
export async function ejerciciosDelDia(userId: string, planId: number, dia: string | null | undefined, db: Db = dbGlobal) {
  if (!(await planEsDe(userId, planId, db))) return []
  const d = diaOrNull(dia)
  const filas = await db
    .select({
      id: plan_ejercicios.id,
      series: plan_ejercicios.series,
      repeticiones: plan_ejercicios.repeticiones,
      descanso_seg: plan_ejercicios.descanso_seg,
      cardio_entrada_calor_valor: plan_ejercicios.cardio_entrada_calor_valor,
      cardio_entrada_calor_unidad: plan_ejercicios.cardio_entrada_calor_unidad,
      cardio_trabajo_principal_valor: plan_ejercicios.cardio_trabajo_principal_valor,
      cardio_trabajo_principal_unidad: plan_ejercicios.cardio_trabajo_principal_unidad,
      cardio_vuelta_calma_valor: plan_ejercicios.cardio_vuelta_calma_valor,
      cardio_vuelta_calma_unidad: plan_ejercicios.cardio_vuelta_calma_unidad,
      ejercicio: {
        nombre: ejercicios.nombre,
        gif_url: ejercicios.gif_url,
        imagen_url: ejercicios.imagen_url,
        modo: ejercicios.modo,
      },
    })
    .from(plan_ejercicios)
    .leftJoin(ejercicios, eq(ejercicios.id, plan_ejercicios.ejercicio_id))
    .where(
      and(
        eq(plan_ejercicios.plan_id, planId),
        d === null ? isNull(plan_ejercicios.dia_semana) : eq(plan_ejercicios.dia_semana, d),
      ),
    )
    .orderBy(plan_ejercicios.orden)
  return filas
}

export async function iniciarSesion(
  userId: string,
  planId: number,
  dia: string | null | undefined,
  db: Db = dbGlobal,
): Promise<{ id: number } | null> {
  if (!(await planEsDe(userId, planId, db))) return null
  const [s] = await db
    .insert(sesiones_entrenamiento)
    .values({ plan_id: planId, paciente_id: userId, dia_semana: diaOrNull(dia) })
    .returning({ id: sesiones_entrenamiento.id })
  return s
}

async function sesionPropia(userId: string, sesionId: number, db: Db) {
  const [s] = await db
    .select({ id: sesiones_entrenamiento.id, plan_id: sesiones_entrenamiento.plan_id })
    .from(sesiones_entrenamiento)
    .where(and(eq(sesiones_entrenamiento.id, sesionId), eq(sesiones_entrenamiento.paciente_id, userId)))
    .limit(1)
  return s ?? null
}

export type SetNuevo = {
  sesion_id: number
  plan_ejercicio_id: number
  numero_set: number
  peso_kg: number | null
  repeticiones: string | null
  duracion_seg: number | null
}

/** Guarda una serie: la sesion es del paciente y el ejercicio pertenece al plan de esa sesion. */
export async function guardarSet(userId: string, set: SetNuevo, db: Db = dbGlobal): Promise<{ id: number } | null> {
  const sesion = await sesionPropia(userId, set.sesion_id, db)
  if (!sesion) return null
  const [pe] = await db
    .select({ id: plan_ejercicios.id })
    .from(plan_ejercicios)
    .where(and(eq(plan_ejercicios.id, set.plan_ejercicio_id), eq(plan_ejercicios.plan_id, sesion.plan_id)))
    .limit(1)
  if (!pe) return null
  const [s] = await db.insert(sets_completados).values(set).returning({ id: sets_completados.id })
  return s
}

export async function guardarDescanso(
  userId: string,
  sesionId: number,
  setId: number,
  descansoSeg: number,
  db: Db = dbGlobal,
): Promise<boolean> {
  if (!(await sesionPropia(userId, sesionId, db))) return false
  const r = await db
    .update(sets_completados)
    .set({ descanso_seg: descansoSeg })
    .where(and(eq(sets_completados.id, setId), eq(sets_completados.sesion_id, sesionId)))
    .returning({ id: sets_completados.id })
  return r.length > 0
}

export async function finalizarSesion(userId: string, sesionId: number, db: Db = dbGlobal): Promise<boolean> {
  const r = await db
    .update(sesiones_entrenamiento)
    .set({ finalizada_at: new Date().toISOString() })
    .where(and(eq(sesiones_entrenamiento.id, sesionId), eq(sesiones_entrenamiento.paciente_id, userId)))
    .returning({ id: sesiones_entrenamiento.id })
  return r.length > 0
}

// ---- Lectura para staff (admin app) ------------------------------------------------------------

export async function sesionesDePaciente(pacienteId: string, db: Db = dbGlobal) {
  const filas = await db
    .select({
      id: sesiones_entrenamiento.id,
      iniciada_at: sesiones_entrenamiento.iniciada_at,
      finalizada_at: sesiones_entrenamiento.finalizada_at,
      sets: sql<number>`(select count(*)::int from ${sets_completados} where ${sets_completados.sesion_id} = ${sesiones_entrenamiento.id})`,
    })
    .from(sesiones_entrenamiento)
    .where(eq(sesiones_entrenamiento.paciente_id, pacienteId))
    .orderBy(desc(sesiones_entrenamiento.iniciada_at))
    .limit(60)
  return filas
}

export async function detalleSesion(pacienteId: string, sesionId: number, db: Db = dbGlobal) {
  const [sesion] = await db
    .select({
      id: sesiones_entrenamiento.id,
      iniciada_at: sesiones_entrenamiento.iniciada_at,
      finalizada_at: sesiones_entrenamiento.finalizada_at,
    })
    .from(sesiones_entrenamiento)
    .where(and(eq(sesiones_entrenamiento.id, sesionId), eq(sesiones_entrenamiento.paciente_id, pacienteId)))
    .limit(1)
  if (!sesion) return null
  const sets = await db
    .select({
      id: sets_completados.id,
      plan_ejercicio_id: sets_completados.plan_ejercicio_id,
      numero_set: sets_completados.numero_set,
      peso_kg: sets_completados.peso_kg,
      repeticiones: sets_completados.repeticiones,
      duracion_seg: sets_completados.duracion_seg,
      descanso_seg: sets_completados.descanso_seg,
      pe_descanso: plan_ejercicios.descanso_seg,
      ej_nombre: ejercicios.nombre,
      ej_modo: ejercicios.modo,
    })
    .from(sets_completados)
    .leftJoin(plan_ejercicios, eq(plan_ejercicios.id, sets_completados.plan_ejercicio_id))
    .leftJoin(ejercicios, eq(ejercicios.id, plan_ejercicios.ejercicio_id))
    .where(eq(sets_completados.sesion_id, sesionId))
    .orderBy(sets_completados.id)
  return {
    sesion,
    sets: sets.map(({ pe_descanso, ej_nombre, ej_modo, ...r }) => ({
      ...r,
      plan_ejercicio: {
        descanso_seg: pe_descanso,
        ejercicio: ej_nombre != null ? { nombre: ej_nombre, modo: ej_modo } : null,
      },
    })),
  }
}

