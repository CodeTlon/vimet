'use client'

import { UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useState } from 'react'

import { crearPacienteGestionadoAction, type CrearPacienteState } from '@/actions/staff'
import { Modal } from '@/components/ui/modal'

const initial: CrearPacienteState = {}

export function CrearPacienteButton() {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState(crearPacienteGestionadoAction, initial)
  const router = useRouter()

  useEffect(() => {
    if (state.ok && state.id) {
      setOpen(false)
      router.push(`/admin/pacientes/${state.id}`)
    }
  }, [state, router])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-vimet-orange hover:bg-vimet-red px-3.5 py-1.5 rounded-full shadow-sm transition-colors"
      >
        <UserPlus className="size-4" /> Nuevo paciente
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo paciente">
        <form action={action} className="space-y-4">
          <p className="text-sm text-gray-500">
            Para pacientes que no van a usar la web ellos mismos (adultos mayores, dificultad de acceso, etc.).
            Cargá sus datos y gestionás todo desde acá — el paciente no necesita iniciar sesión.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                name="nombre"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
              <input
                name="apellido"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
            <input
              name="telefono"
              type="tel"
              required
              placeholder="Para contactarlo por WhatsApp"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email (opcional)</label>
            <input
              name="email"
              type="email"
              placeholder="Si no tiene, dejar en blanco"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-vimet-orange px-5 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-vimet-red transition-colors"
          >
            {pending ? 'Creando…' : 'Crear paciente'}
          </button>
          {state.error ? <p className="text-sm text-vimet-red">{state.error}</p> : null}
        </form>
      </Modal>
    </>
  )
}
