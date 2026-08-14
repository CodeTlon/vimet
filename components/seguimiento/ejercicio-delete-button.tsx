'use client'

import { Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { useActionState } from 'react'

import { eliminarEjercicioCustomAction, type EjercicioCustomState } from '@/actions/ejercicios'
import { useAutoHideMessage } from '@/components/seguimiento/use-reset-on-success'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

const initial: EjercicioCustomState = {}

export function EjercicioDeleteButton({ id }: { id: number }) {
  const [state, action, pending] = useActionState(eliminarEjercicioCustomAction, initial)
  const visible = useAutoHideMessage(state)
  const formRef = useRef<HTMLFormElement>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <div className="shrink-0">
      <form ref={formRef} action={action}>
        <input type="hidden" name="id" value={id} />
        <button
          type="button"
          title="Eliminar"
          onClick={() => setConfirmOpen(true)}
          className="p-1 rounded-lg text-vimet-red hover:bg-vimet-red/10 transition-colors"
        >
          <Trash2 className="size-4" />
        </button>
      </form>
      {visible && state.error ? (
        <p className="mt-1 text-xs text-vimet-red max-w-[10rem] text-right">{state.error}</p>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false)
          formRef.current?.requestSubmit()
        }}
        pending={pending}
        title="Eliminar ejercicio"
        description="Esta acción no se puede deshacer. Si el ejercicio está siendo usado en algún plan, no se va a poder borrar."
        confirmLabel="Eliminar"
      />
    </div>
  )
}
