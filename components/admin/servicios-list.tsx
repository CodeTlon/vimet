'use client'

import { useState } from 'react'

import type { ContenidoState } from '@/actions/contenido'
import { ServicioForm, type ServicioDefaults } from '@/components/admin/servicio-form'

const TIPO_LABEL: Record<string, string> = {
  nutricion: 'Nutrición',
  entrenamiento: 'Entrenamiento',
  combo: 'Plan Integral',
}

type Servicio = ServicioDefaults & { id: number; nombre: string; tipo: string; duracion_minutos: number; activo: boolean }

export function ServiciosList({
  servicios,
  profesionales,
  actualizarAction,
  toggleAction,
}: {
  servicios: Servicio[]
  profesionales: { id: string; nombre: string }[]
  actualizarAction: (prev: ContenidoState, formData: FormData) => Promise<ContenidoState>
  toggleAction: (formData: FormData) => void | Promise<void>
}) {
  const [editingId, setEditingId] = useState<number | null>(null)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <ul className="divide-y divide-gray-100">
        {servicios.map((s) => (
          <li key={s.id} className={s.activo ? '' : 'bg-gray-50'}>
            {editingId === s.id ? (
              <div className="p-4 space-y-2">
                <ServicioForm
                  action={actualizarAction}
                  servicio={s}
                  profesionales={profesionales}
                  submitLabel="Guardar cambios"
                />
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="text-xs font-medium text-gray-500 hover:text-gray-800"
                >
                  Cerrar edición
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium text-gray-900">
                    {s.nombre}
                    {!s.activo ? (
                      <span className="ml-2 text-xs font-medium text-gray-400">(inactivo)</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {TIPO_LABEL[s.tipo] ?? s.tipo} · {s.duracion_minutos} min
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingId(s.id)}
                    className="text-sm font-semibold text-vimet-orange hover:underline"
                  >
                    Editar
                  </button>
                  <form action={toggleAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="activo" value={String(s.activo)} />
                    <button
                      type="submit"
                      className="text-xs font-medium text-gray-500 hover:text-vimet-red"
                    >
                      {s.activo ? 'Desactivar' : 'Reactivar'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
