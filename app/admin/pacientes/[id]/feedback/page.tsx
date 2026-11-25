import { Paperclip } from 'lucide-react'

import { Pagination } from '@/components/pagination'
import { requireStaff } from '@/lib/auth/session'
import { FeedbackChat } from '@/components/seguimiento/feedback-chat'
import { pageRange, parsePage, totalPages as calcTotalPages } from '@/lib/pagination'
import { desc, eq, sql } from 'drizzle-orm'

import { feedback_semanal as tabla } from '@/db/schema'
import { mensajesDeFeedback } from '@/lib/data/feedback'
import { db } from '@/lib/db'
import { urlFirmada } from '@/lib/storage/disk'
import { formatearFechaCorta, lunesDeSemana } from '@/lib/seguimiento'
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

export default async function FeedbackPacientePage(
  props: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ page?: string }>
  }
) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const { user } = await requireStaff()

  const page = parsePage(searchParams?.page)
  const [from, to] = pageRange(page)
  const [feedback, [{ total }]] = await Promise.all([
    db
      .select({
        id: tabla.id,
        semana_inicio: tabla.semana_inicio,
        estado_fisico: tabla.estado_fisico,
        animo: tabla.animo,
        energia: tabla.energia,
        adherencia_entrenamiento: tabla.adherencia_entrenamiento,
        adherencia_alimentacion: tabla.adherencia_alimentacion,
        peso_autoreporte_kg: tabla.peso_autoreporte_kg,
        observaciones: tabla.observaciones,
        dudas: tabla.dudas,
        respuesta_profesional: tabla.respuesta_profesional,
        respondido_at: tabla.respondido_at,
        adjunto_path: tabla.adjunto_path,
      })
      .from(tabla)
      .where(eq(tabla.paciente_id, params.id))
      .orderBy(desc(tabla.semana_inicio))
      .limit(to - from + 1)
      .offset(from),
    db.select({ total: sql<number>`count(*)::int` }).from(tabla).where(eq(tabla.paciente_id, params.id)),
  ]) as [Feedback[], { total: number }[]]
  const pages = calcTotalPages(total)
  const semanaActual = lunesDeSemana()

  const mensajesPorFeedback = await mensajesDeFeedback(feedback.map((f) => f.id))

  // URLs firmadas para adjuntos de feedback (1 hora de vigencia)
  const feedbackConUrl = await Promise.all(
    feedback.map(async (f) => ({
      ...f,
      adjuntoUrl: f.adjunto_path ? await urlFirmada('recursos', f.adjunto_path, 3600) : null,
    })),
  )

  return (
    <div className="space-y-4">
      {feedbackConUrl.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <p className="text-sm text-gray-700">Aún no se recibió feedback semanal.</p>
        </div>
      ) : (
        feedbackConUrl.map((f) => {
          const mensajes = mensajesPorFeedback.get(f.id) ?? []
          const abierto  = f.semana_inicio === semanaActual

          return (
            <article
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

              {/* Semanas de antes de este chat: dudas/respuesta quedaron como texto fijo */}
              {mensajes.length === 0 && (f.dudas || f.respuesta_profesional) ? (
                <div className="mt-4 space-y-3">
                  {f.dudas ? (
                    <div className="rounded-xl bg-vimet-cream border border-vimet-orange/20 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-vimet-red mb-1 font-semibold">
                        Dudas del paciente
                      </p>
                      <p className="text-sm text-gray-800 whitespace-pre-line">{f.dudas}</p>
                    </div>
                  ) : null}
                  {f.respuesta_profesional ? (
                    <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide font-semibold text-blue-700 mb-1">
                        Tu respuesta
                      </p>
                      <p className="text-sm text-gray-800 whitespace-pre-line">
                        {f.respuesta_profesional}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-4">
                  {user ? (
                    <FeedbackChat
                      feedbackId={f.id}
                      mensajes={mensajes}
                      currentUserId={user.id}
                      pacienteId={params.id}
                      abierto={abierto}
                    />
                  ) : null}
                </div>
              )}
            </article>
          )
        })
      )}

      <Pagination
        page={page}
        totalPages={pages}
        makeHref={(p) => `/admin/pacientes/${params.id}/feedback?page=${p}`}
      />
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
