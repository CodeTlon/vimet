import { Eye, EyeOff, Trash2 } from 'lucide-react'

import { eliminarEntradaEvolucionAction } from '@/actions/evolucion'
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

export default async function EvolucionPage({ params }: { params: { id: string } }) {
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
            <li
              key={e.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
            >
              <header className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide font-semibold">
                  <span
                    className={`px-2 py-0.5 rounded-full ${
                      e.origen === 'nutricion'
                        ? 'bg-vimet-cream text-vimet-red'
                        : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {e.origen}
                  </span>
                  <span className="text-gray-500">{e.tipo}</span>
                  <span
                    className={`inline-flex items-center gap-1 ml-2 ${
                      e.visible_paciente ? 'text-green-700' : 'text-gray-400'
                    }`}
                  >
                    {e.visible_paciente ? (
                      <>
                        <Eye className="size-3.5" /> visible
                      </>
                    ) : (
                      <>
                        <EyeOff className="size-3.5" /> interna
                      </>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>
                    {new Date(e.created_at).toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  {e.registrante ? (
                    <span>
                      {e.registrante.nombre} {e.registrante.apellido}
                    </span>
                  ) : null}
                  <form action={eliminarEntradaEvolucionAction}>
                    <input type="hidden" name="id" value={e.id} />
                    <input type="hidden" name="paciente_id" value={params.id} />
                    <button
                      type="submit"
                      className="text-vimet-red hover:text-vimet-red/80"
                      aria-label="Eliminar"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </form>
                </div>
              </header>
              <p className="text-sm text-gray-800 whitespace-pre-line">{e.contenido}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
