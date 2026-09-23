import { z } from 'zod'

// Compartido entre actions/turnos.ts (Server Action web) y
// app/api/mobile/turnos/crear (ruta mobile) — no puede vivir en
// actions/turnos.ts porque ese archivo es 'use server' y Next.js exige que
// TODO export de un archivo así sea una función async (mismo motivo por el
// que crearPacienteSchema se movió a lib/validation/staff.ts).
export const crearSchema = z.object({
  profesional_id: z.string().uuid('Profesional inválido'),
  servicio_id: z.string().min(1, 'Servicio inválido'),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
  hora_fin: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida'),
  modalidad: z.enum(['presencial', 'virtual']),
  notas: z.string().max(500).optional().default(''),
})
