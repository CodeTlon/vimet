import { FichaForm } from '@/components/seguimiento/ficha-form'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function PacienteFichaPage(
  props: {
    params: Promise<{ id: string }>
  }
) {
  const params = await props.params;
  const supabase = createClient()
  const { data: ficha } = await supabase
    .from('fichas_paciente')
    .select('*')
    .eq('paciente_id', params.id)
    .maybeSingle()

  return <FichaForm pacienteId={params.id} ficha={ficha} />
}
