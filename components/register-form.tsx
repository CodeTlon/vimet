'use client'

import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'

import { registerAction, type AuthState } from '@/actions/auth'

const initialState: AuthState = {}

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-vimet-gradient text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
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

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const mismatch = confirm.length > 0 && password !== confirm

  if (state.ok) {
    return (
      <div role="status" className="rounded-xl bg-vimet-orange/10 border border-vimet-orange/30 px-6 py-8 text-center space-y-2">
        <p className="font-semibold text-gray-900">¡Cuenta creada!</p>
        <p className="text-sm text-gray-700">
          Tu solicitud fue recibida. El equipo VIMET va a activar tu cuenta y te avisará cuando esté lista para usar.
        </p>
      </div>
    )
  }

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (mismatch) e.preventDefault()
      }}
      className="space-y-4"
    >
      {state.error ? (
        <div role="alert" className="rounded-lg bg-vimet-red/10 border border-vimet-red/20 px-4 py-3 text-sm text-vimet-red">
          {state.error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nombre" name="nombre" defaultValue={f.nombre} placeholder="Ej: Avril" required />
        <Field label="Apellido" name="apellido" defaultValue={f.apellido} placeholder="Ej: Jerushalmi" required />
      </div>
      <Field
        label="Email"
        name="email"
        type="email"
        defaultValue={f.email}
        placeholder="tu@email.com"
        required
      />
      <Field
        label="Teléfono (WhatsApp)"
        name="telefono"
        type="tel"
        defaultValue={f.telefono}
        placeholder="Ej: 3513752818"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          label="Contraseña"
          name="password"
          type="password"
          minLength={6}
          required
          placeholder="Mínimo 6 caracteres"
          value={password}
          onChange={(v) => setPassword(v)}
        />
        <Field
          label="Confirmar"
          name="password_confirm"
          type="password"
          minLength={6}
          required
          placeholder="Repetí la contraseña"
          value={confirm}
          onChange={(v) => setConfirm(v)}
          ariaInvalid={mismatch}
        />
      </div>

      {mismatch ? (
        <p role="alert" className="text-sm text-vimet-red">
          Las contraseñas no coinciden.
        </p>
      ) : null}

      <SubmitButton disabled={mismatch} />
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
  value,
  onChange,
  ariaInvalid,
}: {
  label: string
  name: string
  type?: string
  defaultValue?: string
  placeholder?: string
  required?: boolean
  minLength?: number
  value?: string
  onChange?: (v: string) => void
  ariaInvalid?: boolean
}) {
  const controlled = value !== undefined && onChange !== undefined
  return (
    <div>
      <label className="block text-sm font-medium text-gray-800 mb-1.5">{label}</label>
      <input
        type={type}
        name={name}
        {...(controlled
          ? { value, onChange: (e) => onChange!(e.target.value) }
          : { defaultValue })}
        required={required}
        placeholder={placeholder}
        minLength={minLength}
        aria-invalid={ariaInvalid || undefined}
        className={`w-full rounded-lg border bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 ${
          ariaInvalid
            ? 'border-vimet-red/40 focus:ring-vimet-red/30 focus:border-vimet-red'
            : 'border-gray-200 focus:ring-vimet-orange/40 focus:border-vimet-orange'
        }`}
      />
    </div>
  )
}
