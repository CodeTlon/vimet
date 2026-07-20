'use client'

import { Pencil } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export function NotaTextarea({
  name,
  defaultValue,
  rows = 3,
  placeholder,
  className,
  required,
  maxLength,
  onSave,
}: {
  name?: string
  defaultValue?: string | null
  rows?: number
  placeholder?: string
  className?: string
  required?: boolean
  maxLength?: number
  onSave?: (value: string) => void
}) {
  const [value, setValue] = useState(defaultValue ?? '')
  const [draft, setDraft] = useState(value)
  const [open, setOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      setDraft(value)
      dialog.showModal()
    }
    if (!open && dialog.open) dialog.close()
  }, [open, value])

  return (
    <div className="relative">
      <textarea
        name={name}
        rows={rows}
        value={value}
        readOnly
        required={required}
        placeholder={placeholder}
        onClick={() => setOpen(true)}
        onFocus={(e) => {
          e.target.blur()
          setOpen(true)
        }}
        className={className}
      />
      <Pencil className="absolute top-2 right-2 size-3.5 text-gray-400 pointer-events-none" />

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        className="backdrop:bg-black/60 rounded-none sm:rounded-2xl p-0 w-full h-full sm:h-auto sm:max-w-lg m-0 sm:m-auto"
      >
        <div className="flex flex-col h-full sm:h-auto p-4 gap-3">
          <textarea
            autoFocus
            rows={10}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            className="flex-1 sm:flex-none w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange resize-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                setValue(draft)
                onSave?.(draft)
                setOpen(false)
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-vimet-orange hover:bg-vimet-red"
            >
              Listo
            </button>
          </div>
        </div>
      </dialog>
    </div>
  )
}
