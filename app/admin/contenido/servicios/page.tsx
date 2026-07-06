import { toggleServicioActivoAction, actualizarServicioAction, crearServicioAction } from '@/actions/contenido'
import { ServicioForm } from '@/components/admin/servicio-form'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function ContenidoServiciosPage() {
  const supabase = createClient()

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
      {(servicios ?? []).map((s) => (
        <div key={s.id} className="space-y-2">
          <ServicioForm
            action={actualizarServicioAction}
            servicio={s}
            profesionales={opcionesProfesional}
            submitLabel="Guardar cambios"
          />
          <form action={toggleServicioActivoAction} className="flex justify-end">
            <input type="hidden" name="id" value={s.id} />
            <input type="hidden" name="activo" value={String(s.activo)} />
            <button
              type="submit"
              className="text-xs font-medium text-gray-500 hover:text-vimet-red underline underline-offset-2"
            >
              {s.activo ? 'Desactivar servicio' : 'Reactivar servicio'}
            </button>
          </form>
        </div>
      ))}

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
