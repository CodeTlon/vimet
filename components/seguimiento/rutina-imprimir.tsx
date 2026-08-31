import { EjercicioYoutubeThumbnail } from '@/components/seguimiento/ejercicio-youtube-thumbnail'
import type { RutinaEjercicio } from '@/components/seguimiento/rutina-viewer'
import { DIA_LABEL, ORDEN_DIAS, resumenCardio, resumenFuerza } from '@/lib/seguimiento'

function EjercicioImprimirCard({ r, idx, resumen }: { r: RutinaEjercicio; idx: number; resumen: string }) {
  const youtubeUrl = r.ejercicio?.youtube_url
  return (
    <div className="print:break-inside-avoid flex items-start gap-4 rounded-xl border border-gray-100 p-4">
      {youtubeUrl ? (
        <EjercicioYoutubeThumbnail
          url={youtubeUrl}
          alt={r.ejercicio?.nombre ?? ''}
          className="size-24 rounded-md shrink-0"
        />
      ) : r.ejercicio?.imagen_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={r.ejercicio.imagen_url}
          alt={r.ejercicio.nombre}
          className="size-24 rounded-md object-cover shrink-0 bg-gray-100"
        />
      ) : (
        <div className="size-24 rounded-md bg-gray-100 shrink-0" />
      )}
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-semibold text-gray-900">
          {idx + 1}. {r.ejercicio?.nombre}
        </p>
        <p className="text-xs text-gray-600">{resumen}</p>
        {r.notas ? <p className="text-xs text-gray-500">{r.notas}</p> : null}
        {r.ejercicio?.instrucciones ? (
          <p className="text-xs text-gray-400 whitespace-pre-line">{r.ejercicio.instrucciones}</p>
        ) : null}
      </div>
    </div>
  )
}

export function RutinaImprimir({
  rutina,
  diasDescanso,
}: {
  rutina: RutinaEjercicio[]
  diasDescanso: string[]
}) {
  const diasConContenido = ORDEN_DIAS.filter(
    (dia) => rutina.some((r) => (r.dia_semana ?? '') === dia) || diasDescanso.includes(dia),
  )
  const atribucion = rutina.find((r) => r.ejercicio?.atribucion)?.ejercicio?.atribucion

  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
      <h2 className="font-heading text-lg font-semibold text-gray-900 mb-4">Rutina de ejercicios</h2>
      <div className="space-y-6">
        {diasConContenido.map((dia, diaIdx) => {
          const itemsDia = rutina.filter((r) => (r.dia_semana ?? '') === dia)
          const fuerzaDia = itemsDia.filter((r) => r.ejercicio?.modo !== 'cardio')
          const cardioDia = itemsDia.filter((r) => r.ejercicio?.modo === 'cardio')
          return (
            <div key={dia || 'general'} className={diaIdx > 0 ? 'print:break-before-page' : ''}>
              <h3 className="font-heading font-semibold text-gray-900 mb-3">{DIA_LABEL[dia] ?? 'General'}</h3>
              {diasDescanso.includes(dia) ? (
                <p className="text-sm text-gray-500">Día de descanso.</p>
              ) : (
                <>
                  {fuerzaDia.length > 0 ? (
                    <div className={cardioDia.length > 0 ? 'mb-5' : ''}>
                      {cardioDia.length > 0 ? (
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Fuerza</h4>
                      ) : null}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {fuerzaDia.map((r, idx) => (
                          <EjercicioImprimirCard key={r.id} r={r} idx={idx} resumen={resumenFuerza(r)} />
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {cardioDia.length > 0 ? (
                    <div>
                      {fuerzaDia.length > 0 ? (
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Cardio</h4>
                      ) : null}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {cardioDia.map((r, idx) => (
                          <EjercicioImprimirCard key={r.id} r={r} idx={idx} resumen={resumenCardio(r) ?? '—'} />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          )
        })}
      </div>
      {atribucion ? <p className="mt-4 text-xs text-gray-400">{atribucion}</p> : null}
    </section>
  )
}
