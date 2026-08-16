// Aplica el dataset demo de scripts/data/demo-pacientes.mjs contra Supabase:
// 10 pacientes con 3-6 meses de historial (fichas, mediciones, evaluaciones,
// planes+ejercicios, turnos, objetivos, feedback semanal, evolución).
//
// Correr a mano, apuntando SIEMPRE a vimet-dev (nunca prod):
//   node --env-file=.env.local scripts/seed-demo-pacientes.mjs
//
// Es idempotente: si un paciente ya existe (por email) se saltea. Reutiliza
// el catálogo de ejercicios ya cargado (tabla `ejercicios`) — no crea ninguno.
// Mismo mecanismo de alta que crearPacienteGestionadoAction (actions/staff.ts):
// admin.auth.admin.createUser + service role, pero con login real (password
// conocida) en vez de `gestionado_por_staff`.

import { createClient } from '@supabase/supabase-js'

import { DEMO_PASSWORD, PACIENTES } from './data/demo-pacientes.mjs'

// ───────────────────────── Fechas (zona Argentina) ─────────────────────────
// Mismo criterio que lib/datetime.ts: anclamos a mediodía UTC para que sumar/
// restar días no cruce de fecha por un corrimiento horario.

const TZ_ARGENTINA = 'America/Argentina/Cordoba'
const DATE_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ_ARGENTINA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function hoyArgentina(date = new Date()) {
  return DATE_FMT.format(date)
}

function sumarDiasISO(fechaISO, dias) {
  const [y, m, d] = fechaISO.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  utc.setUTCDate(utc.getUTCDate() + dias)
  return utc.toISOString().slice(0, 10)
}

// offset negativo = pasado, positivo = futuro, relativo al momento de correr el script.
function fechaOffset(diasDesdeHoy) {
  return sumarDiasISO(hoyArgentina(), diasDesdeHoy)
}

function diaSemanaISO(fechaISO) {
  return new Date(`${fechaISO}T00:00:00Z`).getUTCDay() // 0=domingo, igual que Postgres
}

function lunesSemanaOffset(semanasAtras) {
  const hoy = hoyArgentina()
  const dow = diaSemanaISO(hoy)
  const diffALunes = dow === 0 ? -6 : 1 - dow
  const lunesActual = sumarDiasISO(hoy, diffALunes)
  return sumarDiasISO(lunesActual, -7 * semanasAtras)
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}
function toHHMM(total) {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function hashCode(str) {
  let hash = 5381
  for (let i = 0; i < str.length; i++) hash = (hash * 33) ^ str.charCodeAt(i)
  return hash >>> 0
}

// ─────────────────────────────── Cliente admin ──────────────────────────────

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  if (!url.includes('qwzlhbecpgysgophpbyf')) {
    throw new Error(
      `Este script está pensado solo para vimet-dev. La URL configurada (${url}) no coincide — abortando por seguridad.`,
    )
  }
  return createClient(url, key)
}

// ──────────────────────────── Slots libres de turnos ────────────────────────
// Mismo criterio que lib/booking/slots.ts (getSlotsDisponibles): franjas de
// horarios_disponibles menos los turnos activos ya agendados ese día, en
// pasos de 15 minutos. No reimplementa RLS ni bloqueos (no aplica: cliente
// admin, y no sembramos bloqueos_horario).

async function slotsLibresParaFecha(supabase, profesionalId, fecha, duracionMin) {
  const dow = diaSemanaISO(fecha)
  const { data: horarios } = await supabase
    .from('horarios_disponibles')
    .select('hora_inicio, hora_fin')
    .eq('profesional_id', profesionalId)
    .eq('dia_semana', dow)
    .eq('activo', true)
  if (!horarios?.length) return []

  const { data: turnos } = await supabase
    .from('turnos')
    .select('hora_inicio, hora_fin')
    .eq('profesional_id', profesionalId)
    .eq('fecha', fecha)
    .in('estado', ['pendiente', 'confirmado'])

  const ocupadas = (turnos ?? []).map((t) => ({
    inicio: toMinutes(t.hora_inicio),
    fin: toMinutes(t.hora_fin),
  }))

  const slots = []
  for (const h of horarios) {
    const wStart = toMinutes(h.hora_inicio)
    const wEnd = toMinutes(h.hora_fin)
    for (let t = wStart; t + duracionMin <= wEnd; t += 15) {
      const inicio = t
      const fin = t + duracionMin
      if (ocupadas.some((o) => inicio < o.fin && fin > o.inicio)) continue
      slots.push({ horaInicio: toHHMM(inicio), horaFin: toHHMM(fin) })
    }
  }
  return slots
}

// Busca un slot libre para UN profesional arrancando en fechaBase, corriendo
// hacia adelante día por día si ese día no tiene horario o está lleno.
async function buscarSlot(supabase, profesionalId, fechaBase, duracionMin, maxDias = 6) {
  for (let offset = 0; offset <= maxDias; offset++) {
    const fecha = sumarDiasISO(fechaBase, offset)
    const slots = await slotsLibresParaFecha(supabase, profesionalId, fecha, duracionMin)
    if (slots.length) return { fecha, ...slots[Math.floor(slots.length / 2)] }
  }
  return null
}

// Busca un slot donde AMBOS profesionales (combo) estén libres al mismo
// horario exacto — mismo criterio que getSlotsDisponiblesCombo.
async function buscarSlotCombo(supabase, profId1, profId2, fechaBase, duracionMin, maxDias = 6) {
  for (let offset = 0; offset <= maxDias; offset++) {
    const fecha = sumarDiasISO(fechaBase, offset)
    const [slots1, slots2] = await Promise.all([
      slotsLibresParaFecha(supabase, profId1, fecha, duracionMin),
      slotsLibresParaFecha(supabase, profId2, fecha, duracionMin),
    ])
    const interseccion = slots1.filter((s) =>
      slots2.some((s2) => s2.horaInicio === s.horaInicio && s2.horaFin === s.horaFin),
    )
    if (interseccion.length) return { fecha, ...interseccion[Math.floor(interseccion.length / 2)] }
  }
  return null
}

// ────────────────────────────── Catálogo de ejercicios ──────────────────────

const cacheEjercicios = new Map()

async function resolverEjercicioFuerza(supabase, parteCuerpo, seed) {
  if (!cacheEjercicios.has(parteCuerpo)) {
    const { data } = await supabase
      .from('ejercicios')
      .select('id')
      .eq('origen', 'dataset')
      .eq('modo', 'fuerza')
      .eq('parte_cuerpo', parteCuerpo)
      .limit(50)
    cacheEjercicios.set(parteCuerpo, data ?? [])
  }
  const candidatos = cacheEjercicios.get(parteCuerpo)
  if (!candidatos.length) throw new Error(`No hay ejercicios de "${parteCuerpo}" en el catálogo.`)
  return candidatos[hashCode(seed) % candidatos.length].id
}

let cardioEjercicioId = null
async function resolverEjercicioCardio(supabase) {
  if (cardioEjercicioId) return cardioEjercicioId
  const { data } = await supabase
    .from('ejercicios')
    .select('id')
    .eq('modo', 'cardio')
    .ilike('nombre', 'correr')
    .limit(1)
    .maybeSingle()
  if (!data) throw new Error('No se encontró un ejercicio modo=cardio ("correr") en el catálogo.')
  cardioEjercicioId = data.id
  return cardioEjercicioId
}

// ────────────────────────────── Feedback semanal ────────────────────────────

const RANGOS_FEEDBACK = {
  A: { fisico: [6, 9], animo: [6, 9], energia: [6, 9], entren: [70, 95], alim: [70, 95] },
  B: { fisico: [5, 5], animo: [5, 4], energia: [5, 4], entren: [55, 40], alim: [55, 42] },
  C: { fisico: [6, 7], animo: [7, 7], energia: [6, 7], entren: [60, 70], alim: [60, 70] },
}

const OBSERVACIONES_FEEDBACK = {
  A: ['Buena semana, cumplí casi todo el plan.', 'Semana sólida, sin sobresaltos.', 'Me sentí con mucha energía toda la semana.'],
  B: ['Semana difícil, no llegué a cumplir todo.', 'Me costó organizarme esta semana.', 'Bajé bastante la adherencia, mucho trabajo.'],
  C: ['Primera semana, todavía adaptándome al plan.', 'Buena semana para arrancar.', 'Semana tranquila, sin grandes cambios.'],
}

const MENSAJES_PACIENTE = {
  A: 'Semana muy buena, pude sostener el plan sin problemas.',
  B: 'Esta semana me costó bastante, no llegué a cumplir todo.',
  C: 'Recién estoy arrancando, todavía adaptándome al plan.',
}
const MENSAJES_STAFF = {
  A: 'Excelente, seguimos así. Cualquier duda me escribís.',
  B: 'No hay drama, la próxima retomamos con metas más chicas.',
  C: 'Es normal las primeras semanas, cualquier cosa preguntame.',
}

function lerp([ini, fin], t) {
  return Math.round(ini + (fin - ini) * t)
}

function valoresFeedback(nivel, idx, total, pesoIni, pesoFin) {
  const t = total > 1 ? idx / (total - 1) : 1
  const r = RANGOS_FEEDBACK[nivel]
  const peso = pesoIni != null && pesoFin != null ? Math.round((pesoIni + (pesoFin - pesoIni) * t) * 10) / 10 : null
  return {
    estado_fisico: lerp(r.fisico, t),
    animo: lerp(r.animo, t),
    energia: lerp(r.energia, t),
    adherencia_entrenamiento: lerp(r.entren, t),
    adherencia_alimentacion: lerp(r.alim, t),
    peso_autoreporte_kg: peso,
    observaciones: OBSERVACIONES_FEEDBACK[nivel][idx % OBSERVACIONES_FEEDBACK[nivel].length],
  }
}

// ────────────────────────────────── Ejercicios: campos ISAK ─────────────────

function camposIsak(isak) {
  if (!isak) return {}
  return {
    pliegue_triceps_mm: isak.triceps,
    pliegue_subescapular_mm: isak.subescapular,
    pliegue_supraespinal_mm: isak.supraespinal,
    pliegue_abdominal_mm: isak.abdominal,
    pliegue_muslo_mm: isak.muslo,
    pliegue_pierna_mm: isak.pierna,
    pliegue_biceps_mm: isak.biceps,
    pliegue_cresta_iliaca_mm: isak.cresta,
    perimetro_brazo_cm: isak.perimetroBrazo,
    perimetro_muslo_cm: isak.perimetroMuslo,
    perimetro_pierna_cm: isak.perimetroPierna,
    kg_tejido_muscular: isak.kgTejidoMuscular,
    kg_tejido_oseo: isak.kgTejidoOseo,
  }
}

function camposTests(tests) {
  return {
    test_wells_adams: tests.wells,
    test_thomas: tests.thomas,
    test_dorsiflexion: tests.dorsi,
    test_sentadilla: tests.sentadilla,
    test_estabilidad: tests.estabilidad,
    fuerza_inferior: tests.fuerzaInf,
    fuerza_superior: tests.fuerzaSup,
    resistencia_metabolica: tests.resistencia,
  }
}

// ────────────────────────────────────── Main ─────────────────────────────────

async function main() {
  const supabase = admin()

  const { data: staff, error: staffError } = await supabase
    .from('profiles')
    .select('id, slot_publico')
    .in('slot_publico', ['avril', 'gero'])
  if (staffError) throw staffError
  const avrilId = staff?.find((p) => p.slot_publico === 'avril')?.id
  const geroId = staff?.find((p) => p.slot_publico === 'gero')?.id
  if (!avrilId || !geroId) {
    throw new Error('No se encontró el profile de Avril y/o Gero (slot_publico). Revisá la base antes de seguir.')
  }

  const { data: serviciosRaw, error: serviciosError } = await supabase
    .from('servicios')
    .select('id, nombre, tipo, duracion_minutos')
  if (serviciosError) throw serviciosError
  const servicios = new Map((serviciosRaw ?? []).map((s) => [s.nombre, s]))

  const resumen = []

  for (const p of PACIENTES) {
    console.log(`\n▶ ${p.nombre} ${p.apellido} (${p.email})`)

    const { data: existente } = await supabase.from('profiles').select('id').eq('email', p.email).maybeSingle()
    if (existente) {
      console.log('  ya existe, salteo.')
      resumen.push({ ...p, id: existente.id, salteado: true })
      continue
    }

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: p.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { nombre: p.nombre, apellido: p.apellido, telefono: p.telefono },
    })
    if (createError || !created.user) {
      console.error(`  ✗ no se pudo crear el usuario: ${createError?.message}`)
      continue
    }
    const pacienteId = created.user.id

    // handle_new_user (trigger AFTER INSERT ON auth.users) ya insertó la fila
    // en profiles dentro de la misma transacción; se completa acá.
    await supabase
      .from('profiles')
      .update({
        nombre: p.nombre,
        apellido: p.apellido,
        telefono: p.telefono,
        email: p.email,
        activo: true,
        activado_en: new Date().toISOString(),
      })
      .eq('id', pacienteId)

    await supabase.from('fichas_paciente').upsert(
      {
        paciente_id: pacienteId,
        fecha_nacimiento: p.fechaNacimiento,
        sexo: p.sexo,
        ocupacion: p.ocupacion,
        fecha_primera_consulta: fechaOffset(-p.antiguedadDias),
        fuma: p.ficha.fuma,
        bebe: p.ficha.bebe,
        drogas: p.ficha.drogas,
        entrena: p.ficha.entrena,
        actividad_diaria: p.ficha.actividadDiaria,
        horas_sueno: p.ficha.horasSueno,
        dx_medico: p.ficha.dxMedico,
        dx_nutricional: p.ficha.dxNutricional,
        medicacion: p.ficha.medicacion,
        suplementacion: p.ficha.suplementacion,
        lesiones: p.ficha.lesiones,
        molestias: p.ficha.molestias,
        datos_laboratorio: p.ficha.datosLaboratorio,
        motivos_consulta: p.ficha.motivosConsulta,
        observaciones_internas: p.ficha.observacionesInternas,
        updated_by: avrilId,
      },
      { onConflict: 'paciente_id' },
    )

    // Mediciones antropométricas
    for (const m of p.mediciones ?? []) {
      const peso = m.pesoKg ?? null
      const talla = m.tallaCm ?? null
      const imc = peso != null && talla != null ? Math.round((peso / (talla / 100) ** 2) * 100) / 100 : null
      await supabase.from('mediciones_antropometricas').insert({
        paciente_id: pacienteId,
        fecha_medicion: fechaOffset(-m.diasAtras),
        peso_kg: peso,
        talla_cm: talla,
        imc,
        porc_grasa: m.porcGrasa ?? null,
        porc_masa_muscular: m.porcMasaMuscular ?? null,
        kg_grasa: m.kgGrasa ?? null,
        kg_musculo: m.kgMusculo ?? null,
        ...camposIsak(m.isak),
        dx_antropometrico: m.dx ?? null,
        observaciones: m.observaciones ?? null,
        registrado_por: p.servicio === 'entrenamiento' ? geroId : avrilId,
      })
    }
    console.log(`  ${p.mediciones?.length ?? 0} mediciones`)

    // Evaluaciones funcionales
    for (const ev of p.evaluaciones ?? []) {
      await supabase.from('evaluaciones_funcionales').insert({
        paciente_id: pacienteId,
        fecha: fechaOffset(-ev.diasAtras),
        ...camposTests(ev.tests),
        observaciones: ev.observaciones ?? null,
        registrado_por: geroId,
      })
    }
    if (p.evaluaciones?.length) console.log(`  ${p.evaluaciones.length} evaluaciones funcionales`)

    // Planes + plan_ejercicios
    for (const plan of p.planes ?? []) {
      const { data: planCreado, error: planError } = await supabase
        .from('planes')
        .insert({
          paciente_id: pacienteId,
          profesional_id: p.servicio === 'entrenamiento' ? geroId : avrilId,
          tipo: p.servicio,
          titulo: plan.titulo,
          estado: plan.estado,
          fecha_desde: fechaOffset(-plan.diasDesde),
          fecha_hasta: plan.diasHasta != null ? fechaOffset(-plan.diasHasta) : null,
          pautas_generales: plan.nutri?.pautasGenerales ?? null,
          pautas_hidratacion: plan.nutri?.pautasHidratacion ?? null,
          suplementacion: plan.nutri?.suplementacion ?? null,
          disciplina: plan.entreno?.disciplina ?? null,
          experiencia_previa: plan.entreno?.experienciaPrevia ?? null,
          frecuencia: plan.entreno?.frecuencia ?? null,
          volumen: plan.entreno?.volumen ?? null,
        })
        .select('id')
        .single()
      if (planError) {
        console.error(`  ✗ no se pudo crear el plan "${plan.titulo}": ${planError.message}`)
        continue
      }

      let orden = 0
      for (const ej of plan.ejercicios ?? []) {
        orden += 1
        if (ej.cardio) {
          const ejercicioId = await resolverEjercicioCardio(supabase)
          await supabase.from('plan_ejercicios').insert({
            plan_id: planCreado.id,
            ejercicio_id: ejercicioId,
            dia_semana: ej.dia,
            orden,
            cardio_entrada_calor_valor: ej.entradaCalor?.valor ?? null,
            cardio_entrada_calor_unidad: ej.entradaCalor?.unidad ?? null,
            cardio_trabajo_principal_valor: ej.trabajoPrincipal?.valor ?? null,
            cardio_trabajo_principal_unidad: ej.trabajoPrincipal?.unidad ?? null,
            cardio_vuelta_calma_valor: ej.vueltaCalma?.valor ?? null,
            cardio_vuelta_calma_unidad: ej.vueltaCalma?.unidad ?? null,
          })
        } else {
          const seed = `${p.email}|${plan.titulo}|${ej.parteCuerpo}|${ej.dia}|${orden}`
          const ejercicioId = await resolverEjercicioFuerza(supabase, ej.parteCuerpo, seed)
          await supabase.from('plan_ejercicios').insert({
            plan_id: planCreado.id,
            ejercicio_id: ejercicioId,
            dia_semana: ej.dia,
            orden,
            series: ej.series,
            repeticiones: ej.repeticiones,
            descanso_seg: ej.descansoSeg,
          })
        }
      }
    }
    if (p.planes?.length) console.log(`  ${p.planes.length} planes`)

    // Turnos
    for (const t of p.turnos ?? []) {
      const servicio = servicios.get(t.servicio)
      if (!servicio) {
        console.error(`  ✗ servicio "${t.servicio}" no existe en la base, salteo turno.`)
        continue
      }
      const fechaDeseada = fechaOffset(t.diasOffset)

      if (t.tipo === 'combo') {
        const slot = await buscarSlotCombo(supabase, avrilId, geroId, fechaDeseada, servicio.duracion_minutos)
        if (!slot) {
          console.error(`  ✗ no se encontró horario libre combo cerca de ${fechaDeseada}.`)
          continue
        }
        const filaBase = {
          paciente_id: pacienteId,
          servicio_id: servicio.id,
          fecha: slot.fecha,
          hora_inicio: slot.horaInicio,
          hora_fin: slot.horaFin,
          modalidad: 'presencial',
          estado: t.estado,
          notas_paciente: t.notasPaciente ?? null,
          notas_profesional: t.notasProfesional ?? null,
        }
        const { data: creados, error } = await supabase
          .from('turnos')
          .insert([
            { ...filaBase, profesional_id: avrilId },
            { ...filaBase, profesional_id: geroId },
          ])
          .select('id')
        if (error || creados?.length !== 2) {
          console.error(`  ✗ no se pudo crear el turno combo: ${error?.message}`)
          continue
        }
        await Promise.all([
          supabase.from('turnos').update({ turno_par_id: creados[1].id }).eq('id', creados[0].id),
          supabase.from('turnos').update({ turno_par_id: creados[0].id }).eq('id', creados[1].id),
        ])
      } else {
        const profesionalId = t.tipo === 'entrenamiento' ? geroId : avrilId
        const slot = await buscarSlot(supabase, profesionalId, fechaDeseada, servicio.duracion_minutos)
        if (!slot) {
          console.error(`  ✗ no se encontró horario libre cerca de ${fechaDeseada}.`)
          continue
        }
        const { error } = await supabase.from('turnos').insert({
          paciente_id: pacienteId,
          profesional_id: profesionalId,
          servicio_id: servicio.id,
          fecha: slot.fecha,
          hora_inicio: slot.horaInicio,
          hora_fin: slot.horaFin,
          modalidad: 'presencial',
          estado: t.estado,
          notas_paciente: t.notasPaciente ?? null,
          notas_profesional: t.notasProfesional ?? null,
        })
        if (error) console.error(`  ✗ no se pudo crear el turno: ${error.message}`)
      }
    }
    if (p.turnos?.length) console.log(`  ${p.turnos.length} turnos`)

    // Objetivos
    for (const o of p.objetivos ?? []) {
      await supabase.from('objetivos').insert({
        paciente_id: pacienteId,
        categoria: o.categoria,
        descripcion: o.descripcion,
        estado: o.estado,
        fecha_objetivo: o.diasObjetivo != null ? fechaOffset(o.diasObjetivo) : null,
        registrado_por: p.servicio === 'entrenamiento' ? geroId : avrilId,
      })
    }
    if (p.objetivos?.length) console.log(`  ${p.objetivos.length} objetivos`)

    // Feedback semanal + mensajes
    const feedbackList = p.feedback ?? []
    const pesoIni = p.mediciones?.[0]?.pesoKg ?? null
    const pesoFin = p.mediciones?.at(-1)?.pesoKg ?? null
    for (let idx = 0; idx < feedbackList.length; idx++) {
      const f = feedbackList[idx]
      const semanaInicio = lunesSemanaOffset(f.semanasAtras)
      const valores = valoresFeedback(p.nivel, idx, feedbackList.length, pesoIni, pesoFin)
      const { data: feedbackCreado, error } = await supabase
        .from('feedback_semanal')
        .upsert(
          { paciente_id: pacienteId, semana_inicio: semanaInicio, ...valores },
          { onConflict: 'paciente_id,semana_inicio' },
        )
        .select('id')
        .single()
      if (error) {
        console.error(`  ✗ no se pudo crear feedback de la semana ${semanaInicio}: ${error.message}`)
        continue
      }
      if (f.conMensaje) {
        const staffId = p.servicio === 'entrenamiento' ? geroId : avrilId
        await supabase.from('feedback_mensajes').insert({
          feedback_id: feedbackCreado.id,
          autor_id: pacienteId,
          contenido: MENSAJES_PACIENTE[p.nivel],
        })
        await supabase.from('feedback_mensajes').insert({
          feedback_id: feedbackCreado.id,
          autor_id: staffId,
          contenido: MENSAJES_STAFF[p.nivel],
        })
      }
    }
    if (feedbackList.length) console.log(`  ${feedbackList.length} semanas de feedback`)

    // Evolución
    for (const e of p.evolucion ?? []) {
      await supabase.from('evolucion_entradas').insert({
        paciente_id: pacienteId,
        origen: e.origen,
        tipo: e.tipo,
        contenido: e.contenido,
        visible_paciente: e.visible,
        registrado_por: e.origen === 'entrenamiento' ? geroId : avrilId,
      })
    }
    if (p.evolucion?.length) console.log(`  ${p.evolucion.length} entradas de evolución`)

    resumen.push({ ...p, id: pacienteId, salteado: false })
    console.log('  ✓ listo')
  }

  console.log('\n─────────────────────────────────────────────')
  console.log(`Listo. Password de todos los pacientes demo: ${DEMO_PASSWORD}`)
  console.log('─────────────────────────────────────────────')
  for (const p of resumen) {
    console.log(`  ${p.email.padEnd(28)} ${p.salteado ? '(ya existía)' : `id=${p.id}`}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
