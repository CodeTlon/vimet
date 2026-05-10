'use client'

import { UserPlus } from 'lucide-react'
import { useFormState, useFormStatus } from 'react-dom'

import { registerAction, type AuthState } from '@/actions/auth'

const initialState: AuthState = {}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-vimet-gradient text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-60"
    >
      {pending ? 'Creando cuenta…' : (
        <>
          <UserPlus className="size-4" /> Crear cuenta
        </>
      )}
    </button>
  )
}

export function RegisterForm() {
  const [state, formAction] = useFormState(registerAction, initialState)
  const f = state.fields ?? { nombre: '', apellido: '', email: '', telefono: '' }

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <div
          role={state.ok ? 'status' : 'alert'}
          className={
            state.ok
              ? 'rounded-lg bg-vimet-orange/10 border border-vimet-orange/30 px-4 py-3 text-sm text-vimet-red'
              : 'rounded-lg bg-vimet-red/10 border border-vimet-red/20 px-4 py-3 text-sm text-vimet-red'
          }
        >
          {state.error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nombre" name="nombre" defaultValue={f.nombre} required />
        <Field label="Apellido" name="apellido" defaultValue={f.apellido} required />
      </div>
      <Field label="Email" name="email" type="email" defaultValue={f.email} required />
      <Field
        label="Teléfono (WhatsApp)"
        name="telefono"
        type="tel"
        defaultValue={f.telefono}
        placeholder="Ej: 3513752818"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Contraseña" name="password" type="password" minLength={6} required />
        <Field label="Confirmar" name="password_confirm" type="password" minLength={6} required />
      </div>

      <SubmitButton />
    </form>
  )
}

function Field({
  label,
  name,
  type = 'text',
  defaultValue,
  placeholder,
  required,
  minLength,
}: {
  label: string
  name: string
  type?: string
  defaultValue?: string
  placeholder?: string
  required?: boolean
  minLength?: number
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-800 mb-1.5">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        minLength={minLength}
        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange"
      />
    </div>
  )
}
