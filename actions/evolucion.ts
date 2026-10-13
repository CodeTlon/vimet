'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { evolucion_entradas } from '@/db/schema'
import { authStaff } from '@/lib/auth/session'
import { encryptClinical } from '@/lib/crypto/clinical'
import { conActor } from '@/lib/db'

export type EvolucionState = { ok?: boolean; error?: string }

const schema = z.object({
  paciente_id: z.string().uuid(),
  origen: z.enum(['nutricion', 'entrenamiento']),
  tipo: z.enum(['evolucion', 'observacion']),
  contenido: z.string().min(1, 'Escribí algo').max(4000),
  visible_paciente: z.enum(['true', 'false']).default('false'),
})

// Solo staff escribe evolucion (policy `evolucion staff all`).
const getStaff = authStaff

export async function crearEntradaEvolucionAction(
  _prev: unknown,
  formData: FormData,
): Promise<EvolucionState> {
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const ctx = await getStaff()
  if ('error' in ctx) return { error: ctx.error }

  const d = parsed.data
  let contenido_enc: string | null
  try {
    contenido_enc = encryptClinical(d.contenido)
  } catch (e) {
    console.error('crearEntradaEvolucionAction: fallo al cifrar contenido', e)
    return { error: 'No se pudo guardar la entrada (falló el cifrado — revisar CLINICAL_DATA_ENCRYPTION_KEY del entorno).' }
  }
  try {
    await conActor(ctx.user.id, (tx) =>
      tx.insert(evolucion_entradas).values({
        paciente_id: d.paciente_id,
        origen: d.origen,
        tipo: d.tipo,
        // Cifrado en Node antes de escribir (ver lib/crypto/clinical.ts) — la columna vieja
        // `contenido` queda en null para las entradas nuevas.
        contenido: null,
        contenido_enc,
        visible_paciente: d.visible_paciente === 'true',
        registrado_por: ctx.user.id,
      }),
    )
  } catch (err) {
    console.error('crearEntradaEvolucionAction:', err)
    return { error: 'No se pudo guardar la entrada.' }
  }

  revalidatePath(`/admin/pacientes/${d.paciente_id}/evolucion`)
  revalidatePath('/mi-progreso')
  return { ok: true }
}

const updateSchema = schema.extend({ id: z.coerce.number().int().positive() })

export async function actualizarEntradaEvolucionAction(
  _prev: unknown,
  formData: FormData,
): Promise<EvolucionState> {
  const parsed = updateSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }

  const ctx = await getStaff()
  if ('error' in ctx) return { error: ctx.error }

  const d = parsed.data
  let contenido_enc: string | null
  try {
    contenido_enc = encryptClinical(d.contenido)
  } catch (e) {
    console.error('actualizarEntradaEvolucionAction: fallo al cifrar contenido', e)
    return { error: 'No se pudo actualizar la entrada (falló el cifrado — revisar CLINICAL_DATA_ENCRYPTION_KEY del entorno).' }
  }
  try {
    await conActor(ctx.user.id, (tx) =>
      tx
        .update(evolucion_entradas)
        .set({
          origen: d.origen,
          tipo: d.tipo,
          contenido: null,
          contenido_enc,
          visible_paciente: d.visible_paciente === 'true',
        })
        .where(eq(evolucion_entradas.id, d.id)),
    )
  } catch (err) {
    console.error('actualizarEntradaEvolucionAction:', err)
    return { error: 'No se pudo actualizar la entrada.' }
  }

  revalidatePath(`/admin/pacientes/${d.paciente_id}/evolucion`)
  revalidatePath('/mi-progreso')
  return { ok: true }
}

export async function eliminarEntradaEvolucionAction(formData: FormData) {
  const id = Number(formData.get('id'))
  const paciente_id = String(formData.get('paciente_id') ?? '')
  if (!id) return
  const ctx = await getStaff()
  if ('error' in ctx) return
  await conActor(ctx.user.id, (tx) => tx.delete(evolucion_entradas).where(eq(evolucion_entradas.id, id)))
  revalidatePath(`/admin/pacientes/${paciente_id}/evolucion`)
}
