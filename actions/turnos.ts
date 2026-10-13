'use server'

import { and, eq, inArray, lte } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { servicios, turnos } from '@/db/schema'
import { getProfesionalesCombo } from '@/lib/booking/slots'
import { esStaff, getSessionUser, perfilPorId } from '@/lib/auth/session'
import {
  aplicarCambioStaff,
  cancelarComoPaciente,
  cargarTurno,
  confirmarComoPaciente,
  insertarTurnos,
  nombreDePerfil,
  profesionalDisponible,
  puedeGestionarTurno,
  turnoParaConfirmar,
  type Franja,
  type TurnoNotif,
} from '@/lib/data/turnos'
import { HORAS_CORTE_RESERVA, hoyArgentina, turnoCorteDesde, turnoVencidoDesde } from '@/lib/datetime'
import { db } from '@/lib/db'
import { enviarEmailTurno } from '@/lib/email/resend'
import { formatearFechaCorta } from '@/lib/seguimiento'
import { crearSchema } from '@/lib/validation/turnos'
import TurnoCanceladoProfesionalEmail from '@/emails/turno-cancelado-profesional'
import TurnoCanceladoStaffEmail from '@/emails/turno-cancelado-staff'
import TurnoConfirmadoProfesionalEmail from '@/emails/turno-confirmado-profesional'
import TurnoNuevoProfesionalEmail from '@/emails/turno-nuevo-profesional'
import TurnoReprogramadoPacienteEmail from '@/emails/turno-reprogramado-paciente'

export type TurnoState = { ok?: boolean; error?: string }

// Barrido perezoso: pasa a "no_asistio" (a) los turnos pendientes (nunca confirmados) cuyo
// horario + 15min de gracia ya pasó, y (b) los turnos confirmados que el profesional nunca marcó
// completado, 24hs después de su horario. Se llama al cargar las pantallas que muestran turnos —
// no hay cron, así que si nadie visita esas pantallas el turno vencido no cambia de estado
// hasta que alguien entre.
export async function marcarNoAsistioVencidos() {
  const hoy = hoyArgentina()
  const [pendientes, confirmados] = await Promise.all([
    db.select({ id: turnos.id, fecha: turnos.fecha, hora_fin: turnos.hora_fin }).from(turnos)
      .where(and(eq(turnos.estado, 'pendiente'), lte(turnos.fecha, hoy))),
    db.select({ id: turnos.id, fecha: turnos.fecha, hora_fin: turnos.hora_fin }).from(turnos)
      .where(and(eq(turnos.estado, 'confirmado'), lte(turnos.fecha, hoy))),
  ])

  const vencidos = [
    ...pendientes.filter((t) => turnoVencidoDesde(t.fecha, t.hora_fin) < new Date()),
    ...confirmados.filter((t) => turnoVencidoDesde(t.fecha, t.hora_fin, 24 * 60) < new Date()),
  ]
  if (!vencidos.length) return

  await db.update(turnos).set({ estado: 'no_asistio' }).where(inArray(turnos.id, vencidos.map((t) => t.id)))
}

// Barrido perezoso: cancela los turnos "pendiente" que el paciente nunca confirmó y ya entraron
// en la ventana de corte (HORAS_CORTE_RESERVA antes del turno) — mismo patrón sin cron.
export async function cancelarPendientesSinConfirmar() {
  const data = await db
    .select({ id: turnos.id, fecha: turnos.fecha, hora_inicio: turnos.hora_inicio })
    .from(turnos)
    .where(and(eq(turnos.estado, 'pendiente'), lte(turnos.fecha, hoyArgentina())))

  const vencidos = data.filter((t) => turnoCorteDesde(t.fecha, t.hora_inicio) < new Date())
  if (!vencidos.length) return

  await db.update(turnos).set({ estado: 'cancelado' }).where(inArray(turnos.id, vencidos.map((t) => t.id)))
}

// El schema vive en lib/validation/turnos.ts (no puede ser un export no-async de este archivo
// 'use server') — reusado por app/api/mobile/turnos/crear para validar el mismo formato.

type ProfesionalNotifInfo = {
  pacienteNombre: string
  fecha: string
  horaInicio: string
  horaFin: string
  servicioNombre: string
  notas: string | null
}

// Notifica al profesional por email (best-effort, nunca bloquea el flujo que la dispara — ver
// lib/email/resend.ts). `tipo` decide template y subject.
async function notificarProfesional(
  profesionalId: string,
  tipo: 'nuevo' | 'confirmado' | 'cancelado',
  info: ProfesionalNotifInfo,
): Promise<void> {
  const profesional = await nombreDePerfil(profesionalId)
  if (!profesional?.email) return

  const props = {
    nombreProfesional: profesional.nombre,
    pacienteNombre: info.pacienteNombre,
    fecha: formatearFechaCorta(info.fecha),
    horaInicio: info.horaInicio.slice(0, 5),
    horaFin: info.horaFin.slice(0, 5),
    servicioNombre: info.servicioNombre,
    notas: info.notas,
  }
  const envio = {
    nuevo: { subject: 'Nuevo turno reservado', react: TurnoNuevoProfesionalEmail(props) },
    confirmado: { subject: 'Turno confirmado por el paciente', react: TurnoConfirmadoProfesionalEmail(props) },
    cancelado: { subject: 'Turno cancelado por el paciente', react: TurnoCanceladoProfesionalEmail(props) },
  }[tipo]

  await enviarEmailTurno({ to: profesional.email, subject: envio.subject, react: envio.react })
}

async function notificarProfesionales(pacienteId: string, tipo: 'confirmado' | 'cancelado', filas: TurnoNotif[]) {
  const paciente = await nombreDePerfil(pacienteId)
  await Promise.all(
    filas.map((f) =>
      notificarProfesional(f.profesional_id, tipo, {
        pacienteNombre: paciente?.nombre || 'Un paciente',
        fecha: f.fecha,
        horaInicio: f.hora_inicio,
        horaFin: f.hora_fin,
        servicioNombre: f.servicio_nombre ?? 'un turno',
        notas: f.notas_paciente,
      }),
    ),
  )
}

type PacienteNotifInfo = { fecha: string; horaInicio: string; horaFin: string; servicioNombre: string }

async function notificarPacienteReprogramado(
  pacienteId: string,
  info: PacienteNotifInfo & { motivo: string },
): Promise<void> {
  const paciente = await nombreDePerfil(pacienteId)
  if (!paciente?.email) return

  await enviarEmailTurno({
    to: paciente.email,
    subject: 'Tu turno fue reprogramado',
    react: TurnoReprogramadoPacienteEmail({
      nombre: paciente.nombre,
      fecha: formatearFechaCorta(info.fecha),
      horaInicio: info.horaInicio.slice(0, 5),
      horaFin: info.horaFin.slice(0, 5),
      servicioNombre: info.servicioNombre,
      motivo: info.motivo,
    }),
  })
}

async function notificarPacienteCanceladoStaff(
  pacienteId: string,
  info: PacienteNotifInfo & { motivo: string | null },
): Promise<void> {
  const paciente = await nombreDePerfil(pacienteId)
  if (!paciente?.email) return

  await enviarEmailTurno({
    to: paciente.email,
    subject: 'Tu turno fue cancelado',
    react: TurnoCanceladoStaffEmail({
      nombre: paciente.nombre,
      fecha: formatearFechaCorta(info.fecha),
      horaInicio: info.horaInicio.slice(0, 5),
      horaFin: info.horaFin.slice(0, 5),
      servicioNombre: info.servicioNombre,
      motivo: info.motivo,
    }),
  })
}

// Lógica compartida por la Server Action web (cookies) y por app/api/mobile/turnos/crear (bearer).
// `userId` es SIEMPRE el de la sesión: el paciente solo reserva para sí mismo.
export async function crearTurno(userId: string, d: z.infer<typeof crearSchema>): Promise<TurnoState> {
  if (d.fecha < hoyArgentina()) {
    return { error: 'No podés reservar un turno en una fecha pasada.' }
  }
  if (d.hora_fin <= d.hora_inicio) {
    return { error: 'El horario del turno es inválido.' }
  }
  if (turnoCorteDesde(d.fecha, d.hora_inicio) < new Date()) {
    return {
      error: `Los turnos se reservan con al menos ${HORAS_CORTE_RESERVA} horas de anticipación.`,
    }
  }

  const servicioId = Number(d.servicio_id)
  const [servicio] = await db
    .select({ tipo: servicios.tipo, profesional_id: servicios.profesional_id, nombre: servicios.nombre })
    .from(servicios)
    .where(eq(servicios.id, servicioId))
    .limit(1)
  if (!servicio) {
    return { error: 'Ese servicio ya no está disponible.' }
  }

  const paciente = await nombreDePerfil(userId)
  const pacienteNombre = paciente?.nombre || 'Un paciente'

  const franja: Franja = {
    fecha: d.fecha,
    hora_inicio: d.hora_inicio,
    hora_fin: d.hora_fin,
    modalidad: d.modalidad,
  }

  let profesionalIds: string[]
  if (servicio.tipo === 'combo') {
    profesionalIds = await getProfesionalesCombo()
    if (profesionalIds.length < 2) {
      return { error: 'Esa modalidad no está disponible para el horario elegido.' }
    }
    for (const profId of profesionalIds) {
      if (!(await profesionalDisponible(profId, franja))) {
        return { error: 'Ese horario ya no está disponible para los dos profesionales.' }
      }
    }
  } else {
    if (servicio.profesional_id && servicio.profesional_id !== d.profesional_id) {
      return { error: 'Ese profesional no ofrece el servicio elegido.' }
    }
    if (!(await profesionalDisponible(d.profesional_id, franja))) {
      return { error: 'Ese horario ya no está disponible.' }
    }
    profesionalIds = [d.profesional_id]
  }

  const res = await insertarTurnos({
    pacienteId: userId,
    profesionalIds,
    servicioId,
    franja,
    notas: d.notas || null,
  })
  if (!res.ok) {
    return {
      error: res.motivo === 'ocupado' ? 'Ese horario ya no está disponible.' : 'No pudimos reservar el turno. Probá nuevamente.',
    }
  }

  await Promise.all(
    profesionalIds.map((profId) =>
      notificarProfesional(profId, 'nuevo', {
        pacienteNombre,
        fecha: franja.fecha,
        horaInicio: franja.hora_inicio,
        horaFin: franja.hora_fin,
        servicioNombre: servicio.nombre,
        notas: d.notas || null,
      }),
    ),
  )

  revalidatePath('/mis-turnos')
  return { ok: true }
}

export async function crearTurnoAction(_prev: unknown, formData: FormData): Promise<TurnoState> {
  const parsed = crearSchema.safeParse({
    profesional_id: formData.get('profesional_id'),
    servicio_id: formData.get('servicio_id'),
    fecha: formData.get('fecha'),
    hora_inicio: formData.get('hora_inicio'),
    hora_fin: formData.get('hora_fin'),
    modalidad: formData.get('modalidad') ?? 'presencial',
    notas: formData.get('notas') ?? '',
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }

  const user = await getSessionUser()
  if (!user) return { error: 'Tenés que iniciar sesión.' }

  return crearTurno(user.id, parsed.data)
}

export async function cancelarTurno(userId: string, id: number): Promise<TurnoState> {
  const filas = await cancelarComoPaciente(userId, id)
  if (filas.length) await notificarProfesionales(userId, 'cancelado', filas)

  revalidatePath('/mis-turnos')
  if (!filas.length) return { error: 'No se pudo cancelar el turno.' }
  return { ok: true }
}

export async function cancelarTurnoAction(formData: FormData) {
  const id = Number(formData.get('id'))
  if (!id) return

  const user = await getSessionUser()
  if (!user) return

  await cancelarTurno(user.id, id)
}

export async function confirmarTurno(userId: string, id: number): Promise<TurnoState> {
  const turno = await turnoParaConfirmar(userId, id)
  if (!turno || turnoCorteDesde(turno.fecha, turno.hora_inicio) < new Date()) {
    return { error: 'Este turno ya no se puede confirmar.' }
  }

  const ids = turno.turno_par_id ? [id, turno.turno_par_id] : [id]
  const filas = await confirmarComoPaciente(userId, ids)
  if (filas.length) await notificarProfesionales(userId, 'confirmado', filas)

  revalidatePath('/mis-turnos')
  if (!filas.length) return { error: 'No se pudo confirmar el turno.' }
  return { ok: true }
}

export async function confirmarTurnoAction(formData: FormData) {
  const id = Number(formData.get('id'))
  if (!id) return

  const user = await getSessionUser()
  if (!user) return

  await confirmarTurno(user.id, id)
}

const adminEstadoSchema = z.object({
  id: z.coerce.number().int().positive(),
  estado: z.enum(['pendiente', 'confirmado', 'cancelado', 'completado', 'no_asistio']),
  notas_profesional: z.string().max(2000).optional().default(''),
  motivo_cancelacion: z.string().max(500).optional().default(''),
})

// Staff: solo sobre turnos propios (profesional_id = yo); el admin, sobre cualquiera. Reemplaza la
// policy de update de `turnos`. El cambio se propaga al turno vinculado (plan integral), que
// pertenece al otro profesional.
export async function actualizarTurnoStaff(
  userId: string,
  d: z.infer<typeof adminEstadoSchema>,
): Promise<TurnoState> {
  const actor = await perfilPorId(userId)
  if (!actor || !esStaff(actor.rol)) return { error: 'No autorizado' }

  const actual = await cargarTurno(d.id)
  if (!actual || !puedeGestionarTurno(actor, actual)) {
    return { error: 'No tenés permiso para modificar este turno.' }
  }
  if (!['pendiente', 'confirmado'].includes(actual.estado)) {
    return { error: 'Este turno ya está cerrado y no puede modificarse.' }
  }

  // Cancelar un turno que el paciente ya había confirmado exige avisarle el motivo — se lo va a
  // mostrar en /mis-turnos (motivo_cancelacion, distinta de notas_profesional que es interna).
  const motivoCancelacion = d.motivo_cancelacion?.trim() || null
  if (d.estado === 'cancelado' && actual.estado === 'confirmado' && !motivoCancelacion) {
    return { error: 'Contale al paciente por qué se cancela el turno.' }
  }

  const res = await aplicarCambioStaff(actual, {
    estado: d.estado,
    notas_profesional: d.notas_profesional || null,
    motivo_cancelacion: d.estado === 'cancelado' ? motivoCancelacion : null,
  })
  if (!res.ok) return { error: 'No pudimos actualizar el turno.' }

  if (actual.turno_par_id) revalidatePath(`/admin/turno/${actual.turno_par_id}`)

  if (d.estado === 'cancelado') {
    await notificarPacienteCanceladoStaff(actual.paciente_id, {
      fecha: actual.fecha,
      horaInicio: actual.hora_inicio,
      horaFin: actual.hora_fin,
      servicioNombre: actual.servicio_nombre ?? 'tu turno',
      motivo: motivoCancelacion,
    })
  }

  revalidatePath('/admin/calendario')
  revalidatePath('/admin/dashboard')
  revalidatePath(`/admin/turno/${d.id}`)
  revalidatePath('/mis-turnos')
  return { ok: true }
}

export async function actualizarTurnoStaffAction(_prev: unknown, formData: FormData): Promise<TurnoState> {
  const parsed = adminEstadoSchema.safeParse({
    id: formData.get('id'),
    estado: formData.get('estado'),
    notas_profesional: formData.get('notas_profesional') ?? '',
    motivo_cancelacion: formData.get('motivo_cancelacion') ?? '',
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const user = await getSessionUser()
  if (!user) return { error: 'No autenticado' }

  return actualizarTurnoStaff(user.id, parsed.data)
}

const reprogramarStaffSchema = z.object({
  id: z.coerce.number().int().positive(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
  hora_fin: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
  motivo_reprogramacion: z.string().max(500).optional().default(''),
})

// El profesional carga el horario nuevo después de coordinarlo por fuera del sistema. Solo se
// puede reprogramar un turno ya "confirmado"; al reprogramar vuelve a "pendiente" en la fecha
// nueva y el paciente tiene que volver a confirmarlo o puede cancelarlo. El motivo es obligatorio.
export async function reprogramarTurno(
  userId: string,
  d: z.infer<typeof reprogramarStaffSchema>,
): Promise<TurnoState> {
  const actor = await perfilPorId(userId)
  if (!actor || !esStaff(actor.rol)) return { error: 'No autorizado' }

  if (d.fecha < hoyArgentina()) {
    return { error: 'No podés reprogramar a una fecha pasada.' }
  }
  if (d.hora_fin <= d.hora_inicio) {
    return { error: 'El horario elegido es inválido.' }
  }

  const actual = await cargarTurno(d.id)
  if (!actual || !puedeGestionarTurno(actor, actual)) {
    return { error: 'No tenés permiso para modificar este turno.' }
  }
  if (actual.estado !== 'confirmado') {
    return { error: 'Solo se puede reprogramar un turno ya confirmado.' }
  }

  const motivoReprogramacion = d.motivo_reprogramacion?.trim() || null
  if (!motivoReprogramacion) {
    return { error: 'Contale al paciente por qué se reprograma el turno.' }
  }

  const franja: Franja = {
    fecha: d.fecha,
    hora_inicio: d.hora_inicio,
    hora_fin: d.hora_fin,
    modalidad: actual.modalidad,
  }
  if (!(await profesionalDisponible(actual.profesional_id, franja, d.id))) {
    return { error: 'Ese horario ya no está disponible.' }
  }

  const res = await aplicarCambioStaff(actual, {
    fecha: d.fecha,
    hora_inicio: d.hora_inicio,
    hora_fin: d.hora_fin,
    estado: 'pendiente',
    motivo_reprogramacion: motivoReprogramacion,
  })
  if (!res.ok) {
    return { error: res.motivo === 'ocupado' ? 'Ese horario ya no está disponible.' : 'No pudimos reprogramar el turno.' }
  }

  if (actual.turno_par_id) revalidatePath(`/admin/turno/${actual.turno_par_id}`)

  await notificarPacienteReprogramado(actual.paciente_id, {
    fecha: d.fecha,
    horaInicio: d.hora_inicio,
    horaFin: d.hora_fin,
    servicioNombre: actual.servicio_nombre ?? 'tu turno',
    motivo: motivoReprogramacion,
  })

  revalidatePath('/admin/calendario')
  revalidatePath('/admin/dashboard')
  revalidatePath(`/admin/turno/${d.id}`)
  revalidatePath('/mis-turnos')
  return { ok: true }
}

export async function reprogramarTurnoAction(_prev: unknown, formData: FormData): Promise<TurnoState> {
  const parsed = reprogramarStaffSchema.safeParse({
    id: formData.get('id'),
    fecha: formData.get('fecha'),
    hora_inicio: formData.get('hora_inicio'),
    hora_fin: formData.get('hora_fin'),
    motivo_reprogramacion: formData.get('motivo_reprogramacion') ?? '',
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const user = await getSessionUser()
  if (!user) return { error: 'No autenticado' }

  return reprogramarTurno(user.id, parsed.data)
}
