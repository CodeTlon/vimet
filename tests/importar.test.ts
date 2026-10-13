import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { beforeAll, describe, expect, it } from 'vitest'

import { audit_log, fichas_paciente, profiles, servicios, turnos, user } from '@/db/schema'
import { crearAuth } from '@/lib/auth'
import { crearBaseLegada } from '../scripts/migracion/legado.mjs'
import { importarDatos } from '../scripts/migracion/importar.mjs'
import { crearDbDePrueba } from './helpers/db'

const PACIENTE = '10000000-0000-0000-0000-000000000001'
const NUTRI = '10000000-0000-0000-0000-000000000002'
const INVITADO = '10000000-0000-0000-0000-000000000003'
const CIFRADO = 'v1.aXY=.dGFn.Y2lwaGVy' // ciphertext de mentira: el importador no debe tocarlo

type Q = { query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }> }

let origen: Q
let destino: Awaited<ReturnType<typeof crearDbDePrueba>>
let resultado: { ok: boolean; usuarios: number; tablas: Record<string, { origen: number; destino: number; coincide: boolean }> }
let hash: string

beforeAll(async () => {
  hash = await bcrypt.hash('clave-de-supabase-1', 10)
  origen = (await crearBaseLegada()) as Q

  // El trigger handle_new_user crea el perfil al insertar en auth.users.
  await origen.query(
    `insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data) values
      ($1, 'paciente@example.com', $4, now(), '{"nombre":"Pia","apellido":"Paz"}'),
      ($2, 'nutri@example.com', $4, now(), '{"nombre":"Nora","apellido":"Sol"}'),
      ($3, 'invitado@example.com', '', null, '{"nombre":"Ian","apellido":"V"}')`,
    [PACIENTE, NUTRI, INVITADO, hash],
  )
  await origen.query(`update public.profiles set rol = 'nutricionista', activo = true where id = $1`, [NUTRI])
  await origen.query(`update public.profiles set activo = true, activado_en = now() where id = $1`, [PACIENTE])
  await origen.query(
    `insert into public.servicios (id, nombre, tipo, profesional_id) overriding system value values (7, 'Consulta', 'nutricion', $1)`,
    [NUTRI],
  )
  await origen.query(
    `insert into public.horarios_disponibles (profesional_id, dia_semana, hora_inicio, hora_fin) values ($1, 1, '09:00', '13:00')`,
    [NUTRI],
  )
  // Par de turnos vinculados (combo) + una ficha con dato cifrado + evaluacion con columna generada.
  await origen.query(
    `insert into public.turnos (id, paciente_id, profesional_id, servicio_id, fecha, hora_inicio, hora_fin, estado) overriding system value values
      (41, $1, $2, 7, '2099-06-01', '10:00', '11:00', 'pendiente'),
      (42, $1, $2, 7, '2099-06-02', '10:00', '11:00', 'confirmado')`,
    [PACIENTE, NUTRI],
  )
  await origen.query(`update public.turnos set turno_par_id = 42 where id = 41`)
  await origen.query(`update public.turnos set turno_par_id = 41 where id = 42`)
  await origen.query(
    `insert into public.fichas_paciente (paciente_id, dx_medico_enc, fecha_nacimiento) values ($1, $2, '1990-03-15')`,
    [PACIENTE, CIFRADO],
  )
  await origen.query(
    `insert into public.evaluaciones_funcionales (paciente_id, test_thomas, fuerza_inferior) values ($1, 7, 12)`,
    [PACIENTE],
  )
  await origen.query(
    `insert into public.planes (id, paciente_id, tipo, titulo, dias_descanso) overriding system value values (3, $1, 'nutricion', 'Plan', '{lunes,martes}')`,
    [PACIENTE],
  )
  await origen.query(`insert into public.plan_secciones (plan_id, tipo, titulo, contenido, orden) values (3, 'pautas_generales', 'Pautas', 'x', 0)`)

  destino = await crearDbDePrueba()
  resultado = await importarDatos({ origen, destino: destino.client as unknown as Q, aplicar: true, log: () => {} })
})

describe('importacion Supabase -> base nueva', () => {
  it('verifica conteos y checksums de todas las tablas', () => {
    expect(resultado.ok).toBe(true)
    expect(resultado.usuarios).toBe(3)
    for (const [tabla, r] of Object.entries(resultado.tablas)) {
      expect(r.coincide, `tabla ${tabla}`).toBe(true)
    }
  })

  it('conserva ids, relaciones entre turnos y el dato cifrado tal cual', async () => {
    const t = await destino.db.select().from(turnos).where(eq(turnos.id, 41))
    expect(t[0].turno_par_id).toBe(42)
    const f = await destino.db.select().from(fichas_paciente).where(eq(fichas_paciente.paciente_id, PACIENTE))
    expect(f[0].dx_medico_enc).toBe(CIFRADO)
    expect(f[0].fecha_nacimiento).toBe('1990-03-15') // sin corrimiento de zona horaria
  })

  it('no duplica la auditoria con los triggers de la copia', async () => {
    const enOrigen = (await origen.query('select count(*)::int as n from audit_log')).rows[0].n
    const enDestino = await destino.db.select().from(audit_log)
    expect(enDestino).toHaveLength(enOrigen as number)
  })

  it('reajusta las secuencias: un insert nuevo no choca con los ids importados', async () => {
    const [nuevo] = await destino.db
      .insert(servicios)
      .values({ nombre: 'Nuevo', tipo: 'combo' })
      .returning({ id: servicios.id })
    expect(nuevo.id).toBeGreaterThan(7)
  })

  it('los usuarios importados inician sesion con su contrasena de Supabase', async () => {
    process.env.BETTER_AUTH_SECRET = 'z'.repeat(40)
    const auth = crearAuth({ db: destino.db as never, enviarEmail: async () => {} })
    const ok = await auth.api.signInEmail({ body: { email: 'paciente@example.com', password: 'clave-de-supabase-1' } })
    expect(ok.user.id).toBe(PACIENTE)
    await expect(
      auth.api.signInEmail({ body: { email: 'paciente@example.com', password: 'otra-clave-12345' } }),
    ).rejects.toBeTruthy()
  })

  it('el invitado sin contrasena no puede entrar hasta recuperarla', async () => {
    const [u] = await destino.db.select().from(user).where(eq(user.id, INVITADO))
    expect(u.emailVerified).toBe(false)
    const p = await destino.db.select().from(profiles).where(eq(profiles.id, INVITADO))
    expect(p).toHaveLength(1)
  })
})
