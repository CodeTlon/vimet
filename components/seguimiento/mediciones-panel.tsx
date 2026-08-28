'use client'

import { Pencil, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { useActionState } from 'react';

import { eliminarMedicionAction, type MedicionState } from '@/actions/mediciones'
import { MedicionForm } from '@/components/seguimiento/medicion-form'
import { useAutoHideMessage } from '@/components/seguimiento/use-reset-on-success'
import { IsakDetalleModal } from '@/components/seguimiento/isak-detalle-modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { formatearFechaCorta } from '@/lib/seguimiento'

const initial: MedicionState = {}

type Medicion = {
  id: number
  fecha_medicion: string
  peso_kg: number | null
  talla_cm: number | null
  imc: number | null
  porc_grasa: number | null
  porc_masa_muscular: number | null
  kg_grasa: number | null
  kg_musculo: number | null
  pliegue_triceps_mm: number | null
  pliegue_subescapular_mm: number | null
  pliegue_supraespinal_mm: number | null
  pliegue_abdominal_mm: number | null
  pliegue_muslo_mm: number | null
  pliegue_pierna_mm: number | null
  pliegue_biceps_mm: number | null
  pliegue_cresta_iliaca_mm: number | null
  perimetro_brazo_cm: number | null
  perimetro_muslo_cm: number | null
  perimetro_pierna_cm: number | null
  kg_tejido_muscular: number | null
  kg_tejido_oseo: number | null
  dx_antropometrico: string | null
  observaciones: string | null
}

export function MedicionesPanel({
  pacienteId,
  mediciones,
}: {
  pacienteId: string
  mediciones: Medicion[]
}) {
  const [editing, setEditing] = useState<Medicion | null>(null)
  const [deleteState, deleteAction, deletePending] = useActionState(eliminarMedicionAction, initial)
  const deleteVisible = useAutoHideMessage(deleteState)
  const deleteFormRef = useRef<HTMLFormElement>(null)
  const [confirmTarget, setConfirmTarget] = useState<Medicion | null>(null)

  return (
    <div className="space-y-6">
      <MedicionForm pacienteId={pacienteId} medicion={editing ?? undefined} onCancel={() => setEditing(null)} />

      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-heading font-semibold text-gray-900">Histórico de mediciones</h3>
        </div>

        {deleteVisible && (deleteState.ok || deleteState.error) ? (
          <div
            className={`mx-5 mt-4 rounded-lg px-4 py-2 text-sm ${
              deleteState.error
                ? 'bg-vimet-red/10 border border-vimet-red/20 text-vimet-red'
                : 'bg-green-50 border border-green-200 text-green-700'
            }`}
          >
            {deleteState.error ?? 'Medición eliminada.'}
          </div>
        ) : null}

        {mediciones.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-700">
            Todavía no hay mediciones registradas.
          </p>
        ) : (
          <>
            <ul className="sm:hidden divide-y divide-gray-100">
              {mediciones.map((m) => (
                <li key={m.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-gray-900">
                      {formatearFechaCorta(m.fecha_medicion)}
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                      <IsakDetalleModal medicion={m} />
                      <button
                        type="button"
                        onClick={() => setEditing(m)}
                        className="text-gray-400 hover:text-vimet-orange"
                        aria-label="Editar"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        disabled={deletePending}
                        onClick={() => setConfirmTarget(m)}
                        className="text-vimet-red hover:text-vimet-red/80 disabled:opacity-50"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-gray-500">Peso</dt>
                      <dd className="text-gray-900">{m.peso_kg ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-gray-500">Talla</dt>
                      <dd className="text-gray-900">{m.talla_cm ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-gray-500">IMC</dt>
                      <dd className="text-gray-900">{m.imc ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-gray-500">% grasa</dt>
                      <dd className="text-gray-900">{m.porc_grasa ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-gray-500">% músc</dt>
                      <dd className="text-gray-900">{m.porc_masa_muscular ?? '—'}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs uppercase tracking-wide text-gray-500">DX</dt>
                      <dd className="text-gray-700">{m.dx_antropometrico ?? '—'}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>

            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-700">
                    <th className="px-3 py-2.5 font-semibold">Fecha</th>
                    <th className="px-3 py-2.5 font-semibold">Peso</th>
                    <th className="px-3 py-2.5 font-semibold">Talla</th>
                    <th className="px-3 py-2.5 font-semibold">IMC</th>
                    <th className="px-3 py-2.5 font-semibold">% grasa</th>
                    <th className="px-3 py-2.5 font-semibold">% músc</th>
                    <th className="px-3 py-2.5 font-semibold">DX</th>
                    <th className="px-3 py-2.5 font-semibold">ISAK</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {mediciones.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5 font-semibold text-gray-900">
                        {formatearFechaCorta(m.fecha_medicion)}
                      </td>
                      <td className="px-3 py-2.5">{m.peso_kg ?? '—'}</td>
                      <td className="px-3 py-2.5">{m.talla_cm ?? '—'}</td>
                      <td className="px-3 py-2.5">{m.imc ?? '—'}</td>
                      <td className="px-3 py-2.5">{m.porc_grasa ?? '—'}</td>
                      <td className="px-3 py-2.5">{m.porc_masa_muscular ?? '—'}</td>
                      <td className="px-3 py-2.5 text-gray-700">{m.dx_antropometrico ?? '—'}</td>
                      <td className="px-3 py-2.5">
                        <IsakDetalleModal medicion={m} />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => setEditing(m)}
                            className="text-gray-400 hover:text-vimet-orange"
                            aria-label="Editar"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            disabled={deletePending}
                            onClick={() => setConfirmTarget(m)}
                            className="text-vimet-red hover:text-vimet-red/80 disabled:opacity-50"
                            aria-label="Eliminar"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <form ref={deleteFormRef} action={deleteAction} className="hidden">
        <input type="hidden" name="id" value={confirmTarget?.id ?? ''} readOnly />
        <input type="hidden" name="paciente_id" value={pacienteId} readOnly />
      </form>

      <ConfirmDialog
        open={confirmTarget !== null}
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => {
          deleteFormRef.current?.requestSubmit()
          setConfirmTarget(null)
        }}
        pending={deletePending}
        title="Eliminar medición"
        description={
          confirmTarget
            ? `¿Eliminar la medición del ${formatearFechaCorta(confirmTarget.fecha_medicion)}? Esta acción no se puede deshacer.`
            : ''
        }
        confirmLabel="Eliminar"
      />
    </div>
  )
}
