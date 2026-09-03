import { Pagination } from '@/components/pagination'
import { EvolucionEntryItem } from '@/components/seguimiento/evolucion-entry-item'
import { EvolucionForm } from '@/components/seguimiento/evolucion-form'
import { pageRange, parsePage, totalPages as calcTotalPages } from '@/lib/pagination'
import { createClient } from '@/lib/supabase/server'
import { readClinicalField } from '@/lib/crypto/clinical'
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

export default async function EvolucionPage(
  props: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ page?: string }>
  }
) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const supabase = await createClient()
  const page = parsePage(searchParams?.page)
  const [from, to] = pageRange(page)
  const { data, count } = await supabase
    .from('evolucion_entradas')
    .select(
      'id, origen, tipo, contenido, contenido_enc, visible_paciente, created_at, registrado_por, registrante:profiles!evolucion_entradas_registrado_por_fkey(nombre, apellido)',
      { count: 'exact' },
    )
    .eq('paciente_id', params.id)
    .order('created_at', { ascending: false })
    .range(from, to)

  // Ver lib/crypto/clinical.ts — `_enc` si la entrada ya está cifrada, si
  // no cae al texto plano viejo (histórico sin backfillear).
  const entries = ((data ?? []) as unknown as (Entry & { contenido_enc: string | null })[]).map(
    (e) => ({ ...e, contenido: readClinicalField(e.contenido_enc, e.contenido) ?? '' }),
  )
  const pages = calcTotalPages(count)

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

      <Pagination
        page={page}
        totalPages={pages}
        makeHref={(p) => `/admin/pacientes/${params.id}/evolucion?page=${p}`}
      />
    </div>
  )
}
