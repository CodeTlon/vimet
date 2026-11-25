import { eq } from 'drizzle-orm'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import {
  evolucion_entradas,
  fichas_paciente,
  objetivos,
  planes,
  profiles,
  recursos_paciente,
  servicios,
  turnos,
} from '@/db/schema'

// La base de las operaciones es PGlite con las migraciones reales: se reemplaza `@/lib/db`.
const hoisted = vi.hoisted(() => ({ testDb: null as unknown }))
vi.mock('@/lib/db', async () => {
  const { crearDbDePrueba } = await import('./helpers/db')
  const { sql } = await import('drizzle-orm')
  const t = await crearDbDePrueba()
  hoisted.testDb = t
  const db = t.db
  return {
    db,
    schema: await import('@/db/schema'),
    conActor: async (actorId: string, fn: (tx: typeof db) => Promise<unknown>) =>
      db.transaction(async (tx) => {
        await tx.execute(sql`select set_config('app.user_id', ${actorId}, true)`)
        return fn(tx as never)
      }),
  }
})
vi.mock('@/lib/storage/disk', () => ({
  subirArchivo: async () => {},
  borrarArchivos: async () => {},
  listarArchivos: async () => [],
  urlFirmada: async (_b: string, p: string) => `https://files.test/${p}?firmado=1`,
  urlsFirmadas: async () => new Map(),
  urlPublica: (_b: string, p: string) => `https://files.test/${p}`,
}))

import { db } from '@/lib/db'
import { ejecutarOp } from '@/lib/mobile/registry'
import { ErrorOp, type Ctx } from '@/lib/mobile/tipos'

const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const NUTRI = '11111111-1111-4111-8111-111111111111'
const ENTRE = '22222222-2222-4222-8222-222222222222'
const ADMIN = 'ffffffff-ffff-4fff-8fff-ffffffffffff'

const ctxDe = (id: string, rol: Ctx['profile']['rol']): Ctx =>
  ({ user: { id, email: `${id}@x.com` }, profile: { id, rol } as Ctx['profile'] })
const paciente = (id: string) => ctxDe(id, 'paciente')
const archivos = { archivo: null, imagenes: [] }

const llamar = (ctx: Ctx, op: string, args: unknown = {}) => ejecutarOp(op, args, ctx, archivos)
const rechaza = async (p: Promise<unknown>, status?: number) => {
  const e = await p.then(
    () => null,
    (x) => x,
  )
  expect(e).toBeInstanceOf(ErrorOp)
  if (status) expect((e as ErrorOp).status).toBe(status)
}

let planA: number
let planB: number
let turnoA: number
let recursoVisibleA: number
let recursoOcultoA: number

beforeAll(async () => {
  process.env.CLINICAL_DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')
  await db.insert(profiles).values([
    { id: A, nombre: 'Ana', apellido: 'A', rol: 'paciente' },
    { id: B, nombre: 'Beto', apellido: 'B', rol: 'paciente' },
    { id: NUTRI, nombre: 'Nora', apellido: 'N', rol: 'nutricionista' },
    { id: ENTRE, nombre: 'Enzo', apellido: 'E', rol: 'entrenador' },
    { id: ADMIN, nombre: 'Admin', apellido: 'X', rol: 'admin' },
  ])
  const [s] = await db.insert(servicios).values({ nombre: 'Consulta', tipo: 'nutricion', profesional_id: NUTRI }).returning({ id: servicios.id })
  ;[{ id: planA }] = await db.insert(planes).values({ paciente_id: A, tipo: 'nutricion', titulo: 'Plan A', estado: 'vigente' }).returning({ id: planes.id })
  ;[{ id: planB }] = await db.insert(planes).values({ paciente_id: B, tipo: 'nutricion', titulo: 'Plan B', estado: 'vigente' }).returning({ id: planes.id })
  await db.insert(planes).values({ paciente_id: A, tipo: 'nutricion', titulo: 'Borrador A', estado: 'borrador' })
  ;[{ id: turnoA }] = await db
    .insert(turnos)
    .values({ paciente_id: A, profesional_id: NUTRI, servicio_id: s.id, fecha: '2099-01-05', hora_inicio: '10:00', hora_fin: '11:00' })
    .returning({ id: turnos.id })
  await db.insert(fichas_paciente).values({ paciente_id: A, observaciones_internas: 'solo equipo', dx_medico: 'dx' })
  await db.insert(objetivos).values({ paciente_id: A, categoria: 'clinico', descripcion: 'bajar' })
  await db.insert(evolucion_entradas).values({ paciente_id: A, origen: 'nutricion', tipo: 'evolucion', contenido: 'nota', visible_paciente: false })
  ;[{ id: recursoVisibleA }] = await db
    .insert(recursos_paciente)
    .values({ paciente_id: A, tipo: 'pdf', categoria: 'otro', titulo: 'v', storage_path: `${A}/r/v.pdf`, visible_paciente: true })
    .returning({ id: recursos_paciente.id })
  ;[{ id: recursoOcultoA }] = await db
    .insert(recursos_paciente)
    .values({ paciente_id: A, tipo: 'pdf', categoria: 'otro', titulo: 'o', storage_path: `${A}/r/o.pdf`, visible_paciente: false })
    .returning({ id: recursos_paciente.id })
})

describe('barreras comunes del registro', () => {
  it('operacion inexistente o con nombre de prototipo', async () => {
    await rechaza(llamar(paciente(A), 'no.existe'), 404)
    await rechaza(llamar(paciente(A), 'constructor'), 404)
    await rechaza(llamar(paciente(A), '__proto__'), 404)
  })

  it('un paciente no puede invocar operaciones de staff ni de admin', async () => {
    for (const op of ['pacientes.lista', 'ficha.guardar', 'planes.guardar', 'pacientes.activo', 'antropometria.paciente']) {
      await rechaza(llamar(paciente(A), op, { pacienteId: B, id: A, activo: true, campos: {} }), 403)
    }
  })

  it('los argumentos invalidos se rechazan antes de ejecutar', async () => {
    await rechaza(llamar(ctxDe(NUTRI, 'nutricionista'), 'perfil.paciente', { pacienteId: 'no-es-uuid' }), 400)
  })
})

describe('IDOR de lectura: cada paciente ve solo lo suyo', () => {
  it('planes.mios no incluye borradores ni planes ajenos', async () => {
    const mios = (await llamar(paciente(A), 'planes.mios')) as { titulo: string }[]
    expect(mios.map((p) => p.titulo)).toEqual(['Plan A'])
    const deB = (await llamar(paciente(B), 'planes.mios')) as { titulo: string }[]
    expect(deB.map((p) => p.titulo)).toEqual(['Plan B'])
  })

  it('planes.detalle devuelve null para un plan ajeno y no filtra por id de paciente', async () => {
    expect(await llamar(paciente(A), 'planes.detalle', { id: planB })).toBeNull()
    expect(await llamar(paciente(A), 'planes.detalle', { id: planA })).not.toBeNull()
    // Staff con un pacienteId que no coincide: no se muestra.
    expect(await llamar(ctxDe(NUTRI, 'nutricionista'), 'planes.detalle', { id: planA, pacienteId: B })).toBeNull()
    expect(await llamar(ctxDe(NUTRI, 'nutricionista'), 'planes.detalle', { id: planA, pacienteId: A })).not.toBeNull()
  })

  it('turnos.mios y turnos.uno respetan al dueño', async () => {
    expect(await llamar(paciente(B), 'turnos.mios')).toEqual([])
    expect(await llamar(paciente(B), 'turnos.uno', { id: turnoA })).toBeNull()
    expect(await llamar(paciente(A), 'turnos.uno', { id: turnoA })).not.toBeNull()
    // Otro profesional (no dueño del turno) no lo ve; el dueño y el admin si.
    expect(await llamar(ctxDe(ENTRE, 'entrenador'), 'turnos.detalleStaff', { id: turnoA })).toBeNull()
    expect(await llamar(ctxDe(NUTRI, 'nutricionista'), 'turnos.detalleStaff', { id: turnoA })).not.toBeNull()
    expect(await llamar(ctxDe(ADMIN, 'admin'), 'turnos.detalleStaff', { id: turnoA })).not.toBeNull()
  })

  it('el dashboard de un staff no admin solo cuenta sus turnos', async () => {
    const hoy = '2099-01-05'
    const nutri = (await llamar(ctxDe(NUTRI, 'nutricionista'), 'admin.dashboard', { hoy })) as { hoy: unknown[] }
    const entre = (await llamar(ctxDe(ENTRE, 'entrenador'), 'admin.dashboard', { hoy })) as { hoy: unknown[] }
    const admin = (await llamar(ctxDe(ADMIN, 'admin'), 'admin.dashboard', { hoy })) as { hoy: unknown[] }
    expect(nutri.hoy).toHaveLength(1)
    expect(entre.hoy).toHaveLength(0)
    expect(admin.hoy).toHaveLength(1)
  })

  it('ficha.ver: el paciente solo la suya y sin observaciones internas', async () => {
    await rechaza(llamar(paciente(B), 'ficha.ver', { pacienteId: A }), 403)
    const propia = (await llamar(paciente(A), 'ficha.ver')) as Record<string, unknown>
    expect(propia.dx_medico).toBe('dx')
    expect('observaciones_internas' in propia).toBe(false)
    const staff = (await llamar(ctxDe(NUTRI, 'nutricionista'), 'ficha.ver', { pacienteId: A })) as Record<string, unknown>
    expect(staff.observaciones_internas).toBe('solo equipo')
  })

  it('objetivos, recursos y feedback: ajenos prohibidos', async () => {
    await rechaza(llamar(paciente(B), 'objetivos.ver', { pacienteId: A }), 403)
    await rechaza(llamar(paciente(B), 'recursos.ver', { pacienteId: A }), 403)
    expect(await llamar(paciente(B), 'objetivos.ver')).toEqual([])
  })

  it('recursos: el paciente solo ve los visibles y firma solo los suyos visibles', async () => {
    const lista = (await llamar(paciente(A), 'recursos.ver')) as { id: number }[]
    expect(lista.map((r) => r.id)).toEqual([recursoVisibleA])
    await llamar(paciente(A), 'recursos.url', { id: recursoVisibleA })
    await rechaza(llamar(paciente(A), 'recursos.url', { id: recursoOcultoA }), 403)
    await rechaza(llamar(paciente(B), 'recursos.url', { id: recursoVisibleA }), 403)
    // El staff si ve y firma el oculto.
    await llamar(ctxDe(NUTRI, 'nutricionista'), 'recursos.url', { id: recursoOcultoA })
  })

  it('la evolucion y las observaciones del equipo no son accesibles para pacientes', async () => {
    await rechaza(llamar(paciente(A), 'evolucion.paciente', { pacienteId: A }), 403)
  })
})

describe('IDOR de escritura', () => {
  it('un paciente no puede cargar mediciones del reloj a nombre de otro', async () => {
    await llamar(paciente(A), 'wearable.subir', {
      filas: [{ paciente_id: B, fecha: '2099-02-01', fuente: 'apple_health', pasos: 100 }],
    })
    const deB = (await llamar(ctxDe(NUTRI, 'nutricionista'), 'wearable.paciente', { pacienteId: B })) as unknown[]
    const deA = (await llamar(ctxDe(NUTRI, 'nutricionista'), 'wearable.paciente', { pacienteId: A })) as unknown[]
    expect(deB).toHaveLength(0)
    expect(deA).toHaveLength(1)
  })

  it('feedback: el paciente no puede escribir en el hilo de otro', async () => {
    // A envia su feedback de la semana actual y obtiene su hilo.
    await llamar(paciente(A), 'feedback.guardar', { campos: { animo: 7, observaciones: 'bien' } }).catch(() => {})
    // Como no hay ficha/plan vigente del test no necesariamente se crea; se crea a mano:
    const { feedback_semanal } = await import('@/db/schema')
    const [fb] = await db
      .insert(feedback_semanal)
      .values({ paciente_id: A, semana_inicio: '2099-01-05' })
      .returning({ id: feedback_semanal.id })
    await rechaza(llamar(paciente(B), 'feedback.mensajes', { feedbackId: fb.id }), 403)
    const res = (await llamar(paciente(B), 'feedback.mensaje', { feedbackId: fb.id, contenido: 'hola' }).then(
      () => 'ok',
      (e) => e,
    )) as unknown
    expect(res).toBeInstanceOf(ErrorOp)
  })

  it('entrenamiento: sesiones y series solo sobre el plan propio', async () => {
    await rechaza(llamar(paciente(A), 'entrenamiento.iniciar', { planId: planB, dia: null }), 404)
    const s = (await llamar(paciente(A), 'entrenamiento.iniciar', { planId: planA, dia: null })) as { id: number }
    // B no puede finalizar ni agregar series a la sesion de A.
    await rechaza(llamar(paciente(B), 'entrenamiento.finalizar', { sesionId: s.id }), 404)
    await rechaza(
      llamar(paciente(B), 'entrenamiento.set', { sesionId: s.id, planEjercicioId: 1, numeroSet: 1 }),
      404,
    )
    await llamar(paciente(A), 'entrenamiento.finalizar', { sesionId: s.id })
  })

  it('staff: la ficha se guarda cifrada y queda auditada con el actor', async () => {
    const res = await llamar(ctxDe(NUTRI, 'nutricionista'), 'ficha.guardar', {
      campos: { paciente_id: B, dx_medico: 'secreto-b', observaciones_internas: 'obs' },
    })
    expect(res).toEqual({ ok: true })
    const [f] = await db.select().from(fichas_paciente).where(eq(fichas_paciente.paciente_id, B))
    expect(f.dx_medico).toBeNull()
    expect(f.dx_medico_enc).toMatch(/^v1\./)
    expect(f.dx_medico_enc).not.toContain('secreto-b')
    const { audit_log } = await import('@/db/schema')
    const rastro = await db.select().from(audit_log).where(eq(audit_log.paciente_id, B))
    expect(rastro.some((r) => r.actor_id === NUTRI && r.tabla === 'fichas_paciente')).toBe(true)
  })

  it('staff no admin no puede desactivar a otra cuenta del equipo; si a un paciente', async () => {
    await rechaza(llamar(ctxDe(NUTRI, 'nutricionista'), 'pacientes.activo', { id: ADMIN, activo: false }), 400)
    await llamar(ctxDe(NUTRI, 'nutricionista'), 'pacientes.activo', { id: B, activo: false })
    const [b] = await db.select().from(profiles).where(eq(profiles.id, B))
    expect(b.activo).toBe(false)
  })

  it('eliminar objetivos/evolucion/recursos queda acotado al paciente indicado', async () => {
    const [o] = await db.select().from(objetivos).where(eq(objetivos.paciente_id, A))
    // Mismo id pero paciente equivocado: no borra nada.
    await llamar(ctxDe(NUTRI, 'nutricionista'), 'objetivos.eliminar', { id: o.id, pacienteId: B })
    expect(await db.select().from(objetivos).where(eq(objetivos.id, o.id))).toHaveLength(1)
    await rechaza(llamar(ctxDe(NUTRI, 'nutricionista'), 'recursos.eliminar', { id: recursoVisibleA, pacienteId: B }))
    expect(await db.select().from(recursos_paciente).where(eq(recursos_paciente.id, recursoVisibleA))).toHaveLength(1)
  })
})
