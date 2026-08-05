'use client'

import { Trash2 } from 'lucide-react'
import { useActionState } from 'react'

import { eliminarEjercicioCustomAction, type EjercicioCustomState } from '@/actions/ejercicios'
import { useAutoHideMessage } from '@/components/seguimiento/use-reset-on-success'

const initial: EjercicioCustomState = {}

export function EjercicioDeleteButton({ id }: { id: number }) {
  const [state, action] = useActionState(eliminarEjercicioCustomAction, initial)
  const visible = useAutoHideMessage(state)

  return (
    <div className="shrink-0">
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          title="Eliminar"
          className="p-1 rounded-lg text-vimet-red hover:bg-vimet-red/10 transition-colors"
        >
          <Trash2 className="size-4" />
        </button>
      </form>
      {visible && state.error ? (
        <p className="mt-1 text-xs text-vimet-red max-w-[10rem] text-right">{state.error}</p>
      ) : null}
    </div>
  )
}
