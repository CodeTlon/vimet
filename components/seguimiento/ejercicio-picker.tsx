'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

export type EjercicioResultado = {
  id: number
  nombre: string
  parte_cuerpo: string | null
  equipo: string | null
  imagen_url: string | null
  gif_url: string | null
  instrucciones: string | null
}

export function EjercicioPicker({
  partes,
  equipos,
  onAgregar,
}: {
  partes: string[]
  equipos: string[]
  onAgregar: (ejercicio: EjercicioResultado) => void
}) {
  const [q, setQ] = useState('')
  const [parte, setParte] = useState('')
  const [equipo, setEquipo] = useState('')
  const [resultados, setResultados] = useState<EjercicioResultado[]>([])
  const [cargando, setCargando] = useState(false)

  // Sin búsqueda ni filtro no se trae nada — evita bajar el catálogo entero.
  useEffect(() => {
    if (!q.trim() && !parte && !equipo) {
      setResultados([])
      return
    }
    const controller = new AbortController()
    setCargando(true)
    const timer = setTimeout(() => {
      const params = new URLSearchParams()
      if (q.trim()) params.set('q', q.trim())
      if (parte) params.set('parte', parte)
      if (equipo) params.set('equipo', equipo)
      fetch(`/api/ejercicios?${params.toString()}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((json) => setResultados(json.data ?? []))
        .catch(() => {})
        .finally(() => setCargando(false))
    }, 300)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [q, parte, equipo])

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
        {cargando ? (
          <p className="p-3 text-sm text-gray-500">Buscando...</p>
        ) : resultados.length === 0 ? (
          <p className="p-3 text-sm text-gray-500">
            {q.trim() || parte || equipo ? 'Sin resultados.' : 'Escribí para buscar en el catálogo.'}
          </p>
        ) : (
          resultados.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => onAgregar(e)}
              className="group w-full flex items-center gap-3 p-2 text-left hover:bg-gray-50"
            >
              {e.imagen_url ? (
                <span className="relative size-16 lg:size-24 rounded-md overflow-hidden shrink-0 bg-gray-100">
                  <Image
                    src={e.imagen_url}
                    alt=""
                    width={96}
                    height={96}
                    unoptimized
                    className="absolute inset-0 size-full object-cover transition-opacity group-hover:opacity-0"
                  />
                  {e.gif_url ? (
                    <Image
                      src={e.gif_url}
                      alt=""
                      width={96}
                      height={96}
                      unoptimized
                      className="absolute inset-0 size-full object-cover opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  ) : null}
                </span>
              ) : (
                <div className="size-16 lg:size-24 rounded-md bg-gray-100 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{e.nombre}</p>
                <p className="text-xs text-gray-500 truncate">
                  {[e.parte_cuerpo, e.equipo].filter(Boolean).join(' · ')}
                </p>
                {e.instrucciones ? (
                  <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">{e.instrucciones}</p>
                ) : null}
              </div>
              <span className="text-xs font-medium text-vimet-orange shrink-0">Agregar</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
