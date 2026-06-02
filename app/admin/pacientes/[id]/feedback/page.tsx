import { CheckCheck, MessageCircleQuestion, Paperclip } from 'lucide-react'

import { ResponderFeedbackForm } from '@/components/seguimiento/responder-feedback-form'
import { createClient } from '@/lib/supabase/server'
import { formatearFechaCorta } from '@/lib/seguimiento'

export const dynamic = 'force-dynamic'

type Feedback = {
  id: number
  semana_inicio: string
  estado_fisico: number | null
  animo: number | null
  energia: number | null
  adherencia_entrenamiento: number | null
  adherencia_alimentacion: number | null
  peso_autoreporte_kg: number | null
  observaciones: string | null
  dudas: string | null
  respuesta_profesional: string | null
  respondido_at: string | null
  adjunto_path: string | null
}

export default async function FeedbackPacientePage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()
  const { data } = await supabase
    .from('feedback_semanal')
    .select(
      'id, semana_inicio, estado_fisico, animo, energia, adherencia_entrenamiento, adherencia_alimentacion, peso_autoreporte_kg, observaciones, dudas, respuesta_profesional, respondido_at, adjunto_path',
    )
    .eq('paciente_id', params.id)
    .order('semana_inicio', { ascending: false })

  const feedback = (data ?? []) as Feedback[]

  // URLs firmadas para adjuntos de feedback (1 hora de vigencia)
  const feedbackConUrl = await Promise.all(
    feedback.map(async (f) => {
      if (!f.adjunto_path) return { ...f, adjuntoUrl: null }
      const { data: signed } = await supabase.storage
        .from('recursos')
        .createSignedUrl(f.adjunto_path, 3600)
      return { ...f, adjuntoUrl: signed?.signedUrl ?? null }
    }),
  )

  return (
    <div className="space-y-4">
      {feedbackConUrl.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <p className="text-sm text-gray-700">Aún no se recibió feedback semanal.</p>
        </div>
      ) : (
        feedbackConUrl.map((f) => {
          const tieneDudas = Boolean(f.dudas?.trim())
          const respondido  = Boolean(f.respondido_at)
          return (
            <article
              key={f.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
            >
              <header className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-heading font-semibold text-gray-900">
                    Semana del {formatearFechaCorta(f.semana_inicio)}
                  </h3>
                </div>
                {tieneDudas ? (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      respondido
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {respondido ? (
                      <><CheckCheck className="size-3.5" /> Respondido</>
                    ) : (
                      <><MessageCircleQuestion className="size-3.5" /> Pendiente</>
                    )}
                  </span>
                ) : null}
              </header>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <Stat label="Estado físico" value={f.estado_fisico} suffix="/10" />
                <Stat label="Ánimo"         value={f.animo}         suffix="/10" />
                <Stat label="Energía"        value={f.energia}       suffix="/10" />
                <Stat
                  label="Peso"
                  value={f.peso_autoreporte_kg}
                  suffix={f.peso_autoreporte_kg ? 'kg' : ''}
                />
                <Stat
                  label="Adh. entreno"
                  value={f.adherencia_entrenamiento}
                  suffix={f.adherencia_entrenamiento != null ? '%' : ''}
                />
                <Stat
                  label="Adh. alimentación"
                  value={f.adherencia_alimentacion}
                  suffix={f.adherencia_alimentacion != null ? '%' : ''}
                />
              </div>

              {f.observaciones ? (
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                    Observaciones
                  </p>
                  <p className="text-sm text-gray-800 whitespace-pre-line">{f.observaciones}</p>
                </div>
              ) : null}

              {f.dudas ? (
                <div className="mt-4 rounded-xl bg-vimet-cream border border-vimet-orange/20 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-vimet-red mb-1 font-semibold">
                    Dudas del paciente
                  </p>
                  <p className="text-sm text-gray-800 whitespace-pre-line">{f.dudas}</p>
                </div>
              ) : null}

              {/* Adjunto del paciente */}
              {f.adjuntoUrl ? (
                <div className="mt-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-1.5">
                    Adjunto del paciente
                  </p>
                  <a
                    href={f.adjuntoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-vimet-orange hover:underline"
                  >
                    <Paperclip className="size-4" /> Ver archivo adjunto
                  </a>
                </div>
              ) : null}

              {tieneDudas ? (
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-1.5">
                    Respuesta profesional
                  </p>
                  <ResponderFeedbackForm
                    id={f.id}
                    pacienteId={params.id}
                    respuestaActual={f.respuesta_profesional}
                  />
                </div>
              ) : null}
            </article>
          )
        })
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  suffix = '',
}: {
  label:   string
  value:   number | null
  suffix?: string
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="font-heading font-semibold text-gray-900 mt-0.5">
        {value != null ? value : '—'}
        {value != null && suffix ? (
          <span className="text-xs text-gray-500 ml-1">{suffix}</span>
        ) : null}
      </p>
    </div>
  )
}
