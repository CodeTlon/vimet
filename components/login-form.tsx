'use client'

import { LogIn } from 'lucide-react'
import { useFormState, useFormStatus } from 'react-dom'

import { loginAction, type AuthState } from '@/actions/auth'

const initialState: AuthState = {}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-vimet-gradient text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-60"
    >
      {pending ? 'Ingresando…' : (
        <>
          <LogIn className="size-4" /> Iniciar sesión
        </>
      )}
    </button>
  )
}

export function LoginForm() {
  const [state, formAction] = useFormState(loginAction, initialState)
  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <div
          role="alert"
          className="rounded-lg bg-vimet-red/10 border border-vimet-red/20 px-4 py-3 text-sm text-vimet-red"
        >
          {state.error}
        </div>
      ) : null}
      <div>
        <label className="block text-sm font-medium text-gray-800 mb-1.5">Email</label>
        <input
          type="email"
          name="email"
          required
          placeholder="tu@email.com"
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-800 mb-1.5">Contraseña</label>
        <input
          type="password"
          name="password"
          required
          minLength={6}
          placeholder="Tu contraseña"
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange"
        />
      </div>
      <SubmitButton />
    </form>
  )
}
