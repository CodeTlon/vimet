import { FichaForm } from '@/components/seguimiento/ficha-form'
import { eq } from 'drizzle-orm'

import { fichas_paciente } from '@/db/schema'
import { requireStaff } from '@/lib/auth/session'
import { db } from '@/lib/db'
import { readClinicalField } from '@/lib/crypto/clinical'
import { logAuditView } from '@/lib/audit'
export const dynamic = 'force-dynamic'

export default async function PacienteFichaPage(
  props: {
    params: Promise<{ id: string }>
  }
) {
  const params = await props.params;
  const { user } = await requireStaff()
  // La lectura de la ficha clínica queda registrada (acción 'ver' del audit_log).
  await logAuditView({ pacienteId: params.id, actorId: user.id, tabla: 'fichas_paciente' })

  const [fichaRaw] = await db.select().from(fichas_paciente).where(eq(fichas_paciente.paciente_id, params.id)).limit(1)

  // Ver lib/crypto/clinical.ts — `_enc` si la fila ya está cifrada, si no
  // cae a la columna vieja en texto plano (histórico sin backfillear).
  const ficha = fichaRaw && {
    ...fichaRaw,
    dx_medico: readClinicalField(fichaRaw.dx_medico_enc, fichaRaw.dx_medico),
    dx_nutricional: readClinicalField(fichaRaw.dx_nutricional_enc, fichaRaw.dx_nutricional),
    medicacion: readClinicalField(fichaRaw.medicacion_enc, fichaRaw.medicacion),
    datos_laboratorio: readClinicalField(fichaRaw.datos_laboratorio_enc, fichaRaw.datos_laboratorio),
    observaciones_internas: readClinicalField(fichaRaw.observaciones_internas_enc, fichaRaw.observaciones_internas),
  }

  return <FichaForm pacienteId={params.id} ficha={ficha} />
}
