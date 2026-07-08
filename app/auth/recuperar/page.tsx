'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useFormState, useFormStatus } from 'react-dom'

import { recuperarContrasenaAction } from '@/actions/auth'
import { AuthShell } from '@/components/auth-shell'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full inline-flex items-center justify-center px-5 py-3 rounded-full bg-vimet-gradient text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-60"
    >
      {pending ? 'Enviando…' : 'Enviar link de recuperación'}
    </button>
  )
}

function RecuperarInner() {
  const [state, formAction] = useFormState(recuperarContrasenaAction, {})
  const expired = useSearchParams().get('expired') === '1'

  return (
    <AuthShell
      title="Recuperar contraseña"
      description="Te enviamos un link para crear una nueva"
      backHref="/login"
      backLabel="Volver a iniciar sesión"
      footer={
        <>
          ¿Te acordaste?{' '}
          <Link href="/login" className="font-semibold text-vimet-orange hover:underline">
            Iniciar sesión
          </Link>
        </>
      }
    >
      {state.ok ? (
        <div
          role="status"
          className="rounded-lg bg-vimet-orange/10 border border-vimet-orange/20 px-4 py-3 text-sm text-gray-800"
        >
          Si existe una cuenta con ese email, te enviamos un link. Revisá tu casilla (y spam).
        </div>
      ) : (
        <form action={formAction} className="space-y-4">
          {expired && (
            <div
              role="alert"
              className="rounded-lg bg-vimet-red/10 border border-vimet-red/20 px-4 py-3 text-sm text-vimet-red"
            >
              Ese link venció. Pedí uno nuevo abajo.
            </div>
          )}
          {state.error && (
            <div
              role="alert"
              className="rounded-lg bg-vimet-red/10 border border-vimet-red/20 px-4 py-3 text-sm text-vimet-red"
            >
              {state.error}
            </div>
          )}
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
          <SubmitButton />
        </form>
      )}
    </AuthShell>
  )
}

export default function RecuperarPage() {
  return (
    <Suspense fallback={null}>
      <RecuperarInner />
    </Suspense>
  )
}
