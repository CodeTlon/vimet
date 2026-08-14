'use client'

import { Modal } from '@/components/ui/modal'

/**
 * Confirmación de marca para acciones destructivas — reemplaza el `confirm()`
 * nativo del navegador (o la ausencia total de confirmación) en los botones
 * de eliminar. Uso típico: el botón que dispara la acción es `type="button"`
 * (no `type="submit"`), abre este diálogo, y `onConfirm` hace
 * `formRef.current?.requestSubmit()` sobre el form real.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Eliminar',
  pending = false,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  pending?: boolean
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-gray-700">{description}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-vimet-red hover:bg-vimet-red/90 disabled:opacity-50"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
