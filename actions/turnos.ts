'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { diaSemana, getProfesionalesCombo } from '@/lib/booking/slots'
import { HORAS_CORTE_RESERVA, hoyArgentina, turnoCorteDesde, turnoVencidoDesde } from '@/lib/datetime'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type TurnoState = { ok?: boolean; error?: string }

// Barrido perezoso: pasa a "no_asistio" (a) los turnos pendientes (nunca
// confirmados) cuyo horario + 15min de gracia ya pasó, y (b) los turnos
// confirmados que el profesional nunca marcó completado, 24hs después de su
// horario. Se llama al cargar las pantallas que muestran turnos — no hay
// cron, así que si nadie visita esas pantallas el turno vencido no cambia de
// estado hasta que alguien entre.
export async function marcarNoAsistioVencidos() {
  const admin = createAdminClient()
  const [{ data: pendientes }, { data: confirmados }] = await Promise.all([
    admin.from('turnos').select('id, fecha, hora_fin').eq('estado', 'pendiente').lte('fecha', hoyArgentina()),
    admin.from('turnos').select('id, fecha, hora_fin').eq('estado', 'confirmado').lte('fecha', hoyArgentina()),
  ])

  const vencidos = [
    ...(pendientes ?? []).filter((t) => turnoVencidoDesde(t.fecha, t.hora_fin) < new Date()),
    ...(confirmados ?? []).filter((t) => turnoVencidoDesde(t.fecha, t.hora_fin, 24 * 60) < new Date()),
  ]
  if (!vencidos.length) return

  await admin
    .from('turnos')
    .update({ estado: 'no_asistio' })
    .in('id', vencidos.map((t) => t.id))
}

// Barrido perezoso: cancela los turnos "pendiente" que el paciente nunca
// confirmó y ya entraron en la ventana de corte (HORAS_CORTE_RESERVA antes
// del turno) — mismo patrón sin cron que marcarNoAsistioVencidos.
export async function cancelarPendientesSinConfirmar() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('turnos')
    .select('id, fecha, hora_inicio')
    .eq('estado', 'pendiente')
    .lte('fecha', hoyArgentina())

  const vencidos = (data ?? []).filter((t) => turnoCorteDesde(t.fecha, t.hora_inicio) < new Date())
  if (!vencidos.length) return

  await admin
    .from('turnos')
    .update({ estado: 'cancelado' })
    .in('id', vencidos.map((t) => t.id))
}

const crearSchema = z.object({
  profesional_id: z.string().uuid('Profesional inválido'),
  servicio_id: z.string().min(1, 'Servicio inválido'),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
  hora_fin: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
  modalidad: z.enum(['presencial', 'virtual']),
  notas: z.string().max(500).optional().default(''),
})

type Franja = {
  fecha: string
  hora_inicio: string
  hora_fin: string
  modalidad: 'presencial' | 'virtual'
}

// Revalida server-side (no confiamos en los slots que ya filtró el cliente)
// que el profesional tenga un horario activo que cubra la franja con esa
// modalidad, y que no choque con un turno ya confirmado/pendiente suyo.
async function profesionalDisponible(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profesionalId: string,
  franja: Franja,
): Promise<boolean> {
  const { data: horariosCompatibles } = await supabase
    .from('horarios_disponibles')
    .select('id')
    .eq('profesional_id', profesionalId)
    .eq('dia_semana', diaSemana(franja.fecha))
    .eq('activo', true)
    .in('modalidad', [franja.modalidad, 'ambas'])
    .lte('hora_inicio', franja.hora_inicio)
    .gte('hora_fin', franja.hora_fin)
    .limit(1)

  if (!horariosCompatibles?.length) return false

  const { data: choques } = await supabase
    .from('turnos')
    .select('id')
    .eq('profesional_id', profesionalId)
    .eq('fecha', franja.fecha)
    .in('estado', ['pendiente', 'confirmado'])
    .lt('hora_inicio', franja.hora_fin)
    .gt('hora_fin', franja.hora_inicio)
    .limit(1)

  return !choques?.length
}

// Lógica compartida por la Server Action web (cookies) y por
// app/api/mobile/turnos/crear (bearer token) — ver lib/supabase/bearer.ts.
export async function crearTurno(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  d: z.infer<typeof crearSchema>,
): Promise<TurnoState> {
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
  const { data: servicio } = await supabase
    .from('servicios')
    .select('tipo, profesional_id')
    .eq('id', servicioId)
    .maybeSingle()

  if (!servicio) {
    return { error: 'Ese servicio ya no está disponible.' }
  }

  const franja: Franja = {
    fecha: d.fecha,
    hora_inicio: d.hora_inicio,
    hora_fin: d.hora_fin,
    modalidad: d.modalidad,
  }

  if (servicio?.tipo === 'combo') {
    const profesionalesIds = await getProfesionalesCombo(supabase)
    if (profesionalesIds.length < 2) {
      return { error: 'Esa modalidad no está disponible para el horario elegido.' }
    }

    for (const profId of profesionalesIds) {
      if (!(await profesionalDisponible(supabase, profId, franja))) {
        return { error: 'Ese horario ya no está disponible para los dos profesionales.' }
      }
    }

    const filas = profesionalesIds.map((profId) => ({
      paciente_id: userId,
      profesional_id: profId,
      servicio_id: servicioId,
      fecha: franja.fecha,
      hora_inicio: franja.hora_inicio,
      hora_fin: franja.hora_fin,
      modalidad: franja.modalidad,
      estado: 'pendiente' as const,
      notas_paciente: d.notas || null,
    }))

    const { data: creados, error } = await supabase.from('turnos').insert(filas).select('id')
    if (error || !creados || creados.length !== profesionalesIds.length) {
      return { error: 'No pudimos reservar el turno. Probá nuevamente.' }
    }

    // Vincular cada fila con "la otra" (solo soporta el caso de a pares).
    const vinculos = await Promise.all(
      creados.map((fila, i) =>
        supabase
          .from('turnos')
          .update({ turno_par_id: creados[(i + 1) % creados.length].id })
          .eq('id', fila.id),
      ),
    )
    if (vinculos.some((r) => r.error)) {
      // Uno de los dos updates falló: no dejamos turnos "combo" huérfanos.
      await supabase.from('turnos').delete().in('id', creados.map((f) => f.id))
      return { error: 'No pudimos reservar el turno. Probá nuevamente.' }
    }

    revalidatePath('/mis-turnos')
    return { ok: true }
  }

  if (servicio.profesional_id && servicio.profesional_id !== d.profesional_id) {
    return { error: 'Ese profesional no ofrece el servicio elegido.' }
  }

  if (!(await profesionalDisponible(supabase, d.profesional_id, franja))) {
    return { error: 'Ese horario ya no está disponible.' }
  }

  const { error } = await supabase.from('turnos').insert({
    paciente_id: userId,
    profesional_id: d.profesional_id,
    servicio_id: servicioId,
    fecha: d.fecha,
    hora_inicio: d.hora_inicio,
    hora_fin: d.hora_fin,
    modalidad: d.modalidad,
    estado: 'pendiente',
    notas_paciente: d.notas || null,
  })

  if (error) {
    return { error: 'No pudimos reservar el turno. Probá nuevamente.' }
  }

  revalidatePath('/mis-turnos')
  return { ok: true }
}

export async function crearTurnoAction(
  _prev: unknown,
  formData: FormData,
): Promise<TurnoState> {
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

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Tenés que iniciar sesión.' }

  return crearTurno(supabase, user.id, parsed.data)
}

export async function cancelarTurno(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  id: number,
): Promise<TurnoState> {
  const { data: turno } = await supabase
    .from('turnos')
    .select('turno_par_id')
    .eq('id', id)
    .eq('paciente_id', userId)
    .maybeSingle()

  const ids = turno?.turno_par_id ? [id, turno.turno_par_id] : [id]

  const { data: actualizados } = await supabase
    .from('turnos')
    .update({ estado: 'cancelado' })
    .in('id', ids)
    .eq('paciente_id', userId)
    .in('estado', ['pendiente', 'confirmado'])
    .gte('fecha', hoyArgentina())
    .select('id')

  revalidatePath('/mis-turnos')
  if (!actualizados?.length) return { error: 'No se pudo cancelar el turno.' }
  return { ok: true }
}

export async function cancelarTurnoAction(formData: FormData) {
  const id = Number(formData.get('id'))
  if (!id) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await cancelarTurno(supabase, user.id, id)
}

export async function confirmarTurno(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  id: number,
): Promise<TurnoState> {
  const { data: turno } = await supabase
    .from('turnos')
    .select('turno_par_id, fecha, hora_inicio')
    .eq('id', id)
    .eq('paciente_id', userId)
    .maybeSingle()
  if (!turno || turnoCorteDesde(turno.fecha, turno.hora_inicio) < new Date()) {
    return { error: 'Este turno ya no se puede confirmar.' }
  }

  const ids = turno.turno_par_id ? [id, turno.turno_par_id] : [id]

  const { data: actualizados } = await supabase
    .from('turnos')
    .update({ estado: 'confirmado' })
    .in('id', ids)
    .eq('paciente_id', userId)
    .eq('estado', 'pendiente')
    .select('id')

  revalidatePath('/mis-turnos')
  if (!actualizados?.length) return { error: 'No se pudo confirmar el turno.' }
  return { ok: true }
}

export async function confirmarTurnoAction(formData: FormData) {
  const id = Number(formData.get('id'))
  if (!id) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await confirmarTurno(supabase, user.id, id)
}

const adminEstadoSchema = z.object({
  id: z.coerce.number().int().positive(),
  estado: z.enum([
    'pendiente',
    'confirmado',
    'cancelado',
    'completado',
    'no_asistio',
    'pendiente_reprogramacion',
  ]),
  notas_profesional: z.string().max(2000).optional().default(''),
})

// `supabase` = cliente scoped al staff logueado (cookies o bearer), ya se usa
// para validar rol + ownership antes de tocar nada. `admin` = service role,
// solo para propagar al turno par (RLS no deja a un profesional escribir el
// turno del otro).
export async function actualizarTurnoStaff(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  d: z.infer<typeof adminEstadoSchema>,
): Promise<TurnoState> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', userId)
    .maybeSingle()
  if (!profile || !['nutricionista', 'entrenador', 'admin'].includes(profile.rol)) {
    return { error: 'No autorizado' }
  }

  const { data: actual } = await supabase
    .from('turnos')
    .select('estado, turno_par_id')
    .eq('id', d.id)
    .maybeSingle()
  if (!actual || !['pendiente', 'confirmado'].includes(actual.estado)) {
    return { error: 'Este turno ya está cerrado y no puede modificarse.' }
  }

  const { data: actualizado, error } = await supabase
    .from('turnos')
    .update({
      estado: d.estado,
      notas_profesional: d.notas_profesional || null,
    })
    .eq('id', d.id)
    .select('id')

  if (error) return { error: 'No pudimos actualizar el turno.' }
  if (!actualizado?.length) {
    return { error: 'No tenés permiso para modificar este turno.' }
  }

  // El turno vinculado (plan integral) pertenece al otro profesional — el
  // cliente de sesión no puede escribirlo por RLS, así que se propaga con
  // el cliente admin. Ya se validó arriba que el usuario es staff y que es
  // dueño legítimo de `actual` antes de llegar acá.
  if (actual.turno_par_id) {
    const admin = createAdminClient()
    await admin
      .from('turnos')
      .update({
        estado: d.estado,
        notas_profesional: d.notas_profesional || null,
      })
      .eq('id', actual.turno_par_id)
    revalidatePath(`/admin/turno/${actual.turno_par_id}`)
  }

  revalidatePath('/admin/calendario')
  revalidatePath('/admin/dashboard')
  revalidatePath(`/admin/turno/${d.id}`)
  return { ok: true }
}

export async function actualizarTurnoStaffAction(
  _prev: unknown,
  formData: FormData,
): Promise<TurnoState> {
  const parsed = adminEstadoSchema.safeParse({
    id: formData.get('id'),
    estado: formData.get('estado'),
    notas_profesional: formData.get('notas_profesional') ?? '',
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  return actualizarTurnoStaff(supabase, user.id, parsed.data)
}

const reprogramarSchema = z.object({
  id: z.coerce.number().int().positive(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
  hora_fin: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
})

// El paciente elige el horario nuevo de un turno que el staff puso en
// 'pendiente_reprogramacion'. Se hace con el cliente de sesión del paciente
// (no admin): la migración 0025 relaja el trigger justo para esta
// transición, y la propagación al turno_par_id funciona porque el paciente
// es dueño de ambas filas (mismo patrón que cancelarTurno/confirmarTurno).
export async function elegirNuevoHorarioTurno(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  d: z.infer<typeof reprogramarSchema>,
): Promise<TurnoState> {
  if (d.fecha < hoyArgentina()) {
    return { error: 'No podés elegir una fecha pasada.' }
  }
  if (d.hora_fin <= d.hora_inicio) {
    return { error: 'El horario elegido es inválido.' }
  }
  if (turnoCorteDesde(d.fecha, d.hora_inicio) < new Date()) {
    return {
      error: `Los turnos se reservan con al menos ${HORAS_CORTE_RESERVA} horas de anticipación.`,
    }
  }

  const { data: turno } = await supabase
    .from('turnos')
    .select('turno_par_id, profesional_id, modalidad')
    .eq('id', d.id)
    .eq('paciente_id', userId)
    .eq('estado', 'pendiente_reprogramacion')
    .maybeSingle()
  if (!turno) {
    return { error: 'Este turno no está pendiente de reprogramación.' }
  }

  const franja: Franja = {
    fecha: d.fecha,
    hora_inicio: d.hora_inicio,
    hora_fin: d.hora_fin,
    modalidad: turno.modalidad,
  }
  if (!(await profesionalDisponible(supabase, turno.profesional_id, franja))) {
    return { error: 'Ese horario ya no está disponible.' }
  }

  const ids = turno.turno_par_id ? [d.id, turno.turno_par_id] : [d.id]

  const { data: actualizados } = await supabase
    .from('turnos')
    .update({
      fecha: d.fecha,
      hora_inicio: d.hora_inicio,
      hora_fin: d.hora_fin,
      estado: 'pendiente',
    })
    .in('id', ids)
    .eq('paciente_id', userId)
    .eq('estado', 'pendiente_reprogramacion')
    .select('id')

  revalidatePath('/mis-turnos')
  if (!actualizados?.length) return { error: 'No se pudo reprogramar el turno.' }
  return { ok: true }
}

export async function elegirNuevoHorarioTurnoAction(
  _prev: unknown,
  formData: FormData,
): Promise<TurnoState> {
  const parsed = reprogramarSchema.safeParse({
    id: formData.get('id'),
    fecha: formData.get('fecha'),
    hora_inicio: formData.get('hora_inicio'),
    hora_fin: formData.get('hora_fin'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Tenés que iniciar sesión.' }

  return elegirNuevoHorarioTurno(supabase, user.id, parsed.data)
}
