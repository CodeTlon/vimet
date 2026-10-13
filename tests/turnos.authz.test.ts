import { eq } from 'drizzle-orm'
import { beforeAll, describe, expect, it } from 'vitest'

import { horarios_disponibles, profiles, servicios, turnos } from '@/db/schema'
import {
  cancelarComoPaciente,
  confirmarComoPaciente,
  insertarTurnos,
  profesionalDisponible,
  puedeGestionarTurno,
  type Actor,
} from '@/lib/data/turnos'
import { crearDbDePrueba } from './helpers/db'

const PACIENTE_A = '00000000-0000-0000-0000-00000000000a'
const PACIENTE_B = '00000000-0000-0000-0000-00000000000b'
const NUTRI = '00000000-0000-0000-0000-0000000000a1'
const ENTRENADOR = '00000000-0000-0000-0000-0000000000a2'
const ADMIN = '00000000-0000-0000-0000-0000000000ff'

// Una fecha futura fija, un lunes (dia_semana 1) para no depender del reloj.
const FECHA = '2099-06-01'

let db: Awaited<ReturnType<typeof crearDbDePrueba>>['db']
let servicioId: number

beforeAll(async () => {
  ;({ db } = await crearDbDePrueba())
  await db.insert(profiles).values([
    { id: PACIENTE_A, nombre: 'A', apellido: 'A', rol: 'paciente' },
    { id: PACIENTE_B, nombre: 'B', apellido: 'B', rol: 'paciente' },
    { id: NUTRI, nombre: 'N', apellido: 'N', rol: 'nutricionista' },
    { id: ENTRENADOR, nombre: 'E', apellido: 'E', rol: 'entrenador' },
    { id: ADMIN, nombre: 'AD', apellido: 'AD', rol: 'admin' },
  ])
  const [s] = await db.insert(servicios).values({ nombre: 'Consulta', tipo: 'nutricion', profesional_id: NUTRI }).returning({ id: servicios.id })
  servicioId = s.id
  await db.insert(horarios_disponibles).values({
    profesional_id: NUTRI,
    dia_semana: 1,
    hora_inicio: '09:00',
    hora_fin: '13:00',
    modalidad: 'presencial',
  })
})

const franja = (hora_inicio: string, hora_fin: string, modalidad: 'presencial' | 'virtual' = 'presencial') => ({
  fecha: FECHA,
  hora_inicio,
  hora_fin,
  modalidad,
})

describe('disponibilidad', () => {
  it('acepta una franja dentro del horario y de la modalidad', async () => {
    expect(await profesionalDisponible(NUTRI, franja('10:00', '11:00'), undefined, db as never)).toBe(true)
  })
  it('rechaza fuera de horario o de modalidad', async () => {
    expect(await profesionalDisponible(NUTRI, franja('13:00', '14:00'), undefined, db as never)).toBe(false)
    expect(await profesionalDisponible(NUTRI, franja('10:00', '11:00', 'virtual'), undefined, db as never)).toBe(false)
  })
})

describe('reserva y choques', () => {
  it('no permite dos turnos activos solapados del mismo profesional', async () => {
    const a = await insertarTurnos(
      { pacienteId: PACIENTE_A, profesionalIds: [NUTRI], servicioId, franja: franja('09:00', '10:00'), notas: null },
      db as never,
    )
    expect(a.ok).toBe(true)
    const b = await insertarTurnos(
      { pacienteId: PACIENTE_B, profesionalIds: [NUTRI], servicioId, franja: franja('09:30', '10:30'), notas: null },
      db as never,
    )
    expect(b).toEqual({ ok: false, motivo: 'ocupado' })
    expect(await profesionalDisponible(NUTRI, franja('09:30', '10:30'), undefined, db as never)).toBe(false)
  })

  it('un combo crea dos turnos vinculados entre si', async () => {
    const res = await insertarTurnos(
      { pacienteId: PACIENTE_A, profesionalIds: [NUTRI, ENTRENADOR], servicioId, franja: franja('11:00', '12:00'), notas: 'hola' },
      db as never,
    )
    if (!res.ok) throw new Error('debio crear')
    const filas = await db.select().from(turnos).where(eq(turnos.paciente_id, PACIENTE_A))
    const par = filas.filter((t) => res.ids.includes(t.id))
    expect(par).toHaveLength(2)
    expect(par[0].turno_par_id).toBe(par[1].id)
    expect(par[1].turno_par_id).toBe(par[0].id)
  })
})

describe('IDOR: el paciente solo toca sus turnos', () => {
  let turnoDeA: number
  beforeAll(async () => {
    const r = await insertarTurnos(
      { pacienteId: PACIENTE_A, profesionalIds: [NUTRI], servicioId, franja: franja('12:00', '12:45'), notas: null },
      db as never,
    )
    if (!r.ok) throw new Error('setup')
    turnoDeA = r.ids[0]
  })

  it('otro paciente no puede cancelar ni confirmar un turno ajeno', async () => {
    expect(await cancelarComoPaciente(PACIENTE_B, turnoDeA, db as never)).toEqual([])
    expect(await confirmarComoPaciente(PACIENTE_B, [turnoDeA], db as never)).toEqual([])
    const [t] = await db.select().from(turnos).where(eq(turnos.id, turnoDeA))
    expect(t.estado).toBe('pendiente')
  })

  it('el dueño confirma una vez y despues puede cancelar', async () => {
    expect(await confirmarComoPaciente(PACIENTE_A, [turnoDeA], db as never)).toHaveLength(1)
    expect(await confirmarComoPaciente(PACIENTE_A, [turnoDeA], db as never)).toEqual([]) // ya confirmado
    expect(await cancelarComoPaciente(PACIENTE_A, turnoDeA, db as never)).toHaveLength(1)
    expect(await cancelarComoPaciente(PACIENTE_A, turnoDeA, db as never)).toEqual([]) // ya cancelado
  })
})

describe('quien puede gestionar un turno', () => {
  const t = { paciente_id: PACIENTE_A, profesional_id: NUTRI }
  const actor = (id: string, rol: Actor['rol']): Actor => ({ id, rol })
  it('paciente dueño, profesional dueño y admin: si', () => {
    expect(puedeGestionarTurno(actor(PACIENTE_A, 'paciente'), t)).toBe(true)
    expect(puedeGestionarTurno(actor(NUTRI, 'nutricionista'), t)).toBe(true)
    expect(puedeGestionarTurno(actor(ADMIN, 'admin'), t)).toBe(true)
  })
  it('otro paciente y otro profesional: no', () => {
    expect(puedeGestionarTurno(actor(PACIENTE_B, 'paciente'), t)).toBe(false)
    expect(puedeGestionarTurno(actor(ENTRENADOR, 'entrenador'), t)).toBe(false)
  })
})
