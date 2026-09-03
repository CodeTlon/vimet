import { z } from 'zod'

export const crearPacienteSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio'),
  apellido: z.string().trim().min(1, 'El apellido es obligatorio'),
  telefono: z.string().trim().min(6, 'Teléfono inválido'),
  email: z.union([z.string().trim().email('Email inválido'), z.literal('')]).optional(),
})
