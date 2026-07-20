'use client'

import { X } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useRef } from 'react'

export type EjercicioDetalle = {
  nombre: string
  gif_url: string | null
  imagen_url: string | null
  instrucciones: string | null
}

export function EjercicioModal({
  ejercicio,
  onClose,
}: {
  ejercicio: EjercicioDetalle | null
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (ejercicio && !dialog.open) dialog.showModal()
    if (!ejercicio && dialog.open) dialog.close()
  }, [ejercicio])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className="backdrop:bg-black/60 rounded-2xl p-0 w-full max-w-lg m-auto print:hidden"
    >
      {ejercicio ? (
        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="font-heading text-lg font-semibold text-gray-900">{ejercicio.nombre}</h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 shrink-0"
              aria-label="Cerrar"
            >
              <X className="size-5" />
            </button>
          </div>
          {ejercicio.gif_url || ejercicio.imagen_url ? (
            <div className="relative w-56 sm:w-64 mx-auto aspect-square rounded-xl overflow-hidden bg-gray-100 mb-3">
              <Image
                src={ejercicio.gif_url ?? ejercicio.imagen_url ?? ''}
                alt={ejercicio.nombre}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          ) : null}
          {ejercicio.instrucciones ? (
            <p className="text-sm text-gray-700 whitespace-pre-line">{ejercicio.instrucciones}</p>
          ) : (
            <p className="text-sm text-gray-400">Sin descripción cargada.</p>
          )}
        </div>
      ) : null}
    </dialog>
  )
}
