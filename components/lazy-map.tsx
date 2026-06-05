'use client'

import { MapPin } from 'lucide-react'
import { useState } from 'react'

/**
 * Mapa de Google que no carga el iframe hasta que el usuario hace click.
 * El iframe de Maps es pesado y bloquea la carga inicial; con esto la página
 * pinta al instante y el mapa se monta solo si el visitante lo pide.
 */
export function LazyMap({
  src,
  title,
  height = 400,
}: {
  src: string
  title: string
  height?: number
}) {
  const [show, setShow] = useState(false)

  if (show) {
    return (
      <iframe
        title={title}
        src={src}
        width="100%"
        height={height}
        loading="lazy"
        allowFullScreen
        className="rounded-xl border-0 block w-full"
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setShow(true)}
      style={{ height }}
      aria-label={`Cargar ${title}`}
      className="group relative w-full overflow-hidden rounded-xl bg-vimet-sand flex flex-col items-center justify-center gap-3 text-gray-700 hover:bg-vimet-cream transition-colors"
    >
      <span className="inline-flex size-14 items-center justify-center rounded-full bg-vimet-gradient text-white shadow-md group-hover:scale-105 transition-transform">
        <MapPin className="size-6" />
      </span>
      <span className="font-medium">Ver mapa</span>
      <span className="text-xs text-gray-500">Instituto VIANETT · Córdoba</span>
    </button>
  )
}
