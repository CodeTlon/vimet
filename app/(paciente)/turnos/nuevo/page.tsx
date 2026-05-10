import Link from 'next/link'
import { redirect } from 'next/navigation'

import { BookingWizard } from '@/components/booking-wizard'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Sacar turno' }
export const dynamic = 'force-dynamic'

export default async function NuevoTurnoPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/turnos/nuevo')

  const [{ data: profesionales }, { data: servicios }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, nombre, apellido, rol')
      .in('rol', ['nutricionista', 'entrenador'])
      .eq('activo', true)
      .order('nombre'),
    supabase
      .from('servicios')
      .select('id, nombre, duracion_minutos, tipo, profesional_id')
      .eq('activo', true)
      .order('nombre'),
  ])

  return (
    <div className="min-h-screen pt-24 pb-16 bg-gradient-to-br from-vimet-sand to-vimet-cream">
      <div className="container-vimet">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-vimet-gradient text-white px-7 py-7">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold">
              Sacar <span className="underline decoration-white/40">Turno</span>
            </h1>
            <p className="text-sm text-white/85 mt-1">
              Reservá tu turno de nutrición o entrenamiento en pocos pasos.
            </p>
          </div>
          <div className="p-7">
            {(profesionales?.length ?? 0) === 0 ? (
              <div className="rounded-lg bg-vimet-red/5 border border-vimet-red/20 px-5 py-4 text-sm text-vimet-red">
                Estamos terminando de configurar el sistema de reservas. Mientras tanto,{' '}
                <Link href="/contacto" className="font-semibold underline">
                  contactanos por acá
                </Link>{' '}
                y te ayudamos a coordinar.
              </div>
            ) : (
              <BookingWizard
                profesionales={(profesionales ?? []) as never}
                servicios={(servicios ?? []) as never}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
