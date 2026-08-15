'use client'

import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

export type SelectOption = { value: string; label: string }

type SelectProps = {
  options: readonly SelectOption[]
  name?: string
  placeholder?: string
  className?: string
  /** Reemplaza por completo las clases del trigger (default: caja tipo input). Para variantes como un badge/pill. */
  triggerClassName?: string
  /** Clases del texto elegido dentro del trigger, para variantes que no quieren el gris/negro por defecto. */
  valueClassName?: string
  disabled?: boolean
} & (
  | { value: string; onChange: (value: string) => void; defaultValue?: undefined }
  | { value?: undefined; onChange?: undefined; defaultValue?: string }
)

/**
 * Select propio (sin dependencias) porque el popup de un <select> nativo lo
 * dibuja el sistema operativo — no hay CSS que lo alcance, así que quedaba
 * inconsistente con el resto del diseño (ver conversación). El trigger y el
 * listbox sí son nuestro markup, totalmente estilables.
 *
 * Dos modos, igual que un <select> nativo:
 * - Controlado: pasá `value` + `onChange` (estado de React).
 * - No controlado: pasá `defaultValue` (o nada) + `name` — se comporta como
 *   cualquier campo de un <form action={serverAction}>, guardando el valor
 *   en un <input type="hidden"> para que FormData lo levante igual.
 */
export function Select({
  options,
  name,
  placeholder = 'Seleccionar',
  className = '',
  triggerClassName,
  valueClassName,
  disabled = false,
  ...props
}: SelectProps) {
  const isControlled = props.value !== undefined
  // Como un <select> nativo sin defaultValue: si no se especifica, arranca
  // en la primera opción (no vacío/placeholder).
  const initialValue = props.defaultValue ?? options[0]?.value ?? ''
  const [internal, setInternal] = useState(initialValue)
  const value = isControlled ? props.value! : internal
  function setValue(v: string) {
    if (isControlled) props.onChange!(v)
    else setInternal(v)
  }

  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const listId = useId()

  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // No controlado: un form.reset() nativo (ej. useResetOnSuccess tras guardar)
  // resetea el <input type="hidden"> pero no el estado de React que decide qué
  // se ve en el trigger — sin este listener el select quedaba mostrando la
  // última opción elegida aunque el resto del form ya se hubiera limpiado.
  useEffect(() => {
    if (isControlled) return
    const form = ref.current?.closest('form')
    if (!form) return
    const onReset = () => setInternal(initialValue)
    form.addEventListener('reset', onReset)
    return () => form.removeEventListener('reset', onReset)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isControlled])

  useEffect(() => {
    if (!open) return
    const idx = options.findIndex((o) => o.value === value)
    setHighlighted(idx >= 0 ? idx : 0)
  }, [open, value, options])

  function commit(idx: number) {
    const opt = options[idx]
    if (!opt) return
    setValue(opt.value)
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled) return
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, options.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      commit(highlighted)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div ref={ref} className={`relative min-w-0 ${className}`}>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className={
          triggerClassName ??
          `flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border bg-white px-2.5 py-2 text-left text-sm transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
            open ? 'border-vimet-orange ring-2 ring-vimet-orange/40' : 'border-gray-200 hover:border-gray-300'
          }`
        }
      >
        <span className={`truncate ${valueClassName ?? (selected ? 'text-gray-900' : 'text-gray-400')}`}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className={`size-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''} ${valueClassName ? '' : 'text-gray-400'}`} />
      </button>
      {open ? (
        <ul
          role="listbox"
          id={listId}
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg"
        >
          {options.map((o, idx) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              onMouseEnter={() => setHighlighted(idx)}
              onClick={() => commit(idx)}
              className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-2 ${
                idx === highlighted ? 'bg-vimet-orange/10 text-vimet-orange' : 'text-gray-700'
              }`}
            >
              <span className="truncate">{o.label}</span>
              {o.value === value ? <Check className="size-4 shrink-0" /> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
