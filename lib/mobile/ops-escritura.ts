// Operaciones de ESCRITURA de la app mobile. Todas delegan en lib/services/* (las mismas reglas,
// cifrado y auditoria que la web); aca solo se valida el acceso y se adapta la entrada.
import { z } from 'zod'

import { actualizarEvaluacion, crearEvaluacion, eliminarEvaluacion } from '@/lib/services/evaluaciones'
import {
  cambiarEstadoObjetivo,
  crearObjetivo,
  eliminarObjetivo,
} from '@/lib/services/objetivos'
import { actualizarMedicion, crearMedicion, eliminarMedicion } from '@/lib/services/mediciones'
import {
  actualizarEntradaEvolucion,
  crearEntradaEvolucion,
  eliminarEntradaEvolucion,
} from '@/lib/services/evolucion'
import { guardarFicha } from '@/lib/services/ficha'
import {
  editarMensajeFeedback,
  enviarFeedback,
  enviarMensajeFeedback,
} from '@/lib/services/feedback'
import { agregarFranja, franjaSeSolapa } from '@/lib/services/horarios'
import { actualizarPlan, crearPlan, eliminarPlan, urlArchivoPlan } from '@/lib/services/planes'
import {
  actualizarSeccion,
  crearSeccion,
  eliminarImagenSeccion,
  eliminarSeccion,
  moverSeccion,
} from '@/lib/services/plan-secciones'
import {
  finalizarSesion,
  guardarDescanso,
  guardarSet,
  iniciarSesion,
} from '@/lib/services/entrenamiento'
import { guardarMedicionesWearable } from '@/lib/services/wearable'
import { cambiarActivo } from '@/lib/services/staff'
import { recursoEliminar, recursoVisibilidad } from '@/lib/services/recursos'

import { ErrorOp, op } from './tipos'

const pacienteId = z.string().uuid()
const id = z.coerce.number().int().positive()
/** Los servicios validan strings (vienen de un form): se normaliza lo que manda la app. */
const aStrings = (o: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v == null ? '' : typeof v === 'boolean' ? String(v) : String(v)]))
const resultado = (r: { ok?: boolean; error?: string }) => {
  if (r.error || r.ok === false) throw new ErrorOp(r.error ?? 'No se pudo completar la operación.')
  return { ok: true }
}

export const opsEscritura = {
  // ---- Seguimiento clinico (staff) ----------------------------------------------------------
  'ficha.guardar': op({
    acceso: 'staff',
    args: z.object({ campos: z.record(z.string(), z.unknown()) }),
    run: async (ctx, a) => resultado(await guardarFicha(ctx.user.id, aStrings(a.campos))),
  }),

  'antropometria.crear': op({
    acceso: 'staff',
    args: z.object({ campos: z.record(z.string(), z.unknown()) }),
    run: async (ctx, a) => resultado(await crearMedicion(ctx.user.id, aStrings(a.campos))),
  }),
  'antropometria.actualizar': op({
    acceso: 'staff',
    args: z.object({ campos: z.record(z.string(), z.unknown()) }),
    run: async (ctx, a) => resultado(await actualizarMedicion(ctx.user.id, aStrings(a.campos))),
  }),
  'antropometria.eliminar': op({
    acceso: 'staff',
    args: z.object({ id }),
    run: async (ctx, a) => resultado(await eliminarMedicion(ctx.user.id, a.id)),
  }),

  'evaluaciones.crear': op({
    acceso: 'staff',
    args: z.object({ campos: z.record(z.string(), z.unknown()) }),
    run: async (ctx, a) => resultado(await crearEvaluacion(ctx.user.id, aStrings(a.campos))),
  }),
  'evaluaciones.actualizar': op({
    acceso: 'staff',
    args: z.object({ campos: z.record(z.string(), z.unknown()) }),
    run: async (ctx, a) => resultado(await actualizarEvaluacion(ctx.user.id, aStrings(a.campos))),
  }),
  'evaluaciones.eliminar': op({
    acceso: 'staff',
    args: z.object({ id }),
    run: async (ctx, a) => resultado(await eliminarEvaluacion(ctx.user.id, a.id)),
  }),

  'evolucion.crear': op({
    acceso: 'staff',
    args: z.object({ campos: z.record(z.string(), z.unknown()) }),
    run: async (ctx, a) => resultado(await crearEntradaEvolucion(ctx.user.id, aStrings(a.campos))),
  }),
  'evolucion.actualizar': op({
    acceso: 'staff',
    args: z.object({ campos: z.record(z.string(), z.unknown()) }),
    run: async (ctx, a) => resultado(await actualizarEntradaEvolucion(ctx.user.id, aStrings(a.campos))),
  }),
  'evolucion.eliminar': op({
    acceso: 'staff',
    args: z.object({ id, pacienteId }),
    run: async (ctx, a) => resultado(await eliminarEntradaEvolucion(ctx.user.id, a.id, a.pacienteId)),
  }),

  'objetivos.crear': op({
    acceso: 'staff',
    args: z.object({ campos: z.record(z.string(), z.unknown()) }),
    run: async (ctx, a) => resultado(await crearObjetivo(ctx.user.id, aStrings(a.campos))),
  }),
  'objetivos.estado': op({
    acceso: 'staff',
    args: z.object({ id, pacienteId, estado: z.enum(['pendiente', 'en_progreso', 'cumplido', 'descartado']) }),
    run: async (_ctx, a) =>
      resultado(await cambiarEstadoObjetivo({ id: a.id, paciente_id: a.pacienteId, estado: a.estado })),
  }),
  'objetivos.eliminar': op({
    acceso: 'staff',
    args: z.object({ id, pacienteId }),
    run: async (_ctx, a) => resultado(await eliminarObjetivo(a.id, a.pacienteId)),
  }),

  // ---- Planes y secciones (staff) ----------------------------------------------------------
  'planes.guardar': op({
    acceso: 'staff',
    args: z.object({ id: id.optional(), campos: z.record(z.string(), z.unknown()) }),
    run: async (ctx, a, archivos) => {
      const raw = aStrings(a.campos)
      const res = a.id
        ? await actualizarPlan(ctx.user.id, { ...raw, id: String(a.id) }, archivos.archivo)
        : await crearPlan(ctx.user.id, raw, archivos.archivo)
      resultado(res)
      return { ok: true, planId: res.planId }
    },
  }),
  'planes.eliminar': op({
    acceso: 'staff',
    args: z.object({ id, pacienteId }),
    run: async (ctx, a) => resultado(await eliminarPlan(ctx.user.id, a.id, a.pacienteId)),
  }),
  'planes.url': op({
    acceso: 'usuario',
    args: z.object({ id }),
    run: async (ctx, a) => {
      const r = await urlArchivoPlan(ctx.profile, a.id)
      if (!r.url) throw new ErrorOp(r.error ?? 'No se pudo generar el enlace', r.error === 'No autorizado' ? 403 : 400)
      return { url: r.url }
    },
  }),

  'secciones.guardar': op({
    acceso: 'staff',
    args: z.object({ id: id.optional(), campos: z.record(z.string(), z.unknown()) }),
    run: async (_ctx, a, archivos) => {
      const raw: Record<string, unknown> = { ...a.campos }
      for (const [k, v] of Object.entries(raw)) if (!Array.isArray(v)) raw[k] = v == null ? '' : String(v)
      const res = a.id ? await actualizarSeccion({ ...raw, id: String(a.id) }, archivos.imagenes) : await crearSeccion(raw, archivos.imagenes)
      return resultado(res)
    },
  }),
  'secciones.eliminar': op({
    acceso: 'staff',
    args: z.object({ id, planId: id }),
    run: async (_ctx, a) => {
      await eliminarSeccion(a.id, a.planId)
      return { ok: true }
    },
  }),
  'secciones.eliminarImagen': op({
    acceso: 'staff',
    args: z.object({ id, planId: id }),
    run: async (_ctx, a) => {
      await eliminarImagenSeccion(a.id, a.planId)
      return { ok: true }
    },
  }),
  'secciones.mover': op({
    acceso: 'staff',
    args: z.object({ id, planId: id, direccion: z.enum(['subir', 'bajar']) }),
    run: async (_ctx, a) => {
      await moverSeccion(a.id, a.planId, a.direccion)
      return { ok: true }
    },
  }),

  // ---- Recursos (staff) -------------------------------------------------------------------
  'recursos.eliminar': op({
    acceso: 'staff',
    args: z.object({ id, pacienteId }),
    run: async (_ctx, a) => resultado(await recursoEliminar(a.id, a.pacienteId)),
  }),
  'recursos.visibilidad': op({
    acceso: 'staff',
    args: z.object({ id, pacienteId, visible: z.boolean() }),
    run: async (_ctx, a) => resultado(await recursoVisibilidad(a.id, a.pacienteId, a.visible)),
  }),

  // ---- Feedback (paciente) ----------------------------------------------------------------
  'feedback.guardar': op({
    acceso: 'usuario',
    args: z.object({ campos: z.record(z.string(), z.unknown()) }),
    run: async (ctx, a) => {
      // `semana_inicio` la fija el servidor: el cliente no elige a que semana carga.
      const { semana_inicio: _s, ...resto } = a.campos
      return resultado(await enviarFeedback(ctx.user.id, aStrings(resto), null))
    },
  }),
  'feedback.mensaje': op({
    acceso: 'usuario',
    args: z.object({ feedbackId: id, contenido: z.string() }),
    run: async (ctx, a) =>
      resultado(await enviarMensajeFeedback(ctx.profile, { feedback_id: a.feedbackId, contenido: a.contenido })),
  }),
  'feedback.editarMensaje': op({
    acceso: 'usuario',
    args: z.object({ id, contenido: z.string() }),
    run: async (ctx, a) => resultado(await editarMensajeFeedback(ctx.user.id, { id: a.id, contenido: a.contenido })),
  }),

  // ---- Reloj (paciente) -------------------------------------------------------------------
  'wearable.subir': op({
    acceso: 'usuario',
    args: z.object({ filas: z.array(z.record(z.string(), z.unknown())).max(60) }),
    run: async (ctx, a) => ({ ok: true, cantidad: await guardarMedicionesWearable(ctx.user.id, a.filas) }),
  }),

  // ---- Entrenamiento (paciente) -----------------------------------------------------------
  'entrenamiento.iniciar': op({
    acceso: 'usuario',
    args: z.object({ planId: id, dia: z.string().nullable().optional() }),
    run: async (ctx, a) => {
      const s = await iniciarSesion(ctx.user.id, a.planId, a.dia)
      if (!s) throw new ErrorOp('Plan no encontrado', 404)
      return s
    },
  }),
  'entrenamiento.set': op({
    acceso: 'usuario',
    args: z.object({
      sesionId: id,
      planEjercicioId: id,
      numeroSet: z.number().int().min(1).max(100),
      pesoKg: z.number().min(0).max(1000).nullable().optional(),
      repeticiones: z.string().max(50).nullable().optional(),
      duracionSeg: z.number().int().min(0).max(86400).nullable().optional(),
    }),
    run: async (ctx, a) => {
      const s = await guardarSet(ctx.user.id, {
        sesion_id: a.sesionId,
        plan_ejercicio_id: a.planEjercicioId,
        numero_set: a.numeroSet,
        peso_kg: a.pesoKg ?? null,
        repeticiones: a.repeticiones ?? null,
        duracion_seg: a.duracionSeg ?? null,
      })
      if (!s) throw new ErrorOp('Sesión o ejercicio inválido', 404)
      return s
    },
  }),
  'entrenamiento.descanso': op({
    acceso: 'usuario',
    args: z.object({ sesionId: id, setId: id, descansoSeg: z.number().int().min(0).max(86400) }),
    run: async (ctx, a) => {
      if (!(await guardarDescanso(ctx.user.id, a.sesionId, a.setId, a.descansoSeg))) throw new ErrorOp('Serie no encontrada', 404)
      return { ok: true }
    },
  }),
  'entrenamiento.finalizar': op({
    acceso: 'usuario',
    args: z.object({ sesionId: id }),
    run: async (ctx, a) => {
      if (!(await finalizarSesion(ctx.user.id, a.sesionId))) throw new ErrorOp('Sesión no encontrada', 404)
      return { ok: true }
    },
  }),

  // ---- Agenda del profesional -------------------------------------------------------------
  'horarios.agregar': op({
    acceso: 'staff',
    args: z.object({
      dia_semana: z.number().int().min(0).max(6),
      hora_inicio: z.string().regex(/^\d{2}:\d{2}$/),
      hora_fin: z.string().regex(/^\d{2}:\d{2}$/),
      modalidad: z.enum(['presencial', 'virtual', 'ambas']),
    }),
    run: async (ctx, a) => {
      if (a.hora_inicio >= a.hora_fin) throw new ErrorOp('La hora de inicio debe ser anterior a la de fin.')
      if (await franjaSeSolapa(ctx.user.id, a)) throw new ErrorOp('Esa franja se superpone con otra que ya tenés cargada ese día.')
      await agregarFranja(ctx.user.id, a)
      return { ok: true }
    },
  }),

  // ---- Cuentas ---------------------------------------------------------------------------
  'pacientes.activo': op({
    acceso: 'staff',
    args: z.object({ id: pacienteId, activo: z.boolean() }),
    run: async (ctx, a) => resultado(await cambiarActivo(ctx.profile, a.id, a.activo)),
  }),
}
