'use client'

import { useRef, useState } from 'react'
import { useActionState } from 'react'

import { eliminarPacienteAction, type StaffState } from '@/actions/staff'
import { useAutoHideMessage } from '@/components/seguimiento/use-reset-on-success'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

const initial: StaffState = {}

export function PacienteDeleteButton({ id, nombre }: { id: string; nombre: string }) {
  const [state, action] = useActionState(eliminarPacienteAction, initial)
  const visible = useAutoHideMessage(state)
  const formRef = useRef<HTMLFormElement>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <div>
      <form ref={formRef} action={action}>
        <input type="hidden" name="id" value={id} />
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="text-xs font-medium text-gray-400 hover:text-vimet-red transition-colors"
        >
          Eliminar
        </button>
      </form>
      {visible && state.error ? <p className="mt-1 text-xs text-vimet-red">{state.error}</p> : null}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false)
          formRef.current?.requestSubmit()
        }}
        title="Eliminar paciente"
        description={`¿Eliminar definitivamente a ${nombre}? Se borran su ficha, mediciones, planes, turnos y todo su historial. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
      />
    </div>
  )
}
