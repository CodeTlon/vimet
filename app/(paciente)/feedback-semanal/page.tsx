import { CheckCheck, ClipboardList, FileText, Lock, Paperclip } from 'lucide-react'
import Link from 'next/link'

import { FeedbackChat, type MensajeFeedback } from '@/components/seguimiento/feedback-chat'
import { FeedbackForm } from '@/components/seguimiento/feedback-form'
import { createClient } from '@/lib/supabase/server'
import { formatearFechaCorta, lunesDeSemana } from '@/lib/seguimiento'

export const metadata = { title: 'Feedback semanal' }
export const dynamic  = 'force-dynamic'

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

export default async function FeedbackSemanalPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const semana = lunesDeSemana()

  const [{ data: actual }, { data: historicoRaw }, { data: ficha }, { count: planesVigentes }] =
    await Promise.all([
      supabase
        .from('feedback_semanal')
        .select('*')
        .eq('paciente_id', user.id)
        .eq('semana_inicio', semana)
        .maybeSingle(),
      supabase
        .from('feedback_semanal')
        .select(
          'id, semana_inicio, estado_fisico, animo, energia, adherencia_entrenamiento, adherencia_alimentacion, peso_autoreporte_kg, observaciones, dudas, respuesta_profesional, respondido_at, adjunto_path',
        )
        .eq('paciente_id', user.id)
        .neq('semana_inicio', semana)
        .order('semana_inicio', { ascending: false })
        .limit(8),
      supabase
        .from('fichas_paciente')
        .select('paciente_id')
        .eq('paciente_id', user.id)
        .maybeSingle(),
      supabase
        .from('planes')
        .select('id', { count: 'exact', head: true })
        .eq('paciente_id', user.id)
        .eq('estado', 'vigente'),
    ])

  const tieneFicha = Boolean(ficha)
  const tienePlan  = (planesVigentes ?? 0) > 0
  const habilitado = tieneFicha && tienePlan

  // URL firmada del adjunto de la semana actual (si existe)
  const adjuntoUrlActual =
    actual?.adjunto_path
      ? (
          await supabase.storage
            .from('recursos')
            .createSignedUrl(actual.adjunto_path, 3600)
        ).data?.signedUrl ?? null
      : null

  // URLs firmadas de adjuntos del histórico
  const historico: (Feedback & { adjuntoUrl: string | null })[] = await Promise.all(
    ((historicoRaw ?? []) as Feedback[]).map(async (f) => {
      if (!f.adjunto_path) return { ...f, adjuntoUrl: null }
      const { data: signed } = await supabase.storage
        .from('recursos')
        .createSignedUrl(f.adjunto_path, 3600)
      return { ...f, adjuntoUrl: signed?.signedUrl ?? null }
    }),
  )

  const feedbackIds = [actual?.id, ...historico.map((f) => f.id)].filter(
    (id): id is number => id != null,
  )
  const { data: mensajesData } = feedbackIds.length
    ? await supabase
        .from('feedback_mensajes')
        .select('id, feedback_id, autor_id, contenido, created_at, edited_at')
        .in('feedback_id', feedbackIds)
        .order('id', { ascending: true })
    : { data: [] }

  const mensajesPorFeedback = new Map<number, MensajeFeedback[]>()
  for (const m of mensajesData ?? []) {
    const arr = mensajesPorFeedback.get(m.feedback_id) ?? []
    arr.push(m)
    mensajesPorFeedback.set(m.feedback_id, arr)
  }

  return (
    <>
      <header className="mb-6">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900">
          Feedback semanal
        </h1>
        <p className="text-gray-700 mt-1">
          Contanos cómo te fue esta semana — semana del{' '}
          <strong>{formatearFechaCorta(semana)}</strong>.
        </p>
      </header>

      {habilitado ? (
        actual ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 rounded-lg bg-vimet-cream border border-vimet-orange/20 px-4 py-3 text-sm text-gray-800">
              <CheckCheck className="size-4 text-vimet-orange shrink-0" />
              Ya enviaste tu feedback de esta semana. Vas a poder cargar el próximo el lunes que viene.
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <Stat label="Estado físico" value={actual.estado_fisico} suffix="/10" />
              <Stat label="Ánimo" value={actual.animo} suffix="/10" />
              <Stat label="Energía" value={actual.energia} suffix="/10" />
              <Stat
                label="Peso"
                value={actual.peso_autoreporte_kg}
                suffix={actual.peso_autoreporte_kg ? 'kg' : ''}
              />
            </div>

            {actual.observaciones ? (
              <p className="text-sm text-gray-800 whitespace-pre-line">{actual.observaciones}</p>
            ) : null}

            {adjuntoUrlActual ? (
              <a
                href={adjuntoUrlActual}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-vimet-orange hover:underline"
              >
                <Paperclip className="size-3.5" /> Ver adjunto de esta semana
              </a>
            ) : null}

            <FeedbackChat
              feedbackId={actual.id}
              mensajes={mensajesPorFeedback.get(actual.id) ?? []}
              currentUserId={user.id}
              pacienteId={user.id}
              abierto
            />
          </div>
        ) : (
          <FeedbackForm />
        )
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-vimet-cream p-3 text-vimet-orange shrink-0">
              <Lock className="size-6" />
            </div>
            <div className="flex-1">
              <h2 className="font-heading text-xl font-semibold text-gray-900">
                Tu feedback se habilita en cuanto tengas tu plan
              </h2>
              <p className="text-sm text-gray-700 mt-1.5">
                Para que el feedback sea útil necesitamos tu ficha clínica completa y al menos un
                plan vigente. Tu equipo está terminando de armarlo.
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center justify-center size-6 rounded-full ${
                      tieneFicha ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    <ClipboardList className="size-3.5" />
                  </span>
                  <span className={tieneFicha ? 'text-gray-700' : 'text-gray-900 font-medium'}>
                    Ficha clínica cargada {tieneFicha ? '✓' : '— pendiente'}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center justify-center size-6 rounded-full ${
                      tienePlan ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    <FileText className="size-3.5" />
                  </span>
                  <span className={tienePlan ? 'text-gray-700' : 'text-gray-900 font-medium'}>
                    Plan vigente {tienePlan ? '✓' : '— pendiente'}
                  </span>
                </li>
              </ul>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/contacto"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-vimet-gradient text-white font-semibold text-sm shadow-sm hover:shadow-md transition-all"
                >
                  Contactar al equipo
                </Link>
                <Link
                  href="/mi-ficha"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 text-gray-800 font-semibold text-sm hover:border-vimet-orange/40 hover:text-vimet-orange transition-colors"
                >
                  Ver mi ficha
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {historico.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-heading text-xl font-semibold text-gray-900 mb-4">
            Semanas anteriores
          </h2>
          <ul className="space-y-3">
            {historico.map((f) => {
              const mensajes = mensajesPorFeedback.get(f.id) ?? []
              return (
                <li
                  key={f.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
                >
                  <header className="mb-3">
                    <h3 className="font-heading font-semibold text-gray-900">
                      Semana del {formatearFechaCorta(f.semana_inicio)}
                    </h3>
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
                  </div>

                  {f.observaciones ? (
                    <p className="text-sm text-gray-800 whitespace-pre-line mt-3">
                      {f.observaciones}
                    </p>
                  ) : null}

                  {/* Adjunto del paciente */}
                  {f.adjuntoUrl ? (
                    <div className="mt-3">
                      <a
                        href={f.adjuntoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-vimet-orange hover:underline"
                      >
                        <Paperclip className="size-3.5" /> Ver adjunto de esta semana
                      </a>
                    </div>
                  ) : null}

                  {mensajes.length > 0 ? (
                    <div className="mt-3">
                      <FeedbackChat
                        feedbackId={f.id}
                        mensajes={mensajes}
                        currentUserId={user.id}
                        pacienteId={user.id}
                        abierto={false}
                      />
                    </div>
                  ) : f.respuesta_profesional ? (
                    <div className="mt-3 rounded-xl bg-vimet-cream border border-vimet-orange/20 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide font-semibold text-vimet-red mb-1">
                        Respuesta de tu equipo
                      </p>
                      <p className="text-sm text-gray-800 whitespace-pre-line">
                        {f.respuesta_profesional}
                      </p>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </>
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
