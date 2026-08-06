'use client'

import { LogIn } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useFormStatus } from 'react-dom';
import { useActionState, useState } from 'react';

import { loginAction, type AuthState } from '@/actions/auth'
import { PasswordInput } from '@/components/ui/password-input'

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
  const [state, formAction] = useActionState(loginAction, initialState)
  const confirmado = useSearchParams().get('confirmado') === '1'
  // El email es controlado a propósito: React resetea los inputs NO controlados
  // del <form action={...}> al terminar la action, y hacer retipear el email
  // cuando lo único que falló fue la contraseña es puro ruido. Solo lo vaciamos
  // si la action avisa que esa cuenta no existe (`clearEmail`).
  const [email, setEmail] = useState('')
  // Ajuste de estado durante el render (no useEffect: dispararía el
  // set-state-in-effect que el repo ya limpió). Compara contra el `state`
  // anterior porque la action devuelve un objeto nuevo en cada submit, así un
  // segundo intento fallido también entra.
  const [prevState, setPrevState] = useState(state)
  if (prevState !== state) {
    setPrevState(state)
    if (state.clearEmail) setEmail('')
  }

  return (
    <form action={formAction} className="space-y-4">
      {confirmado && !state.error ? (
        <div
          role="status"
          className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700"
        >
          Cuenta confirmada. Iniciá sesión — un admin todavía tiene que activarla antes de que puedas entrar.
        </div>
      ) : null}
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-800 mb-1.5">Contraseña</label>
        <PasswordInput name="password" required minLength={6} placeholder="Tu contraseña" />
      </div>
      <SubmitButton />
      <div className="flex items-center justify-between text-sm border-t border-gray-100 mt-2 pt-3">
        <Link href="/auth/recuperar" className="text-gray-500 hover:text-vimet-orange transition-colors">
          ¿Olvidaste tu contraseña?
        </Link>
        <Link href="/registro" className="text-gray-500 hover:text-vimet-orange transition-colors">
          Crear cuenta
        </Link>
      </div>
    </form>
  )
}
