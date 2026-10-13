import { HorariosEditor, type Horario } from '@/components/horarios-editor'
import { asc, eq } from 'drizzle-orm'

import { horarios_disponibles as tabla } from '@/db/schema'
import { requireStaff } from '@/lib/auth/session'
import { db } from '@/lib/db'
export const metadata = { title: 'Mis horarios · VIMET' }
export const dynamic = 'force-dynamic'

export default async function HorariosPage() {
  const { user } = await requireStaff()

  // Solo la agenda propia: cada profesional gestiona la suya.
  const horarios = await db
    .select({
      id: tabla.id,
      dia_semana: tabla.dia_semana,
      hora_inicio: tabla.hora_inicio,
      hora_fin: tabla.hora_fin,
      modalidad: tabla.modalidad,
      activo: tabla.activo,
    })
    .from(tabla)
    .where(eq(tabla.profesional_id, user.id))
    .orderBy(asc(tabla.dia_semana), asc(tabla.hora_inicio))

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis horarios de atención</h1>
        <p className="text-sm text-gray-500 mt-1">
          Definí los días y franjas en los que atendés. Los pacientes solo podrán reservar
          turnos dentro de estas franjas.
        </p>
      </div>
      <HorariosEditor horarios={horarios as Horario[]} />
    </main>
  )
}
