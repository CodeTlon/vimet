import { toggleServicioActivoAction, actualizarServicioAction, crearServicioAction } from '@/actions/contenido'
import { ServicioForm } from '@/components/admin/servicio-form'
import { ServiciosList } from '@/components/admin/servicios-list'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function ContenidoServiciosPage() {
  const supabase = await createClient()

  const [{ data: servicios }, { data: profesionales }] = await Promise.all([
    supabase.from('servicios').select('*').order('tipo').order('nombre'),
    supabase
      .from('profiles')
      .select('id, nombre, apellido')
      .in('rol', ['nutricionista', 'entrenador', 'admin'])
      .eq('activo', true),
  ])

  const opcionesProfesional = (profesionales ?? []).map((p) => ({
    id: p.id as string,
    nombre: `${p.nombre} ${p.apellido}`.trim(),
  }))

  return (
    <div className="space-y-6">
      <ServiciosList
        servicios={(servicios ?? []) as never}
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
