import { EvolucionEntryItem } from '@/components/seguimiento/evolucion-entry-item'
import { EvolucionForm } from '@/components/seguimiento/evolucion-form'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Entry = {
  id: number
  origen: 'nutricion' | 'entrenamiento'
  tipo: 'evolucion' | 'observacion'
  contenido: string
  visible_paciente: boolean
  created_at: string
  registrado_por: string | null
  registrante: { nombre: string; apellido: string } | null
}

export default async function EvolucionPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const supabase = createClient()
  const { data } = await supabase
    .from('evolucion_entradas')
    .select(
      'id, origen, tipo, contenido, visible_paciente, created_at, registrado_por, registrante:profiles!evolucion_entradas_registrado_por_fkey(nombre, apellido)',
    )
    .eq('paciente_id', params.id)
    .order('created_at', { ascending: false })

  const entries = (data ?? []) as unknown as Entry[]

  return (
    <div className="space-y-5">
      <EvolucionForm pacienteId={params.id} />

      {entries.length === 0 ? (
        <p className="text-center text-sm text-gray-500 italic">
          No hay entradas registradas todavía.
        </p>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => (
            <EvolucionEntryItem key={e.id} entry={e} pacienteId={params.id} />
          ))}
        </ul>
      )}
    </div>
  )
}
