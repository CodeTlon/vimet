// Aplica el dataset demo de scripts/data/demo-pacientes.mjs contra la base: 10 pacientes con 3-6
// meses de historial (fichas, mediciones, evaluaciones, planes+ejercicios, turnos, objetivos,
// feedback semanal, evolucion).
//
// Correr a mano contra una base de DEV o TEST (nunca produccion):
//   npx tsx --env-file=.env.local scripts/seed-demo-pacientes.ts
//
// Es idempotente: si un paciente ya existe (por email) se saltea. Reutiliza el catalogo de
// ejercicios ya cargado (tabla `ejercicios`, ver scripts/seed-ejercicios.mjs) y a Avril y Gero
// (perfiles con `slot_publico`). Las cuentas se crean con login real (password conocida).
/* eslint-disable @typescript-eslint/no-explicit-any */
import { and, eq, ilike, inArray } from 'drizzle-orm'

import {
  ejercicios,
  evaluaciones_funcionales,
  evolucion_entradas,
  feedback_mensajes,
  feedback_semanal,
  fichas_paciente,
  horarios_disponibles,
  mediciones_antropometricas,
  objetivos,
  plan_ejercicios,
  plan_secciones,
  planes,
  profiles,
  servicios,
  turnos,
} from '../db/schema'
import { crearUsuario } from '../lib/auth/usuarios'
import { db } from '../lib/db'
import { DEMO_PASSWORD, PACIENTES } from './data/demo-pacientes.mjs'

if (process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production') {
  throw new Error('El seed demo no corre en produccion.')
}

// ───────────────────────── Fechas (zona Argentina) ─────────────────────────
// Mismo criterio que lib/datetime.ts: anclamos a mediodia UTC para que sumar/restar dias no cruce
// de fecha por un corrimiento horario.
const DATE_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Argentina/Cordoba',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
const hoyArgentina = (date = new Date()) => DATE_FMT.format(date)

function sumarDiasISO(fechaISO: string, dias: number) {
  const [y, m, d] = fechaISO.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  utc.setUTCDate(utc.getUTCDate() + dias)
  return utc.toISOString().slice(0, 10)
}
// offset negativo = pasado, positivo = futuro, relativo al momento de correr el script.
const fechaOffset = (dias: number) => sumarDiasISO(hoyArgentina(), dias)
const diaSemanaISO = (fechaISO: string) => new Date(`${fechaISO}T00:00:00Z`).getUTCDay() // 0=domingo

function lunesSemanaOffset(semanasAtras: number) {
  const hoy = hoyArgentina()
  const dow = diaSemanaISO(hoy)
  const diffALunes = dow === 0 ? -6 : 1 - dow
  return sumarDiasISO(sumarDiasISO(hoy, diffALunes), -7 * semanasAtras)
}

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}
function toHHMM(total: number) {
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
function hashCode(str: string) {
  let hash = 5381
  for (let i = 0; i < str.length; i++) hash = (hash * 33) ^ str.charCodeAt(i)
  return hash >>> 0
}

// ──────────────────────────── Slots libres de turnos ────────────────────────
async function slotsLibresParaFecha(profesionalId: string, fecha: string, duracionMin: number) {
  const horarios = await db
    .select({ hora_inicio: horarios_disponibles.hora_inicio, hora_fin: horarios_disponibles.hora_fin })
    .from(horarios_disponibles)
    .where(
      and(
        eq(horarios_disponibles.profesional_id, profesionalId),
        eq(horarios_disponibles.dia_semana, diaSemanaISO(fecha)),
        eq(horarios_disponibles.activo, true),
      ),
    )
  if (!horarios.length) return []

  const activos = await db
    .select({ hora_inicio: turnos.hora_inicio, hora_fin: turnos.hora_fin })
    .from(turnos)
    .where(and(eq(turnos.profesional_id, profesionalId), eq(turnos.fecha, fecha), inArray(turnos.estado, ['pendiente', 'confirmado'])))
  const ocupadas = activos.map((t) => ({ inicio: toMinutes(t.hora_inicio), fin: toMinutes(t.hora_fin) }))

  const slots: { horaInicio: string; horaFin: string }[] = []
  for (const h of horarios) {
    for (let t = toMinutes(h.hora_inicio); t + duracionMin <= toMinutes(h.hora_fin); t += 15) {
      if (ocupadas.some((o) => t < o.fin && t + duracionMin > o.inicio)) continue
      slots.push({ horaInicio: toHHMM(t), horaFin: toHHMM(t + duracionMin) })
    }
  }
  return slots
}

async function buscarSlot(profesionalId: string, fechaBase: string, duracionMin: number, maxDias = 6) {
  for (let offset = 0; offset <= maxDias; offset++) {
    const fecha = sumarDiasISO(fechaBase, offset)
    const slots = await slotsLibresParaFecha(profesionalId, fecha, duracionMin)
    if (slots.length) return { fecha, ...slots[Math.floor(slots.length / 2)] }
  }
  return null
}

async function buscarSlotCombo(prof1: string, prof2: string, fechaBase: string, duracionMin: number, maxDias = 6) {
  for (let offset = 0; offset <= maxDias; offset++) {
    const fecha = sumarDiasISO(fechaBase, offset)
    const [s1, s2] = await Promise.all([
      slotsLibresParaFecha(prof1, fecha, duracionMin),
      slotsLibresParaFecha(prof2, fecha, duracionMin),
    ])
    const comun = s1.filter((s) => s2.some((o) => o.horaInicio === s.horaInicio && o.horaFin === s.horaFin))
    if (comun.length) return { fecha, ...comun[Math.floor(comun.length / 2)] }
  }
  return null
}

// ────────────────────────────── Catalogo de ejercicios ──────────────────────
const cacheEjercicios = new Map<string, number[]>()

async function resolverEjercicioFuerza(parteCuerpo: string, seed: string) {
  if (!cacheEjercicios.has(parteCuerpo)) {
    const rows = await db
      .select({ id: ejercicios.id })
      .from(ejercicios)
      .where(and(eq(ejercicios.origen, 'dataset'), eq(ejercicios.modo, 'fuerza'), eq(ejercicios.parte_cuerpo, parteCuerpo)))
      .limit(50)
    cacheEjercicios.set(parteCuerpo, rows.map((r) => r.id))
  }
  const candidatos = cacheEjercicios.get(parteCuerpo)!
  if (!candidatos.length) throw new Error(`No hay ejercicios de "${parteCuerpo}" en el catalogo.`)
  return candidatos[hashCode(seed) % candidatos.length]
}

let cardioEjercicioId: number | null = null
async function resolverEjercicioCardio() {
  if (cardioEjercicioId) return cardioEjercicioId
  const [row] = await db
    .select({ id: ejercicios.id })
    .from(ejercicios)
    .where(and(eq(ejercicios.modo, 'cardio'), ilike(ejercicios.nombre, 'correr')))
    .limit(1)
  if (!row) throw new Error('No se encontro un ejercicio modo=cardio ("correr") en el catalogo.')
  cardioEjercicioId = row.id
  return cardioEjercicioId
}

// ────────────────────────────── Feedback semanal ────────────────────────────
type Nivel = 'A' | 'B' | 'C'
const RANGOS_FEEDBACK: Record<Nivel, Record<string, [number, number]>> = {
  A: { fisico: [6, 9], animo: [6, 9], energia: [6, 9], entren: [70, 95], alim: [70, 95] },
  B: { fisico: [5, 5], animo: [5, 4], energia: [5, 4], entren: [55, 40], alim: [55, 42] },
  C: { fisico: [6, 7], animo: [7, 7], energia: [6, 7], entren: [60, 70], alim: [60, 70] },
}
const OBSERVACIONES_FEEDBACK: Record<Nivel, string[]> = {
  A: ['Buena semana, cumpli casi todo el plan.', 'Semana solida, sin sobresaltos.', 'Me senti con mucha energia toda la semana.'],
  B: ['Semana dificil, no llegue a cumplir todo.', 'Me costo organizarme esta semana.', 'Baje bastante la adherencia, mucho trabajo.'],
  C: ['Primera semana, todavia adaptandome al plan.', 'Buena semana para arrancar.', 'Semana tranquila, sin grandes cambios.'],
}
const MENSAJES_PACIENTE: Record<Nivel, string> = {
  A: 'Semana muy buena, pude sostener el plan sin problemas.',
  B: 'Esta semana me costo bastante, no llegue a cumplir todo.',
  C: 'Recien estoy arrancando, todavia adaptandome al plan.',
}
const MENSAJES_STAFF: Record<Nivel, string> = {
  A: 'Excelente, seguimos asi. Cualquier duda me escribis.',
  B: 'No hay drama, la proxima retomamos con metas mas chicas.',
  C: 'Es normal las primeras semanas, cualquier cosa preguntame.',
}
const lerp = ([ini, fin]: [number, number], t: number) => Math.round(ini + (fin - ini) * t)

function valoresFeedback(nivel: Nivel, idx: number, total: number, pesoIni: number | null, pesoFin: number | null) {
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

function camposIsak(isak: any) {
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

function camposTests(t: any) {
  return {
    test_wells_adams: t.wells,
    test_thomas: t.thomas,
    test_dorsiflexion: t.dorsi,
    test_sentadilla: t.sentadilla,
    test_estabilidad: t.estabilidad,
    fuerza_inferior: t.fuerzaInf,
    fuerza_superior: t.fuerzaSup,
    resistencia_metabolica: t.resistencia,
  }
}

// ────────────────────────────────────── Main ─────────────────────────────────
async function main() {
  const staff = await db
    .select({ id: profiles.id, slot_publico: profiles.slot_publico })
    .from(profiles)
    .where(inArray(profiles.slot_publico, ['avril', 'gero']))
  const avrilId = staff.find((p) => p.slot_publico === 'avril')?.id
  const geroId = staff.find((p) => p.slot_publico === 'gero')?.id
  if (!avrilId || !geroId) {
    throw new Error('No se encontro el perfil de Avril y/o Gero (slot_publico). Revisa la base antes de seguir.')
  }

  const serviciosDb = await db
    .select({ id: servicios.id, nombre: servicios.nombre, duracion_minutos: servicios.duracion_minutos })
    .from(servicios)
  const serviciosPorNombre = new Map(serviciosDb.map((s) => [s.nombre, s]))

  const resumen: { email: string; id?: string; salteado: boolean }[] = []

  for (const p of PACIENTES as any[]) {
    console.log(`\n> ${p.nombre} ${p.apellido} (${p.email})`)

    const [existente] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.email, p.email)).limit(1)
    if (existente) {
      console.log('  ya existe, salteo.')
      resumen.push({ email: p.email, id: existente.id, salteado: true })
      continue
    }

    const { id: pacienteId } = await crearUsuario({
      email: p.email,
      nombre: p.nombre,
      apellido: p.apellido,
      telefono: p.telefono,
      rol: 'paciente',
      password: DEMO_PASSWORD,
      emailVerificado: true,
      activo: true,
    })
    const registrador = p.servicio === 'entrenamiento' ? geroId : avrilId

    await db.insert(fichas_paciente).values({
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
    })

    for (const m of p.mediciones ?? []) {
      const peso = m.pesoKg ?? null
      const talla = m.tallaCm ?? null
      const imc = peso != null && talla != null ? Math.round((peso / (talla / 100) ** 2) * 100) / 100 : null
      await db.insert(mediciones_antropometricas).values({
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
        registrado_por: registrador,
      })
    }
    console.log(`  ${p.mediciones?.length ?? 0} mediciones`)

    for (const ev of p.evaluaciones ?? []) {
      await db.insert(evaluaciones_funcionales).values({
        paciente_id: pacienteId,
        fecha: fechaOffset(-ev.diasAtras),
        ...camposTests(ev.tests),
        observaciones: ev.observaciones ?? null,
        registrado_por: geroId,
      })
    }
    if (p.evaluaciones?.length) console.log(`  ${p.evaluaciones.length} evaluaciones funcionales`)

    for (const plan of p.planes ?? []) {
      const [planCreado] = await db
        .insert(planes)
        .values({
          paciente_id: pacienteId,
          profesional_id: registrador,
          tipo: p.servicio,
          titulo: plan.titulo,
          estado: plan.estado,
          fecha_desde: fechaOffset(-plan.diasDesde),
          fecha_hasta: plan.diasHasta != null ? fechaOffset(-plan.diasHasta) : null,
          disciplina: plan.entreno?.disciplina ?? null,
          experiencia_previa: plan.entreno?.experienciaPrevia ?? null,
          frecuencia: plan.entreno?.frecuencia ?? null,
          volumen: plan.entreno?.volumen ?? null,
        })
        .returning({ id: planes.id })

      // Las pautas nutricionales ya no son columnas de `planes` (migracion 0037): viven como
      // secciones modulares de tipo `pautas_generales`.
      const pautas: [string, string | null | undefined][] = [
        ['Pautas generales', plan.nutri?.pautasGenerales],
        ['Hidratacion', plan.nutri?.pautasHidratacion],
        ['Suplementacion', plan.nutri?.suplementacion],
      ]
      let ordenSeccion = 0
      for (const [titulo, contenido] of pautas) {
        if (!contenido) continue
        await db.insert(plan_secciones).values({ plan_id: planCreado.id, tipo: 'pautas_generales', titulo, contenido, orden: ordenSeccion++ })
      }

      let orden = 0
      for (const ej of plan.ejercicios ?? []) {
        orden += 1
        if (ej.cardio) {
          await db.insert(plan_ejercicios).values({
            plan_id: planCreado.id,
            ejercicio_id: await resolverEjercicioCardio(),
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
          await db.insert(plan_ejercicios).values({
            plan_id: planCreado.id,
            ejercicio_id: await resolverEjercicioFuerza(ej.parteCuerpo, seed),
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

    for (const t of p.turnos ?? []) {
      const servicio = serviciosPorNombre.get(t.servicio)
      if (!servicio) {
        console.error(`  x servicio "${t.servicio}" no existe en la base, salteo turno.`)
        continue
      }
      const fechaDeseada = fechaOffset(t.diasOffset)
      const base = {
        paciente_id: pacienteId,
        servicio_id: servicio.id,
        modalidad: 'presencial' as const,
        estado: t.estado,
        notas_paciente: t.notasPaciente ?? null,
        notas_profesional: t.notasProfesional ?? null,
      }

      if (t.tipo === 'combo') {
        const slot = await buscarSlotCombo(avrilId, geroId, fechaDeseada, servicio.duracion_minutos)
        if (!slot) {
          console.error(`  x no se encontro horario libre combo cerca de ${fechaDeseada}.`)
          continue
        }
        const franja = { fecha: slot.fecha, hora_inicio: slot.horaInicio, hora_fin: slot.horaFin }
        const creados = await db
          .insert(turnos)
          .values([
            { ...base, ...franja, profesional_id: avrilId },
            { ...base, ...franja, profesional_id: geroId },
          ])
          .returning({ id: turnos.id })
        await db.update(turnos).set({ turno_par_id: creados[1].id }).where(eq(turnos.id, creados[0].id))
        await db.update(turnos).set({ turno_par_id: creados[0].id }).where(eq(turnos.id, creados[1].id))
      } else {
        const profesionalId = t.tipo === 'entrenamiento' ? geroId : avrilId
        const slot = await buscarSlot(profesionalId, fechaDeseada, servicio.duracion_minutos)
        if (!slot) {
          console.error(`  x no se encontro horario libre cerca de ${fechaDeseada}.`)
          continue
        }
        await db.insert(turnos).values({
          ...base,
          profesional_id: profesionalId,
          fecha: slot.fecha,
          hora_inicio: slot.horaInicio,
          hora_fin: slot.horaFin,
        })
      }
    }
    if (p.turnos?.length) console.log(`  ${p.turnos.length} turnos`)

    for (const o of p.objetivos ?? []) {
      await db.insert(objetivos).values({
        paciente_id: pacienteId,
        categoria: o.categoria,
        descripcion: o.descripcion,
        estado: o.estado,
        fecha_objetivo: o.diasObjetivo != null ? fechaOffset(o.diasObjetivo) : null,
        registrado_por: registrador,
      })
    }
    if (p.objetivos?.length) console.log(`  ${p.objetivos.length} objetivos`)

    const feedbackList: any[] = p.feedback ?? []
    const pesoIni = p.mediciones?.[0]?.pesoKg ?? null
    const pesoFin = p.mediciones?.at(-1)?.pesoKg ?? null
    for (let idx = 0; idx < feedbackList.length; idx++) {
      const f = feedbackList[idx]
      const semanaInicio = lunesSemanaOffset(f.semanasAtras)
      const valores = valoresFeedback(p.nivel, idx, feedbackList.length, pesoIni, pesoFin)
      const [creado] = await db
        .insert(feedback_semanal)
        .values({ paciente_id: pacienteId, semana_inicio: semanaInicio, ...valores })
        .onConflictDoUpdate({ target: [feedback_semanal.paciente_id, feedback_semanal.semana_inicio], set: valores })
        .returning({ id: feedback_semanal.id })
      if (f.conMensaje) {
        await db.insert(feedback_mensajes).values([
          { feedback_id: creado.id, autor_id: pacienteId, contenido: MENSAJES_PACIENTE[p.nivel as Nivel] },
          { feedback_id: creado.id, autor_id: registrador, contenido: MENSAJES_STAFF[p.nivel as Nivel] },
        ])
      }
    }
    if (feedbackList.length) console.log(`  ${feedbackList.length} semanas de feedback`)

    for (const e of p.evolucion ?? []) {
      await db.insert(evolucion_entradas).values({
        paciente_id: pacienteId,
        origen: e.origen,
        tipo: e.tipo,
        contenido: e.contenido,
        visible_paciente: e.visible,
        registrado_por: e.origen === 'entrenamiento' ? geroId : avrilId,
      })
    }
    if (p.evolucion?.length) console.log(`  ${p.evolucion.length} entradas de evolucion`)

    resumen.push({ email: p.email, id: pacienteId, salteado: false })
    console.log('  ok')
  }

  console.log('\n---------------------------------------------')
  console.log(`Listo. Password de todos los pacientes demo: ${DEMO_PASSWORD}`)
  for (const r of resumen) console.log(`  ${r.email.padEnd(28)} ${r.salteado ? '(ya existia)' : `id=${r.id}`}`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
