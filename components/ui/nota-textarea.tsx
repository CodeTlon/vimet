'use client'

import { Pencil } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Modal } from '@/components/ui/modal'

export function NotaTextarea({
  name,
  form,
  defaultValue,
  rows = 3,
  placeholder,
  className,
  required,
  maxLength,
  onSave,
}: {
  name?: string
  /** id de un <form> externo a asociar (cuando el textarea no es descendiente del <form>) */
  form?: string
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

  // El padre a veces cambia de fila (ej. click en "editar" de otro registro)
  // sin remontar este componente (sin `key`), así que `defaultValue` cambia
  // de prop pero el useState de arriba no lo relee solo — sin esto, se
  // seguía mostrando la nota de la fila anterior.
  useEffect(() => {
    setValue(defaultValue ?? '')
  }, [defaultValue])

  return (
    <div className="relative">
      <textarea
        name={name}
        form={form}
        rows={rows}
        value={value}
        readOnly
        required={required}
        placeholder={placeholder}
        onClick={() => {
          setDraft(value)
          setOpen(true)
        }}
        onFocus={(e) => {
          e.target.blur()
          setDraft(value)
          setOpen(true)
        }}
        className={className}
      />
      <Pencil className="absolute top-2 right-2 size-3.5 text-gray-400 pointer-events-none" />

      <Modal open={open} onClose={() => setOpen(false)} title="Notas">
        <div className="flex flex-col gap-3">
          <textarea
            autoFocus
            rows={10}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange"
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
      </Modal>
    </div>
  )
}
