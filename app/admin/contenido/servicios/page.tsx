import { toggleServicioActivoAction, actualizarServicioAction, crearServicioAction } from '@/actions/contenido'
import { ServicioForm } from '@/components/admin/servicio-form'
import { ServiciosList } from '@/components/admin/servicios-list'
import { and, asc, eq, inArray } from 'drizzle-orm'

import { profiles, servicios as tabla } from '@/db/schema'
import { requireStaff } from '@/lib/auth/session'
import { db } from '@/lib/db'
export const dynamic = 'force-dynamic'

export default async function ContenidoServiciosPage() {
  await requireStaff()
  const [servicios, profesionales] = await Promise.all([
    db.select().from(tabla).orderBy(asc(tabla.tipo), asc(tabla.nombre)),
    db
      .select({ id: profiles.id, nombre: profiles.nombre, apellido: profiles.apellido })
      .from(profiles)
      .where(and(inArray(profiles.rol, ['nutricionista', 'entrenador', 'admin']), eq(profiles.activo, true))),
  ])

  const opcionesProfesional = profesionales.map((p) => ({
    id: p.id,
    nombre: `${p.nombre} ${p.apellido}`.trim(),
  }))

  return (
    <div className="space-y-6">
      <ServiciosList
        servicios={servicios as never}
        profesionales={opcionesProfesional}
        actualizarAction={actualizarServicioAction}
        toggleAction={toggleServicioActivoAction}
      />

      <div>
        <h3 className="font-heading font-semibold text-gray-900 mb-2">Nuevo servicio</h3>
        <ServicioForm
          action={crearServicioAction}
          profesionales={opcionesProfesional}
          submitLabel="Crear servicio"
        />
      </div>
    </div>
  )
}
