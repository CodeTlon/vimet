import { FichaForm } from '@/components/seguimiento/ficha-form'
import { createClient } from '@/lib/supabase/server'
import { readClinicalField } from '@/lib/crypto/clinical'
import { logAuditView } from '@/lib/audit'
export const dynamic = 'force-dynamic'

export default async function PacienteFichaPage(
  props: {
    params: Promise<{ id: string }>
  }
) {
  const params = await props.params;
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  // Best-effort: si por lo que sea no hay user acá (no debería pasar, el
  // layout de /admin ya lo exige), simplemente no se loguea el acceso —
  // no vale la pena romper la página por esto.
  if (user) {
    await logAuditView(supabase, { pacienteId: params.id, actorId: user.id, tabla: 'fichas_paciente' })
  }

  const { data: fichaRaw } = await supabase
    .from('fichas_paciente')
    .select('*')
    .eq('paciente_id', params.id)
    .maybeSingle()

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
