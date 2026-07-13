'use client'

import { Eye, EyeOff, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { eliminarEntradaEvolucionAction } from '@/actions/evolucion'
import { EvolucionForm } from '@/components/seguimiento/evolucion-form'

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

export function EvolucionEntryItem({ entry: e, pacienteId }: { entry: Entry; pacienteId: string }) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <li>
        <EvolucionForm pacienteId={pacienteId} entry={e} onCancel={() => setEditing(false)} />
      </li>
    )
  }

  return (
    <li className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
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
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-gray-400 hover:text-vimet-orange"
            aria-label="Editar"
          >
            <Pencil className="size-4" />
          </button>
          <form action={eliminarEntradaEvolucionAction}>
            <input type="hidden" name="id" value={e.id} />
            <input type="hidden" name="paciente_id" value={pacienteId} />
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
  )
}
