'use client'

import { Eye, EyeOff } from 'lucide-react'
import { useState, type InputHTMLAttributes } from 'react'

/**
 * Input de contraseña con toggle de visibilidad (ojito), equivalente web del
 * `PasswordInput` de la app mobile (`vimet-app/components/ui.tsx`).
 * El `type` lo maneja el componente — por eso queda fuera de las props.
 */
export function PasswordInput({
  className = '',
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        className={`w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange ${className}`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-vimet-orange transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-vimet-orange/40 rounded-r-lg"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}
