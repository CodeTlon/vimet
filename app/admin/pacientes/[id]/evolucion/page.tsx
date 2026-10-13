import { Pagination } from '@/components/pagination'
import { EvolucionEntryItem } from '@/components/seguimiento/evolucion-entry-item'
import { EvolucionForm } from '@/components/seguimiento/evolucion-form'
import { pageRange, parsePage, totalPages as calcTotalPages } from '@/lib/pagination'
import { desc, eq, sql } from 'drizzle-orm'

import { evolucion_entradas as tabla, profiles } from '@/db/schema'
import { requireStaff } from '@/lib/auth/session'
import { db } from '@/lib/db'
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
  await requireStaff()
  const searchParams = await props.searchParams;
  const page = parsePage(searchParams?.page)
  const [from, to] = pageRange(page)
  const [data, [{ total }]] = await Promise.all([
    db
      .select({
        id: tabla.id,
        origen: tabla.origen,
        tipo: tabla.tipo,
        contenido: tabla.contenido,
        contenido_enc: tabla.contenido_enc,
        visible_paciente: tabla.visible_paciente,
        created_at: tabla.created_at,
        registrado_por: tabla.registrado_por,
        registrante: { nombre: profiles.nombre, apellido: profiles.apellido },
      })
      .from(tabla)
      .leftJoin(profiles, eq(profiles.id, tabla.registrado_por))
      .where(eq(tabla.paciente_id, params.id))
      .orderBy(desc(tabla.created_at))
      .limit(to - from + 1)
      .offset(from),
    db.select({ total: sql<number>`count(*)::int` }).from(tabla).where(eq(tabla.paciente_id, params.id)),
  ])

  // Ver lib/crypto/clinical.ts — `_enc` si la entrada ya está cifrada, si no cae al texto plano
  // viejo (histórico sin backfillear).
  const entries = (data as unknown as (Entry & { contenido_enc: string | null })[]).map((e) => ({
    ...e,
    contenido: readClinicalField(e.contenido_enc, e.contenido) ?? '',
  }))
  const pages = calcTotalPages(total)

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
