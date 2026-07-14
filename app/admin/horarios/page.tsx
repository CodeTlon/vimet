import { HorariosEditor, type Horario } from '@/components/horarios-editor'
import { requireStaff } from '@/lib/supabase/auth-helpers'
import { createClient } from '@/lib/supabase/server'

export const metadata = { title: 'Mis horarios · VIMET' }
export const dynamic = 'force-dynamic'

export default async function HorariosPage() {
  const { user } = await requireStaff()

  const supabase = await createClient()
  const { data: horarios } = await supabase
    .from('horarios_disponibles')
    .select('id, dia_semana, hora_inicio, hora_fin, modalidad, activo')
    .eq('profesional_id', user.id)
    .order('dia_semana', { ascending: true })
    .order('hora_inicio', { ascending: true })

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis horarios de atención</h1>
        <p className="text-sm text-gray-500 mt-1">
          Definí los días y franjas en los que atendés. Los pacientes solo podrán reservar
          turnos dentro de estas franjas.
        </p>
      </div>
      <HorariosEditor horarios={(horarios ?? []) as Horario[]} />
    </main>
  )
}
