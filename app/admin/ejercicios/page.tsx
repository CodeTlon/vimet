import { Trash2 } from 'lucide-react'

import { eliminarEjercicioCustomAction } from '@/actions/ejercicios'
import { EjercicioUploader } from '@/components/seguimiento/ejercicio-uploader'
import { requireStaff } from '@/lib/supabase/auth-helpers'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const CATEGORIA_LABEL: Record<string, string> = {
  calentamiento: 'Calentamiento previo',
  entrenamiento: 'Entrenamiento',
  enfriamiento: 'Entrenamiento posterior',
  grupo_muscular: 'Grupo muscular',
}

type EjercicioCustom = {
  id: number
  nombre: string
  categoria: string | null
  parte_cuerpo: string | null
  gif_url: string | null
  instrucciones: string | null
}

export default async function EjerciciosPage() {
  await requireStaff()
  const supabase = await createClient()

  const { data } = await supabase
    .from('ejercicios')
    .select('id, nombre, categoria, parte_cuerpo, gif_url, instrucciones')
    .eq('origen', 'staff')
    .order('created_at', { ascending: false })

  const ejercicios = (data ?? []) as EjercicioCustom[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">Biblioteca de ejercicios</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tus propios videos recortados en GIF, para armar rutinas de calentamiento, entrenamiento o grupo muscular.
        </p>
      </div>

      <EjercicioUploader />

      {ejercicios.length === 0 ? (
        <p className="text-sm text-gray-500">Todavía no subiste ningún ejercicio.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ejercicios.map((e) => (
            <div key={e.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {e.gif_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.gif_url} alt={e.nombre} className="w-full aspect-video object-cover bg-gray-100" />
              ) : (
                <div className="w-full aspect-video bg-gray-100" />
              )}
              <div className="p-3 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900">{e.nombre}</p>
                  <form action={eliminarEjercicioCustomAction}>
                    <input type="hidden" name="id" value={e.id} />
                    <button
                      type="submit"
                      title="Eliminar"
                      className="p-1 rounded-lg text-vimet-red hover:bg-vimet-red/10 transition-colors shrink-0"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </form>
                </div>
                <p className="text-xs text-gray-500">
                  {[CATEGORIA_LABEL[e.categoria ?? ''] ?? e.categoria, e.parte_cuerpo].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
