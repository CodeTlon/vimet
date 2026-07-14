'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { diaSemana, getProfesionalesCombo } from '@/lib/booking/slots'
import { hoyArgentina } from '@/lib/datetime'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type TurnoState = { ok?: boolean; error?: string }

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
  supabase: ReturnType<typeof createClient>,
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

  if (parsed.data.fecha < hoyArgentina()) {
    return { error: 'No podés reservar un turno en una fecha pasada.' }
  }
  if (parsed.data.hora_fin <= parsed.data.hora_inicio) {
    return { error: 'El horario del turno es inválido.' }
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Tenés que iniciar sesión.' }

  const servicioId = Number(parsed.data.servicio_id)
  const { data: servicio } = await supabase
    .from('servicios')
    .select('tipo')
    .eq('id', servicioId)
    .maybeSingle()

  const franja: Franja = {
    fecha: parsed.data.fecha,
    hora_inicio: parsed.data.hora_inicio,
    hora_fin: parsed.data.hora_fin,
    modalidad: parsed.data.modalidad,
  }

  if (servicio?.tipo === 'combo') {
    const profesionalesIds = await getProfesionalesCombo()
    if (profesionalesIds.length < 2) {
      return { error: 'Esa modalidad no está disponible para el horario elegido.' }
    }

    for (const profId of profesionalesIds) {
      if (!(await profesionalDisponible(supabase, profId, franja))) {
        return { error: 'Ese horario ya no está disponible para los dos profesionales.' }
      }
    }

    const filas = profesionalesIds.map((profId) => ({
      paciente_id: user.id,
      profesional_id: profId,
      servicio_id: servicioId,
      fecha: franja.fecha,
      hora_inicio: franja.hora_inicio,
      hora_fin: franja.hora_fin,
      modalidad: franja.modalidad,
      estado: 'pendiente' as const,
      notas_paciente: parsed.data.notas || null,
    }))

    const { data: creados, error } = await supabase.from('turnos').insert(filas).select('id')
    if (error || !creados || creados.length !== profesionalesIds.length) {
      return { error: 'No pudimos reservar el turno. Probá nuevamente.' }
    }

    // Vincular cada fila con "la otra" (solo soporta el caso de a pares).
    await Promise.all(
      creados.map((fila, i) =>
        supabase
          .from('turnos')
          .update({ turno_par_id: creados[(i + 1) % creados.length].id })
          .eq('id', fila.id),
      ),
    )

    revalidatePath('/mis-turnos')
    return { ok: true }
  }

  if (!(await profesionalDisponible(supabase, parsed.data.profesional_id, franja))) {
    return { error: 'Ese horario ya no está disponible.' }
  }

  const { error } = await supabase.from('turnos').insert({
    paciente_id: user.id,
    profesional_id: parsed.data.profesional_id,
    servicio_id: servicioId,
    fecha: parsed.data.fecha,
    hora_inicio: parsed.data.hora_inicio,
    hora_fin: parsed.data.hora_fin,
    modalidad: parsed.data.modalidad,
    estado: 'pendiente',
    notas_paciente: parsed.data.notas || null,
  })

  if (error) {
    return { error: 'No pudimos reservar el turno. Probá nuevamente.' }
  }

  revalidatePath('/mis-turnos')
  return { ok: true }
}

export async function cancelarTurnoAction(formData: FormData) {
  const id = Number(formData.get('id'))
  if (!id) return

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { data: turno } = await supabase
    .from('turnos')
    .select('turno_par_id')
    .eq('id', id)
    .eq('paciente_id', user.id)
    .maybeSingle()

  const ids = turno?.turno_par_id ? [id, turno.turno_par_id] : [id]

  await supabase
    .from('turnos')
    .update({ estado: 'cancelado' })
    .in('id', ids)
    .eq('paciente_id', user.id)
    .in('estado', ['pendiente', 'confirmado'])
    .gte('fecha', hoyArgentina())

  revalidatePath('/mis-turnos')
}

const adminEstadoSchema = z.object({
  id: z.coerce.number().int().positive(),
  estado: z.enum(['pendiente', 'confirmado', 'cancelado', 'completado', 'no_asistio']),
  notas_profesional: z.string().max(2000).optional().default(''),
})

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

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile || !['nutricionista', 'entrenador', 'admin'].includes(profile.rol)) {
    return { error: 'No autorizado' }
  }

  const { data: actual } = await supabase
    .from('turnos')
    .select('estado, turno_par_id')
    .eq('id', parsed.data.id)
    .maybeSingle()
  if (!actual || !['pendiente', 'confirmado'].includes(actual.estado)) {
    return { error: 'Este turno ya está cerrado y no puede modificarse.' }
  }

  const { data: actualizado, error } = await supabase
    .from('turnos')
    .update({
      estado: parsed.data.estado,
      notas_profesional: parsed.data.notas_profesional || null,
    })
    .eq('id', parsed.data.id)
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
        estado: parsed.data.estado,
        notas_profesional: parsed.data.notas_profesional || null,
      })
      .eq('id', actual.turno_par_id)
    revalidatePath(`/admin/turno/${actual.turno_par_id}`)
  }

  revalidatePath('/admin/calendario')
  revalidatePath('/admin/dashboard')
  revalidatePath(`/admin/turno/${parsed.data.id}`)
  return { ok: true }
}
