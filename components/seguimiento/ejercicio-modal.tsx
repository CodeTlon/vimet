'use client'

import Image from 'next/image'

import { Modal } from '@/components/ui/modal'

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
  return (
    <Modal open={!!ejercicio} onClose={onClose} title={ejercicio?.nombre ?? 'Ejercicio'}>
      {ejercicio ? (
        <div>
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
    </Modal>
  )
}
