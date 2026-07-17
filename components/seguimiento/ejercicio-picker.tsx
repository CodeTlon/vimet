'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'

export type EjercicioCatalogo = {
  id: number
  nombre: string
  parte_cuerpo: string | null
  equipo: string | null
  musculo_principal: string | null
  imagen_url: string | null
}

export function EjercicioPicker({
  catalogo,
  onAgregar,
}: {
  catalogo: EjercicioCatalogo[]
  onAgregar: (ejercicio: EjercicioCatalogo) => void
}) {
  const [q, setQ] = useState('')
  const [parte, setParte] = useState('')
  const [equipo, setEquipo] = useState('')

  const partes = useMemo(
    () => Array.from(new Set(catalogo.map((e) => e.parte_cuerpo).filter(Boolean))).sort() as string[],
    [catalogo],
  )
  const equipos = useMemo(
    () => Array.from(new Set(catalogo.map((e) => e.equipo).filter(Boolean))).sort() as string[],
    [catalogo],
  )

  const resultados = useMemo(() => {
    const term = q.trim().toLowerCase()
    return catalogo
      .filter((e) => !term || e.nombre.toLowerCase().includes(term))
      .filter((e) => !parte || e.parte_cuerpo === parte)
      .filter((e) => !equipo || e.equipo === equipo)
      .slice(0, 40)
  }, [catalogo, q, parte, equipo])

  const inputBase = 'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange'

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar ejercicio..."
          className={inputBase}
        />
        <select value={parte} onChange={(e) => setParte(e.target.value)} className={inputBase}>
          <option value="">Toda parte del cuerpo</option>
          {partes.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select value={equipo} onChange={(e) => setEquipo(e.target.value)} className={inputBase}>
          <option value="">Todo equipo</option>
          {equipos.map((eq) => (
            <option key={eq} value={eq}>{eq}</option>
          ))}
        </select>
      </div>

      <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-100 divide-y divide-gray-100">
        {resultados.length === 0 ? (
          <p className="p-3 text-sm text-gray-500">Sin resultados.</p>
        ) : (
          resultados.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => onAgregar(e)}
              className="w-full flex items-center gap-3 p-2 text-left hover:bg-gray-50"
            >
              {e.imagen_url ? (
                <Image
                  src={e.imagen_url}
                  alt=""
                  width={40}
                  height={40}
                  unoptimized
                  className="size-10 rounded-md object-cover shrink-0"
                />
              ) : (
                <div className="size-10 rounded-md bg-gray-100 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{e.nombre}</p>
                <p className="text-xs text-gray-500 truncate">
                  {[e.parte_cuerpo, e.equipo].filter(Boolean).join(' · ')}
                </p>
              </div>
              <span className="text-xs font-medium text-vimet-orange shrink-0">Agregar</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
