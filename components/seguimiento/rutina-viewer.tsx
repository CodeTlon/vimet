'use client'

import Image from 'next/image'
import { useState } from 'react'

import { EjercicioModal, type EjercicioDetalle } from '@/components/seguimiento/ejercicio-modal'

const DIA_LABEL: Record<string, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
}
const ORDEN_DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo', '']

export type RutinaEjercicio = {
  id: number
  dia_semana: string | null
  series: number | null
  repeticiones: string | null
  descanso_seg: number | null
  notas: string | null
  ejercicio: {
    nombre: string
    gif_url: string | null
    imagen_url: string | null
    atribucion: string | null
    instrucciones: string | null
  } | null
}

export function RutinaViewer({
  rutina,
  diasDescanso,
}: {
  rutina: RutinaEjercicio[]
  diasDescanso: string[]
}) {
  const diasConContenido = ORDEN_DIAS.filter(
    (dia) => rutina.some((r) => (r.dia_semana ?? '') === dia) || diasDescanso.includes(dia),
  )
  const [diaActivo, setDiaActivo] = useState(diasConContenido[0] ?? 'lunes')
  const [ejercicioAbierto, setEjercicioAbierto] = useState<EjercicioDetalle | null>(null)
  const atribucion = rutina.find((r) => r.ejercicio?.atribucion)?.ejercicio?.atribucion

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5 print:break-inside-avoid">
      <h2 className="font-heading text-lg font-semibold text-gray-900 mb-4">Rutina de ejercicios</h2>

      <div className="flex flex-wrap gap-1.5 mb-4 print:hidden">
        {diasConContenido.map((dia) => (
          <button
            key={dia || 'general'}
            type="button"
            onClick={() => setDiaActivo(dia)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              diaActivo === dia
                ? 'bg-vimet-orange text-white border-vimet-orange'
                : 'bg-white text-gray-700 border-gray-200 hover:border-vimet-orange/40'
            }`}
          >
            {DIA_LABEL[dia] ?? 'General'}
          </button>
        ))}
      </div>

      <div className="space-y-5">
        {diasConContenido.map((dia, diaIdx) => (
          <div
            key={dia || 'general'}
            className={`${dia === diaActivo ? '' : 'hidden'} print:block ${diaIdx > 0 ? 'print:mt-5 print:break-before-page' : ''}`}
          >
            <h3 className="font-heading font-semibold text-gray-900 mb-2 hidden print:block">
              {DIA_LABEL[dia] ?? 'General'}
            </h3>
            {diasDescanso.includes(dia) ? (
              <p className="text-sm text-gray-500">Día de descanso.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {rutina
                  .filter((r) => (r.dia_semana ?? '') === dia)
                  .map((r, idx) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() =>
                        r.ejercicio &&
                        setEjercicioAbierto({
                          nombre: r.ejercicio.nombre,
                          gif_url: r.ejercicio.gif_url,
                          imagen_url: r.ejercicio.imagen_url,
                          instrucciones: r.ejercicio.instrucciones,
                        })
                      }
                      className="group flex items-center gap-4 rounded-lg border border-gray-100 p-3 text-left hover:border-vimet-orange/40"
                    >
                      {r.ejercicio?.imagen_url || r.ejercicio?.gif_url ? (
                        <span className="relative size-24 lg:size-36 print:size-40 rounded-md overflow-hidden shrink-0 bg-gray-100">
                          {r.ejercicio.imagen_url ? (
                            <Image
                              src={r.ejercicio.imagen_url}
                              alt={r.ejercicio.nombre}
                              width={144}
                              height={144}
                              unoptimized
                              className="absolute inset-0 size-full object-cover transition-opacity group-hover:opacity-0"
                            />
                          ) : null}
                          {r.ejercicio.gif_url ? (
                            <Image
                              src={r.ejercicio.gif_url}
                              alt={r.ejercicio.nombre}
                              width={144}
                              height={144}
                              unoptimized
                              className="absolute inset-0 size-full object-cover opacity-0 transition-opacity group-hover:opacity-100 print:hidden"
                            />
                          ) : null}
                        </span>
                      ) : (
                        <div className="size-24 lg:size-36 print:size-40 rounded-md bg-gray-100 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {idx + 1}. {r.ejercicio?.nombre}
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {[
                            r.series ? `${r.series} series` : null,
                            r.repeticiones ? `${r.repeticiones} reps` : null,
                            r.descanso_seg ? `${r.descanso_seg}s descanso` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </p>
                        {r.notas ? <p className="text-xs text-gray-500 mt-0.5">{r.notas}</p> : null}
                        {r.ejercicio?.instrucciones ? (
                          <p className="text-xs text-gray-400 line-clamp-3 print:line-clamp-6 mt-0.5">
                            {r.ejercicio.instrucciones}
                          </p>
                        ) : null}
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {atribucion ? <p className="mt-4 text-xs text-gray-400">{atribucion}</p> : null}

      <EjercicioModal ejercicio={ejercicioAbierto} onClose={() => setEjercicioAbierto(null)} />
    </section>
  )
}
