'use client'

import { useActionState } from 'react'

import { eliminarPacienteAction, type StaffState } from '@/actions/staff'
import { useAutoHideMessage } from '@/components/seguimiento/use-reset-on-success'

const initial: StaffState = {}

export function PacienteDeleteButton({ id, nombre }: { id: string; nombre: string }) {
  const [state, action] = useActionState(eliminarPacienteAction, initial)
  const visible = useAutoHideMessage(state)

  return (
    <div>
      <form
        action={action}
        onSubmit={(e) => {
          const ok = confirm(
            `¿Eliminar definitivamente a ${nombre}? Se borran su ficha, mediciones, planes, turnos y todo su historial. Esta acción no se puede deshacer.`,
          )
          if (!ok) e.preventDefault()
        }}
      >
        <input type="hidden" name="id" value={id} />
        <button type="submit" className="text-xs font-medium text-gray-400 hover:text-vimet-red transition-colors">
          Eliminar
        </button>
      </form>
      {visible && state.error ? <p className="mt-1 text-xs text-vimet-red">{state.error}</p> : null}
    </div>
  )
}
