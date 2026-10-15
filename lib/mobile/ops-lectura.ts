// Operaciones de LECTURA de la app mobile. Cada una devuelve la forma exacta que hoy consume la
// app (nombres de columna y relaciones embebidas), pero acotada al usuario: lo que antes filtraba
// la RLS ahora se escribe explicito en cada consulta.
import { and, asc, desc, eq, gte, inArray, lte, ne, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { z } from 'zod'

import {
  evaluaciones_funcionales,
  evolucion_entradas,
  feedback_semanal,
  fichas_paciente,
  horarios_disponibles,
  mediciones_antropometricas,
  mediciones_wearable,
  objetivos,
  planes,
  profiles,
  recursos_paciente,
  servicios,
  turnos,
} from '@/db/schema'
import { esStaff } from '@/lib/auth/session'
import { readClinicalField } from '@/lib/crypto/clinical'
import { condicionTurnosVisibles, puedeGestionarTurno } from '@/lib/data/turnos'
import { obtenerRutinaPlan } from '@/lib/data/rutina'
import { mensajesDeFeedback } from '@/lib/data/feedback'
import { db } from '@/lib/db'
import { obtenerSeccionesPlan } from '@/lib/plan-secciones'
import {
  detalleSesion,
  ejerciciosDelDia,
  sesionesDePaciente,
  sesionesFinalizadas,
} from '@/lib/services/entrenamiento'
import { urlFirmada } from '@/lib/storage/disk'

import { ErrorOp, op, type Ctx } from './tipos'

const pacienteId = z.string().uuid()
const id = z.coerce.number().int().positive()

const profesionalAlias = alias(profiles, 'profesional')
const pacienteAlias = alias(profiles, 'paciente')

/** Staff sobre cualquier paciente; el paciente solo sobre si mismo. */
function puedeVerPaciente(ctx: Ctx, pid: string) {
  return esStaff(ctx.profile.rol) || ctx.user.id === pid
}

const COLUMNAS_TURNO = {
  id: turnos.id,
  fecha: turnos.fecha,
  hora_inicio: turnos.hora_inicio,
  hora_fin: turnos.hora_fin,
  estado: turnos.estado,
}

export const opsLectura = {
  // ---- Perfil -----------------------------------------------------------------------------
  'perfil.mio': op({
    acceso: 'usuario',
    args: z.object({}),
    run: async (ctx) => ctx.profile,
  }),

  'perfil.paciente': op({
    acceso: 'staff',
    args: z.object({ pacienteId }),
    run: async (_ctx, a) => {
      const [p] = await db
        .select({
          id: profiles.id,
          nombre: profiles.nombre,
          apellido: profiles.apellido,
          email: profiles.email,
          telefono: profiles.telefono,
          activo: profiles.activo,
          activado_en: profiles.activado_en,
          gestionado_por_staff: profiles.gestionado_por_staff,
        })
        .from(profiles)
        .where(and(eq(profiles.id, a.pacienteId), eq(profiles.rol, 'paciente')))
        .limit(1)
      return p ?? null
    },
  }),

  'pacientes.lista': op({
    acceso: 'staff',
    args: z.object({}),
    run: async () =>
      db
        .select({
          id: profiles.id,
          nombre: profiles.nombre,
          apellido: profiles.apellido,
          email: profiles.email,
          activo: profiles.activo,
          activado_en: profiles.activado_en,
          gestionado_por_staff: profiles.gestionado_por_staff,
        })
        .from(profiles)
        .where(eq(profiles.rol, 'paciente'))
        .orderBy(asc(profiles.nombre)),
  }),

  // ---- Turnos -----------------------------------------------------------------------------
  'turnos.mios': op({
    acceso: 'usuario',
    args: z.object({}),
    run: async (ctx) =>
      db
        .select({
          ...COLUMNAS_TURNO,
          modalidad: turnos.modalidad,
          motivo_cancelacion: turnos.motivo_cancelacion,
          motivo_reprogramacion: turnos.motivo_reprogramacion,
          servicios: { nombre: servicios.nombre },
          profiles: { nombre: profesionalAlias.nombre, apellido: profesionalAlias.apellido },
        })
        .from(turnos)
        .leftJoin(servicios, eq(servicios.id, turnos.servicio_id))
        .leftJoin(profesionalAlias, eq(profesionalAlias.id, turnos.profesional_id))
        .where(eq(turnos.paciente_id, ctx.user.id))
        .orderBy(desc(turnos.fecha), desc(turnos.hora_inicio))
        .limit(50),
  }),

  'turnos.uno': op({
    acceso: 'usuario',
    args: z.object({ id }),
    run: async (ctx, a) => {
      const [t] = await db
        .select({
          ...COLUMNAS_TURNO,
          modalidad: turnos.modalidad,
          profesional_id: turnos.profesional_id,
          paciente_id: turnos.paciente_id,
          servicio_id: turnos.servicio_id,
          servicios: { nombre: servicios.nombre },
        })
        .from(turnos)
        .leftJoin(servicios, eq(servicios.id, turnos.servicio_id))
        .where(eq(turnos.id, a.id))
        .limit(1)
      // Dueño, profesional del turno o admin (policy de select de `turnos`).
      if (!t || !puedeGestionarTurno(ctx.profile, t)) return null
      const resto: Omit<typeof t, 'paciente_id'> & { paciente_id?: string } = { ...t }
      delete resto.paciente_id
      return resto
    },
  }),

  'turnos.detalleStaff': op({
    acceso: 'staff',
    args: z.object({ id }),
    run: async (ctx, a) => {
      const [t] = await db
        .select({
          ...COLUMNAS_TURNO,
          modalidad: turnos.modalidad,
          notas_paciente: turnos.notas_paciente,
          notas_profesional: turnos.notas_profesional,
          motivo_cancelacion: turnos.motivo_cancelacion,
          motivo_reprogramacion: turnos.motivo_reprogramacion,
          turno_par_id: turnos.turno_par_id,
          profesional_id: turnos.profesional_id,
          paciente_id: turnos.paciente_id,
          servicio_id: turnos.servicio_id,
          servicios: { nombre: servicios.nombre },
          paciente: { nombre: pacienteAlias.nombre, apellido: pacienteAlias.apellido, telefono: pacienteAlias.telefono },
        })
        .from(turnos)
        .leftJoin(servicios, eq(servicios.id, turnos.servicio_id))
        .leftJoin(pacienteAlias, eq(pacienteAlias.id, turnos.paciente_id))
        .where(eq(turnos.id, a.id))
        .limit(1)
      if (!t || !puedeGestionarTurno(ctx.profile, t)) return null
      const resto: Omit<typeof t, 'paciente_id'> & { paciente_id?: string } = { ...t }
      delete resto.paciente_id
      return resto
    },
  }),

  'admin.dashboard': op({
    acceso: 'staff',
    args: z.object({ hoy: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
    run: async (ctx, a) => {
      const visibles = condicionTurnosVisibles(ctx.profile)
      const cols = {
        ...COLUMNAS_TURNO,
        servicios: { nombre: servicios.nombre },
        profiles: { nombre: pacienteAlias.nombre, apellido: pacienteAlias.apellido },
      }
      const base = () =>
        db
          .select(cols)
          .from(turnos)
          .leftJoin(servicios, eq(servicios.id, turnos.servicio_id))
          .leftJoin(pacienteAlias, eq(pacienteAlias.id, turnos.paciente_id))
      const activos = inArray(turnos.estado, ['pendiente', 'confirmado'])
      const [hoy, proximos, [{ pacientes }], [{ pendientes }]] = await Promise.all([
        base().where(and(eq(turnos.fecha, a.hoy), activos, visibles)).orderBy(asc(turnos.hora_inicio)),
        base()
          .where(and(sql`${turnos.fecha} > ${a.hoy}`, activos, visibles))
          .orderBy(asc(turnos.fecha), asc(turnos.hora_inicio))
          .limit(10),
        db.select({ pacientes: sql<number>`count(*)::int` }).from(profiles).where(eq(profiles.rol, 'paciente')),
        db
          .select({ pendientes: sql<number>`count(*)::int` })
          .from(turnos)
          .where(and(eq(turnos.estado, 'pendiente'), visibles)),
      ])
      return { hoy, proximos, kpis: { pacientes, pendientes } }
    },
  }),

  'admin.calendario': op({
    acceso: 'staff',
    args: z.object({
      desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
    run: async (ctx, a) =>
      db
        .select({
          ...COLUMNAS_TURNO,
          modalidad: turnos.modalidad,
          paciente: { id: pacienteAlias.id, nombre: pacienteAlias.nombre, apellido: pacienteAlias.apellido },
        })
        .from(turnos)
        .leftJoin(pacienteAlias, eq(pacienteAlias.id, turnos.paciente_id))
        .where(and(gte(turnos.fecha, a.desde), lte(turnos.fecha, a.hasta), condicionTurnosVisibles(ctx.profile)))
        .orderBy(asc(turnos.fecha), asc(turnos.hora_inicio))
        .limit(2000),
  }),

  'catalogo.profesionales': op({
    acceso: 'usuario',
    args: z.object({}),
    run: async () =>
      db
        .select({ id: profiles.id, nombre: profiles.nombre, apellido: profiles.apellido, rol: profiles.rol })
        .from(profiles)
        .where(and(inArray(profiles.rol, ['nutricionista', 'entrenador']), eq(profiles.activo, true))),
  }),

  'catalogo.servicios': op({
    acceso: 'usuario',
    args: z.object({}),
    run: async () =>
      db
        .select({
          id: servicios.id,
          nombre: servicios.nombre,
          duracion_minutos: servicios.duracion_minutos,
          tipo: servicios.tipo,
        })
        .from(servicios)
        .where(eq(servicios.activo, true)),
  }),

  'horarios.mios': op({
    acceso: 'staff',
    args: z.object({}),
    run: async (ctx) =>
      db
        .select({
          id: horarios_disponibles.id,
          dia_semana: horarios_disponibles.dia_semana,
          hora_inicio: horarios_disponibles.hora_inicio,
          hora_fin: horarios_disponibles.hora_fin,
          modalidad: horarios_disponibles.modalidad,
        })
        .from(horarios_disponibles)
        .where(and(eq(horarios_disponibles.profesional_id, ctx.user.id), eq(horarios_disponibles.activo, true)))
        .orderBy(asc(horarios_disponibles.dia_semana), asc(horarios_disponibles.hora_inicio)),
  }),

  // ---- Planes -----------------------------------------------------------------------------
  'planes.mios': op({
    acceso: 'usuario',
    args: z.object({}),
    run: async (ctx) =>
      db
        .select({
          id: planes.id,
          tipo: planes.tipo,
          titulo: planes.titulo,
          estado: planes.estado,
          fecha_desde: planes.fecha_desde,
          fecha_hasta: planes.fecha_hasta,
        })
        .from(planes)
        .where(and(eq(planes.paciente_id, ctx.user.id), ne(planes.estado, 'borrador')))
        .orderBy(desc(planes.fecha_desde)),
  }),

  'planes.paciente': op({
    acceso: 'staff',
    args: z.object({ pacienteId }),
    run: async (_ctx, a) =>
      db
        .select({
          id: planes.id,
          tipo: planes.tipo,
          titulo: planes.titulo,
          estado: planes.estado,
          fecha_desde: planes.fecha_desde,
          fecha_hasta: planes.fecha_hasta,
          archivo_path: planes.archivo_path,
        })
        .from(planes)
        .where(eq(planes.paciente_id, a.pacienteId))
        .orderBy(desc(planes.fecha_desde)),
  }),

  /** Plan completo + rutina + secciones. Paciente dueño o staff (con el paciente_id esperado). */
  'planes.detalle': op({
    acceso: 'usuario',
    args: z.object({ id, pacienteId: pacienteId.optional() }),
    run: async (ctx, a) => {
      const [plan] = await db.select().from(planes).where(eq(planes.id, a.id)).limit(1)
      if (!plan) return null
      const staff = esStaff(ctx.profile.rol)
      if (!staff && plan.paciente_id !== ctx.user.id) return null
      // El cliente indica de que paciente cree que es el plan: si no coincide, no se muestra.
      if (a.pacienteId && plan.paciente_id !== a.pacienteId) return null
      const [rutina, secciones] = await Promise.all([
        plan.tipo === 'entrenamiento' || plan.tipo === 'combo' ? obtenerRutinaPlan(plan.id) : Promise.resolve([]),
        obtenerSeccionesPlan(plan.id),
      ])
      // `notas` se entrega descifrada; las columnas cifradas no salen del servidor.
      const { notas_enc, ...resto } = plan
      return { plan: { ...resto, notas: readClinicalField(notas_enc, plan.notas) }, rutina, secciones }
    },
  }),

  // ---- Seguimiento del paciente -------------------------------------------------------------
  'progreso.mio': op({
    acceso: 'usuario',
    args: z.object({}),
    run: async (ctx) => {
      const [mediciones, evaluaciones] = await Promise.all([
        db
          .select({
            id: mediciones_antropometricas.id,
            fecha_medicion: mediciones_antropometricas.fecha_medicion,
            peso_kg: mediciones_antropometricas.peso_kg,
            imc: mediciones_antropometricas.imc,
            porc_grasa: mediciones_antropometricas.porc_grasa,
            porc_masa_muscular: mediciones_antropometricas.porc_masa_muscular,
            pliegue_triceps_mm: mediciones_antropometricas.pliegue_triceps_mm,
            pliegue_subescapular_mm: mediciones_antropometricas.pliegue_subescapular_mm,
            pliegue_supraespinal_mm: mediciones_antropometricas.pliegue_supraespinal_mm,
            pliegue_abdominal_mm: mediciones_antropometricas.pliegue_abdominal_mm,
            pliegue_muslo_mm: mediciones_antropometricas.pliegue_muslo_mm,
            pliegue_pierna_mm: mediciones_antropometricas.pliegue_pierna_mm,
            pliegue_biceps_mm: mediciones_antropometricas.pliegue_biceps_mm,
            pliegue_cresta_iliaca_mm: mediciones_antropometricas.pliegue_cresta_iliaca_mm,
            perimetro_brazo_cm: mediciones_antropometricas.perimetro_brazo_cm,
            perimetro_muslo_cm: mediciones_antropometricas.perimetro_muslo_cm,
            perimetro_pierna_cm: mediciones_antropometricas.perimetro_pierna_cm,
            kg_tejido_muscular: mediciones_antropometricas.kg_tejido_muscular,
            kg_tejido_oseo: mediciones_antropometricas.kg_tejido_oseo,
          })
          .from(mediciones_antropometricas)
          .where(eq(mediciones_antropometricas.paciente_id, ctx.user.id))
          .orderBy(desc(mediciones_antropometricas.fecha_medicion), desc(mediciones_antropometricas.id))
          .limit(20),
        db
          .select({
            id: evaluaciones_funcionales.id,
            fecha: evaluaciones_funcionales.fecha,
            puntaje_total: evaluaciones_funcionales.puntaje_total,
          })
          .from(evaluaciones_funcionales)
          .where(eq(evaluaciones_funcionales.paciente_id, ctx.user.id))
          .orderBy(desc(evaluaciones_funcionales.fecha))
          .limit(20),
      ])
      return { mediciones, evaluaciones }
    },
  }),

  /** Ficha del paciente (propia o, si es staff, de `pacienteId`), con los campos clinicos descifrados. */
  'ficha.ver': op({
    acceso: 'usuario',
    args: z.object({ pacienteId: pacienteId.optional() }),
    run: async (ctx, a) => {
      const pid = a.pacienteId ?? ctx.user.id
      if (!puedeVerPaciente(ctx, pid)) throw new ErrorOp('No autorizado', 403)
      const [f] = await db.select().from(fichas_paciente).where(eq(fichas_paciente.paciente_id, pid)).limit(1)
      if (!f) return null
      const staff = esStaff(ctx.profile.rol)
      return {
        fecha_nacimiento: f.fecha_nacimiento,
        sexo: f.sexo,
        ocupacion: f.ocupacion,
        fecha_primera_consulta: f.fecha_primera_consulta,
        fuma: f.fuma,
        bebe: f.bebe,
        drogas: f.drogas,
        entrena: f.entrena,
        actividad_diaria: f.actividad_diaria,
        horas_sueno: f.horas_sueno,
        dx_medico: readClinicalField(f.dx_medico_enc, f.dx_medico),
        dx_nutricional: readClinicalField(f.dx_nutricional_enc, f.dx_nutricional),
        medicacion: readClinicalField(f.medicacion_enc, f.medicacion),
        suplementacion: f.suplementacion,
        lesiones: f.lesiones,
        molestias: f.molestias,
        datos_laboratorio: readClinicalField(f.datos_laboratorio_enc, f.datos_laboratorio),
        motivos_consulta: f.motivos_consulta,
        // Las observaciones internas son solo del equipo.
        ...(staff
          ? { observaciones_internas: readClinicalField(f.observaciones_internas_enc, f.observaciones_internas) }
          : {}),
        updated_at: f.updated_at,
      }
    },
  }),

  'objetivos.ver': op({
    acceso: 'usuario',
    args: z.object({ pacienteId: pacienteId.optional() }),
    run: async (ctx, a) => {
      const pid = a.pacienteId ?? ctx.user.id
      if (!puedeVerPaciente(ctx, pid)) throw new ErrorOp('No autorizado', 403)
      return db
        .select({
          id: objetivos.id,
          categoria: objetivos.categoria,
          descripcion: objetivos.descripcion,
          estado: objetivos.estado,
          fecha_objetivo: objetivos.fecha_objetivo,
        })
        .from(objetivos)
        .where(eq(objetivos.paciente_id, pid))
        .orderBy(desc(objetivos.created_at))
    },
  }),

  'recursos.ver': op({
    acceso: 'usuario',
    args: z.object({ pacienteId: pacienteId.optional() }),
    run: async (ctx, a) => {
      const pid = a.pacienteId ?? ctx.user.id
      if (!puedeVerPaciente(ctx, pid)) throw new ErrorOp('No autorizado', 403)
      const staff = esStaff(ctx.profile.rol)
      // El paciente solo ve los recursos marcados visibles (policy `recursos paciente read visible`).
      return db
        .select({
          id: recursos_paciente.id,
          tipo: recursos_paciente.tipo,
          categoria: recursos_paciente.categoria,
          titulo: recursos_paciente.titulo,
          descripcion: recursos_paciente.descripcion,
          url: recursos_paciente.url,
          storage_path: recursos_paciente.storage_path,
          visible_paciente: recursos_paciente.visible_paciente,
        })
        .from(recursos_paciente)
        .where(
          and(eq(recursos_paciente.paciente_id, pid), staff && pid !== ctx.user.id ? undefined : eq(recursos_paciente.visible_paciente, true)),
        )
        .orderBy(desc(recursos_paciente.created_at))
    },
  }),

  'recursos.url': op({
    acceso: 'usuario',
    args: z.object({ id }),
    run: async (ctx, a) => {
      const [r] = await db
        .select({
          paciente_id: recursos_paciente.paciente_id,
          storage_path: recursos_paciente.storage_path,
          visible_paciente: recursos_paciente.visible_paciente,
        })
        .from(recursos_paciente)
        .where(eq(recursos_paciente.id, a.id))
        .limit(1)
      if (!r?.storage_path) throw new ErrorOp('Recurso sin archivo', 404)
      const staff = esStaff(ctx.profile.rol)
      if (!staff && !(r.paciente_id === ctx.user.id && r.visible_paciente)) throw new ErrorOp('No autorizado', 403)
      const url = await urlFirmada('recursos', r.storage_path, 3600)
      if (!url) throw new ErrorOp('No se pudo generar el enlace')
      return { url }
    },
  }),

  'wearable.ultimaSync': op({
    acceso: 'usuario',
    args: z.object({}),
    run: async (ctx) => {
      const [r] = await db
        .select({ sincronizado_at: mediciones_wearable.sincronizado_at })
        .from(mediciones_wearable)
        .where(eq(mediciones_wearable.paciente_id, ctx.user.id))
        .orderBy(desc(mediciones_wearable.sincronizado_at))
        .limit(1)
      return { sincronizado_at: r?.sincronizado_at ?? null }
    },
  }),

  'wearable.paciente': op({
    acceso: 'staff',
    args: z.object({ pacienteId }),
    run: async (_ctx, a) =>
      db
        .select({
          fecha: mediciones_wearable.fecha,
          pasos: mediciones_wearable.pasos,
          calorias_activas: mediciones_wearable.calorias_activas,
          fc_prom: mediciones_wearable.fc_prom,
          fc_min: mediciones_wearable.fc_min,
          fc_max: mediciones_wearable.fc_max,
          minutos_sueno: mediciones_wearable.minutos_sueno,
          fuente: mediciones_wearable.fuente,
          sincronizado_at: mediciones_wearable.sincronizado_at,
        })
        .from(mediciones_wearable)
        .where(eq(mediciones_wearable.paciente_id, a.pacienteId))
        .orderBy(desc(mediciones_wearable.fecha))
        .limit(30),
  }),

  // ---- Feedback ---------------------------------------------------------------------------
  /** Feedback de una semana (la del paciente logueado) con su hilo de mensajes. */
  'feedback.semana': op({
    acceso: 'usuario',
    args: z.object({ semana: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
    run: async (ctx, a) => {
      const [fb] = await db
        .select()
        .from(feedback_semanal)
        .where(and(eq(feedback_semanal.paciente_id, ctx.user.id), eq(feedback_semanal.semana_inicio, a.semana)))
        .limit(1)
      if (!fb) return { feedback: null, mensajes: [] }
      const hilos = await mensajesDeFeedback([fb.id])
      return { feedback: fb, mensajes: hilos.get(fb.id) ?? [] }
    },
  }),

  'feedback.paciente': op({
    acceso: 'staff',
    args: z.object({ pacienteId }),
    run: async (_ctx, a) =>
      db
        .select()
        .from(feedback_semanal)
        .where(eq(feedback_semanal.paciente_id, a.pacienteId))
        .orderBy(desc(feedback_semanal.semana_inicio))
        .limit(12),
  }),

  /** Mensajes de un hilo: el paciente dueño del feedback o staff (policy `feedback_mensajes select propio o staff`). */
  'feedback.mensajes': op({
    acceso: 'usuario',
    args: z.object({ feedbackId: id }),
    run: async (ctx, a) => {
      const [fb] = await db
        .select({ paciente_id: feedback_semanal.paciente_id })
        .from(feedback_semanal)
        .where(eq(feedback_semanal.id, a.feedbackId))
        .limit(1)
      if (!fb || !puedeVerPaciente(ctx, fb.paciente_id)) throw new ErrorOp('No autorizado', 403)
      const hilos = await mensajesDeFeedback([a.feedbackId])
      return hilos.get(a.feedbackId) ?? []
    },
  }),

  // ---- Antropometria, evaluaciones y evolucion (staff) ------------------------------------
  'antropometria.paciente': op({
    acceso: 'staff',
    args: z.object({ pacienteId }),
    run: async (_ctx, a) =>
      db
        .select({
          id: mediciones_antropometricas.id,
          fecha_medicion: mediciones_antropometricas.fecha_medicion,
          peso_kg: mediciones_antropometricas.peso_kg,
          talla_cm: mediciones_antropometricas.talla_cm,
          imc: mediciones_antropometricas.imc,
          porc_grasa: mediciones_antropometricas.porc_grasa,
          porc_masa_muscular: mediciones_antropometricas.porc_masa_muscular,
          kg_grasa: mediciones_antropometricas.kg_grasa,
          kg_musculo: mediciones_antropometricas.kg_musculo,
          dx_antropometrico: mediciones_antropometricas.dx_antropometrico,
          pliegue_triceps_mm: mediciones_antropometricas.pliegue_triceps_mm,
          pliegue_subescapular_mm: mediciones_antropometricas.pliegue_subescapular_mm,
          pliegue_supraespinal_mm: mediciones_antropometricas.pliegue_supraespinal_mm,
          pliegue_abdominal_mm: mediciones_antropometricas.pliegue_abdominal_mm,
          pliegue_muslo_mm: mediciones_antropometricas.pliegue_muslo_mm,
          pliegue_pierna_mm: mediciones_antropometricas.pliegue_pierna_mm,
          pliegue_biceps_mm: mediciones_antropometricas.pliegue_biceps_mm,
          pliegue_cresta_iliaca_mm: mediciones_antropometricas.pliegue_cresta_iliaca_mm,
          perimetro_brazo_cm: mediciones_antropometricas.perimetro_brazo_cm,
          perimetro_muslo_cm: mediciones_antropometricas.perimetro_muslo_cm,
          perimetro_pierna_cm: mediciones_antropometricas.perimetro_pierna_cm,
          kg_tejido_muscular: mediciones_antropometricas.kg_tejido_muscular,
          kg_tejido_oseo: mediciones_antropometricas.kg_tejido_oseo,
        })
        .from(mediciones_antropometricas)
        .where(eq(mediciones_antropometricas.paciente_id, a.pacienteId))
        .orderBy(desc(mediciones_antropometricas.fecha_medicion), desc(mediciones_antropometricas.id)),
  }),

  'antropometria.ultimas': op({
    acceso: 'staff',
    args: z.object({ pacienteId }),
    run: async (_ctx, a) =>
      db
        .select({
          peso_kg: mediciones_antropometricas.peso_kg,
          imc: mediciones_antropometricas.imc,
          fecha_medicion: mediciones_antropometricas.fecha_medicion,
        })
        .from(mediciones_antropometricas)
        .where(eq(mediciones_antropometricas.paciente_id, a.pacienteId))
        .orderBy(desc(mediciones_antropometricas.fecha_medicion), desc(mediciones_antropometricas.id))
        .limit(2),
  }),

  'evaluaciones.paciente': op({
    acceso: 'staff',
    args: z.object({ pacienteId }),
    run: async (_ctx, a) =>
      db
        .select()
        .from(evaluaciones_funcionales)
        .where(eq(evaluaciones_funcionales.paciente_id, a.pacienteId))
        .orderBy(desc(evaluaciones_funcionales.fecha))
        .limit(10),
  }),

  'evolucion.paciente': op({
    acceso: 'staff',
    args: z.object({ pacienteId }),
    run: async (_ctx, a) => {
      const filas = await db
        .select({
          id: evolucion_entradas.id,
          origen: evolucion_entradas.origen,
          tipo: evolucion_entradas.tipo,
          contenido: evolucion_entradas.contenido,
          contenido_enc: evolucion_entradas.contenido_enc,
          visible_paciente: evolucion_entradas.visible_paciente,
          created_at: evolucion_entradas.created_at,
        })
        .from(evolucion_entradas)
        .where(eq(evolucion_entradas.paciente_id, a.pacienteId))
        .orderBy(desc(evolucion_entradas.created_at))
      return filas.map(({ contenido_enc, ...f }) => ({ ...f, contenido: readClinicalField(contenido_enc, f.contenido) ?? '' }))
    },
  }),

  // ---- Entrenamiento ----------------------------------------------------------------------
  'entrenamiento.finalizadas': op({
    acceso: 'usuario',
    args: z.object({ planId: id, dia: z.string().nullable().optional(), limite: z.number().int().min(1).max(50).optional() }),
    run: async (ctx, a) => sesionesFinalizadas(ctx.user.id, a.planId, a.dia, a.limite ?? 5),
  }),

  'entrenamiento.ejercicios': op({
    acceso: 'usuario',
    args: z.object({ planId: id, dia: z.string().nullable().optional() }),
    run: async (ctx, a) => ejerciciosDelDia(ctx.user.id, a.planId, a.dia),
  }),

  'entrenamiento.sesiones': op({
    acceso: 'staff',
    args: z.object({ pacienteId }),
    run: async (_ctx, a) => sesionesDePaciente(a.pacienteId),
  }),

  'entrenamiento.detalle': op({
    acceso: 'staff',
    args: z.object({ pacienteId, sesionId: id }),
    run: async (_ctx, a) => detalleSesion(a.pacienteId, a.sesionId),
  }),
}

