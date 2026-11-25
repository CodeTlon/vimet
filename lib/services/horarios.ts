// Servicio de agenda del profesional (franjas horarias) y efectos sobre turnos. SIN 'use server':
// recibe el profesional ya autenticado; lo usan actions/horarios.ts (web) y las rutas mobile.
import { and, asc, eq, gte, inArray, ne } from 'drizzle-orm'

import { horarios_disponibles, profiles, servicios, turnos } from '@/db/schema'
import { diaSemana } from '@/lib/booking/slots'
import { hoyArgentina } from '@/lib/datetime'
import { db as dbGlobal, type Db } from '@/lib/db'
import { enviarEmailTurno } from '@/lib/email/resend'
import { formatearFechaCorta } from '@/lib/seguimiento'
import TurnoCanceladoEmail from '@/emails/turno-cancelado'

export type CanceladoInfo = {
  id: number
  pacienteNombre: string
  pacienteTelefono: string | null
  fecha: string
  horaInicio: string
  horaFin: string
  servicioNombre: string
}

export type HorarioState = { ok?: boolean; error?: string; cancelados?: CanceladoInfo[] }

export type TurnoAfectado = {
  id: number
  paciente_id: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  servicio_nombre: string | null
}

export type FranjaInput = { dia_semana: number; hora_inicio: string; hora_fin: string; modalidad: 'presencial' | 'virtual' | 'ambas' }

/** ¿La franja se superpone con otra activa del mismo dia del profesional? */
export async function franjaSeSolapa(
  profesionalId: string,
  f: FranjaInput,
  excluirId?: number,
  db: Db = dbGlobal,
): Promise<boolean> {
  const existentes = await db
    .select({ hora_inicio: horarios_disponibles.hora_inicio, hora_fin: horarios_disponibles.hora_fin })
    .from(horarios_disponibles)
    .where(
      and(
        eq(horarios_disponibles.profesional_id, profesionalId),
        eq(horarios_disponibles.dia_semana, f.dia_semana),
        eq(horarios_disponibles.activo, true),
        excluirId ? ne(horarios_disponibles.id, excluirId) : undefined,
      ),
    )
  return existentes.some((h) => f.hora_inicio < h.hora_fin.slice(0, 5) && f.hora_fin > h.hora_inicio.slice(0, 5))
}

export async function agregarFranja(profesionalId: string, f: FranjaInput, db: Db = dbGlobal): Promise<void> {
  await db.insert(horarios_disponibles).values({ profesional_id: profesionalId, ...f, activo: true })
}

/** La franja solo se encuentra si es del profesional: reemplaza la policy `profesional_id = auth.uid()`. */
export async function franjaPropia(profesionalId: string, id: number, db: Db = dbGlobal) {
  const [h] = await db
    .select({ dia_semana: horarios_disponibles.dia_semana })
    .from(horarios_disponibles)
    .where(and(eq(horarios_disponibles.id, id), eq(horarios_disponibles.profesional_id, profesionalId)))
    .limit(1)
  return h ?? null
}

export async function actualizarFranja(profesionalId: string, id: number, f: FranjaInput, db: Db = dbGlobal): Promise<void> {
  await db
    .update(horarios_disponibles)
    .set(f)
    .where(and(eq(horarios_disponibles.id, id), eq(horarios_disponibles.profesional_id, profesionalId)))
}

export async function eliminarFranja(profesionalId: string, id: number, db: Db = dbGlobal): Promise<void> {
  await db
    .delete(horarios_disponibles)
    .where(and(eq(horarios_disponibles.id, id), eq(horarios_disponibles.profesional_id, profesionalId)))
}

// Turnos futuros del profesional, en los días dados, que ya no están contenidos en ninguna franja
// activa (no alcanza con "se solapaba con la franja que se tocó": si otra franja del mismo día
// lo sigue cubriendo, el turno queda cubierto igual y no hay que cancelarlo).
export async function turnosSinCobertura(
  profesionalId: string,
  dias: number[],
  db: Db = dbGlobal,
): Promise<TurnoAfectado[]> {
  const filas = await db
    .select({
      id: turnos.id,
      paciente_id: turnos.paciente_id,
      fecha: turnos.fecha,
      hora_inicio: turnos.hora_inicio,
      hora_fin: turnos.hora_fin,
      servicio_nombre: servicios.nombre,
    })
    .from(turnos)
    .leftJoin(servicios, eq(servicios.id, turnos.servicio_id))
    .where(
      and(
        eq(turnos.profesional_id, profesionalId),
        inArray(turnos.estado, ['pendiente', 'confirmado']),
        gte(turnos.fecha, hoyArgentina()),
      ),
    )

  const relevantes = filas.filter((t) => dias.includes(diaSemana(t.fecha)))
  if (relevantes.length === 0) return []

  const horarios = await db
    .select({
      dia_semana: horarios_disponibles.dia_semana,
      hora_inicio: horarios_disponibles.hora_inicio,
      hora_fin: horarios_disponibles.hora_fin,
    })
    .from(horarios_disponibles)
    .where(
      and(
        eq(horarios_disponibles.profesional_id, profesionalId),
        eq(horarios_disponibles.activo, true),
        inArray(horarios_disponibles.dia_semana, dias),
      ),
    )
    .orderBy(asc(horarios_disponibles.hora_inicio))

  return relevantes.filter((t) => {
    const tIni = t.hora_inicio.slice(0, 5)
    const tFin = t.hora_fin.slice(0, 5)
    const cubierto = horarios.some(
      (h) =>
        h.dia_semana === diaSemana(t.fecha) && tIni >= h.hora_inicio.slice(0, 5) && tFin <= h.hora_fin.slice(0, 5),
    )
    return !cubierto
  })
}

// Cancela los turnos dados y avisa por email a cada paciente afectado. Best-effort: si un email
// falla no revierte la cancelación (el turno ya no tiene horario real).
export async function cancelarYNotificar(afectados: TurnoAfectado[], db: Db = dbGlobal): Promise<CanceladoInfo[]> {
  if (afectados.length === 0) return []

  await db
    .update(turnos)
    .set({ estado: 'cancelado' })
    .where(inArray(turnos.id, afectados.map((t) => t.id)))

  const pacienteIds = [...new Set(afectados.map((t) => t.paciente_id))]
  const pacientes = await db
    .select({ id: profiles.id, nombre: profiles.nombre, apellido: profiles.apellido, email: profiles.email, telefono: profiles.telefono })
    .from(profiles)
    .where(inArray(profiles.id, pacienteIds))
  const pacientesById = new Map(pacientes.map((p) => [p.id, p]))

  await Promise.all(
    afectados.map(async (t) => {
      const paciente = pacientesById.get(t.paciente_id)
      if (!paciente?.email) return
      await enviarEmailTurno({
        to: paciente.email,
        subject: 'Tu turno fue cancelado — cambio en la agenda',
        react: TurnoCanceladoEmail({
          nombre: `${paciente.nombre} ${paciente.apellido}`.trim(),
          fecha: formatearFechaCorta(t.fecha),
          horaInicio: t.hora_inicio.slice(0, 5),
          horaFin: t.hora_fin.slice(0, 5),
          servicioNombre: t.servicio_nombre ?? 'tu turno',
        }),
      })
    }),
  )

  return afectados.map((t) => {
    const paciente = pacientesById.get(t.paciente_id)
    return {
      id: t.id,
      pacienteNombre: paciente ? `${paciente.nombre} ${paciente.apellido}`.trim() : 'Paciente',
      pacienteTelefono: paciente?.telefono ?? null,
      fecha: t.fecha,
      horaInicio: t.hora_inicio.slice(0, 5),
      horaFin: t.hora_fin.slice(0, 5),
      servicioNombre: t.servicio_nombre ?? 'tu turno',
    }
  })
}
