'use client'

import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'

const SIZE_CLASS = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
} as const

/**
 * <dialog> nativo compartido por todos los modales del proyecto. El browser
 * aplica estilos de user-agent (border, background, max-width/height) sobre
 * cualquier <dialog>; Tailwind preflight solo resetea el padding, así que acá
 * pisamos explícitamente border/bg/radius/shadow — dejarlos implícitos es lo
 * que hacía ver los modales viejos como una caja blanca sin estilo.
 * `m-auto` + `w-[calc(100%-2rem)]` (sin gating `sm:`) es lo que centra el
 * modal en todos los breakpoints; el bug de los modales viejos era limitar
 * ese ancho solo a partir de `sm:`, quedando sin tope en mobile.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: keyof typeof SIZE_CLASS
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      aria-labelledby={titleId}
      // OJO: `display` no puede ir acá. El browser oculta un <dialog> cerrado
      // vía la regla de user-agent `dialog:not([open]) { display: none }` —
      // como el CSS de autor gana siempre sobre el de UA en esa propiedad
      // (sin importar especificidad), una clase como `flex` puesta directo
      // acá pisaría ese `display:none` y el modal quedaría visible aunque
      // `open` fuera false. El layout flex vive en el <div> de abajo.
      className={`backdrop:bg-black/60 backdrop:animate-fade-in m-auto w-[calc(100%-2rem)] max-h-[calc(100%-4rem)] border-0 bg-transparent p-0 print:hidden ${SIZE_CLASS[size]}`}
    >
      <div className="animate-modal-in flex max-h-[calc(100vh-4rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <h2 id={titleId} className="font-heading text-lg font-semibold text-gray-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-gray-400 hover:text-gray-700"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </dialog>
  )
}
