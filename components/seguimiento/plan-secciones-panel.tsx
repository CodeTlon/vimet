'use client'

import { ChevronDown, ChevronUp, ImageIcon, Pencil, Plus, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'

import { eliminarSeccionAction, moverSeccionAction } from '@/actions/plan-secciones'
import { type Seccion, PlanSeccionForm } from '@/components/seguimiento/plan-seccion-form'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Modal } from '@/components/ui/modal'
import { TIPO_SECCION_PLAN, type TipoSeccionPlan } from '@/lib/seguimiento'

function ImagenesPreview({ seccion }: { seccion: Seccion }) {
  if (seccion.imagenes.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {seccion.imagenes.slice(0, 6).map((img) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={img.id} src={img.url} alt="" className="h-12 w-12 rounded-md object-cover border border-gray-200" />
      ))}
      {seccion.imagenes.length > 6 ? (
        <span className="h-12 w-12 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center text-xs text-gray-500">
          +{seccion.imagenes.length - 6}
        </span>
      ) : null}
    </div>
  )
}

function SeccionCard({
  seccion,
  planId,
  pacienteId,
  isFirst,
  isLast,
  onEditar,
}: {
  seccion: Seccion
  planId: number
  pacienteId: string
  isFirst: boolean
  isLast: boolean
  onEditar: () => void
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const deleteFormRef = useRef<HTMLFormElement>(null)

  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-block text-xs font-medium text-vimet-orange bg-vimet-tint1 rounded-full px-2 py-0.5 mb-1">
            {TIPO_SECCION_PLAN.find((t) => t.value === seccion.tipo)?.label}
          </span>
          <h3 className="font-heading font-semibold text-gray-900">{seccion.titulo}</h3>

          {seccion.tipo === 'comidas_dia' ? (
            <ul className="mt-1 text-sm text-gray-600 space-y-0.5">
              {seccion.momentos.map((m) => (
                <li key={m.id}>
                  <span className="font-medium text-gray-800">{m.nombre_momento}:</span>{' '}
                  <span className="line-clamp-1">{m.contenido}</span>
                </li>
              ))}
            </ul>
          ) : seccion.tipo === 'imagenes' ? (
            <p className="mt-1 text-sm text-gray-500 inline-flex items-center gap-1.5">
              <ImageIcon className="size-3.5" /> {seccion.imagenes.length} imagen
              {seccion.imagenes.length === 1 ? '' : 'es'}
            </p>
          ) : (
            <p className="mt-1 text-sm text-gray-600 line-clamp-2 whitespace-pre-line">{seccion.contenido}</p>
          )}

          {seccion.tipo !== 'imagenes' ? <ImagenesPreview seccion={seccion} /> : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <div className="flex flex-col">
            <form action={moverSeccionAction}>
              <input type="hidden" name="id" value={seccion.id} />
              <input type="hidden" name="plan_id" value={planId} />
              <input type="hidden" name="paciente_id" value={pacienteId} />
              <input type="hidden" name="direccion" value="subir" />
              <button
                type="submit"
                disabled={isFirst}
                aria-label="Mover arriba"
                className="inline-flex items-center justify-center size-6 rounded text-gray-400 hover:text-vimet-orange disabled:opacity-30 disabled:hover:text-gray-400"
              >
                <ChevronUp className="size-4" />
              </button>
            </form>
            <form action={moverSeccionAction}>
              <input type="hidden" name="id" value={seccion.id} />
              <input type="hidden" name="plan_id" value={planId} />
              <input type="hidden" name="paciente_id" value={pacienteId} />
              <input type="hidden" name="direccion" value="bajar" />
              <button
                type="submit"
                disabled={isLast}
                aria-label="Mover abajo"
                className="inline-flex items-center justify-center size-6 rounded text-gray-400 hover:text-vimet-orange disabled:opacity-30 disabled:hover:text-gray-400"
              >
                <ChevronDown className="size-4" />
              </button>
            </form>
          </div>
          <button
            type="button"
            onClick={onEditar}
            aria-label="Editar sección"
            className="inline-flex items-center justify-center size-8 rounded-full text-gray-400 hover:text-vimet-orange hover:bg-gray-50"
          >
            <Pencil className="size-4" />
          </button>
          <form ref={deleteFormRef} action={eliminarSeccionAction}>
            <input type="hidden" name="id" value={seccion.id} />
            <input type="hidden" name="plan_id" value={planId} />
            <input type="hidden" name="paciente_id" value={pacienteId} />
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              aria-label="Eliminar sección"
              className="inline-flex items-center justify-center size-8 rounded-full text-gray-400 hover:text-vimet-red hover:bg-gray-50"
            >
              <Trash2 className="size-4" />
            </button>
          </form>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false)
          deleteFormRef.current?.requestSubmit()
        }}
        title="Eliminar sección"
        description={`¿Eliminar "${seccion.titulo}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
      />
    </div>
  )
}

export function PlanSeccionesPanel({
  planId,
  pacienteId,
  secciones,
}: {
  planId: number
  pacienteId: string
  secciones: Seccion[]
}) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Seccion | null>(null)
  const [tipoNuevo, setTipoNuevo] = useState<TipoSeccionPlan | null>(null)
  // Cada apertura del modal suma 1 acá y se usa como `key` del form de abajo:
  // <Modal> nunca desmonta a sus hijos (solo hace show/close sobre el
  // <dialog>), así que sin este contador el form seguiría vivo entre una
  // sección editada y la siguiente — momentos dinámicos y valores tipeados de
  // la sección anterior quedarían pegados en el form de la sección nueva.
  const [openCount, setOpenCount] = useState(0)

  function cerrar() {
    setOpen(false)
    setEditing(null)
    setTipoNuevo(null)
  }

  const tipoActivo = editing?.tipo ?? tipoNuevo

  return (
    <fieldset className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <legend className="px-2 font-heading font-semibold text-gray-900">Secciones del plan</legend>

      {secciones.length === 0 ? (
        <p className="text-sm text-gray-500 mb-4">
          Todavía no agregaste ninguna sección. Agregá las que necesites: comidas del día, receta, pautas
          generales o imágenes.
        </p>
      ) : (
        <div className="space-y-3 mb-4">
          {secciones.map((s, i) => (
            <SeccionCard
              key={s.id}
              seccion={s}
              planId={planId}
              pacienteId={pacienteId}
              isFirst={i === 0}
              isLast={i === secciones.length - 1}
              onEditar={() => {
                setEditing(s)
                setOpen(true)
                setOpenCount((n) => n + 1)
              }}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setOpen(true)
          setOpenCount((n) => n + 1)
        }}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-vimet-orange hover:text-vimet-red transition-colors"
      >
        <Plus className="size-4" /> Agregar sección
      </button>

      <Modal
        open={open}
        onClose={cerrar}
        title={editing ? `Editar: ${editing.titulo}` : tipoNuevo ? 'Nueva sección' : 'Elegí el tipo de sección'}
      >
        {tipoActivo ? (
          <PlanSeccionForm
            key={openCount}
            planId={planId}
            pacienteId={pacienteId}
            tipo={tipoActivo}
            seccion={editing ?? undefined}
            onDone={cerrar}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TIPO_SECCION_PLAN.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTipoNuevo(t.value)}
                className="text-left rounded-xl border border-gray-200 p-4 hover:border-vimet-orange hover:bg-vimet-cream transition-colors"
              >
                <span className="block font-heading font-semibold text-gray-900">{t.label}</span>
                <span className="block text-xs text-gray-500 mt-1">{t.descripcion}</span>
              </button>
            ))}
          </div>
        )}
      </Modal>
    </fieldset>
  )
}
