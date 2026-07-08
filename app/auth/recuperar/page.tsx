'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useFormState, useFormStatus } from 'react-dom'

import { confirmarRecuperacionAction, recuperarContrasenaAction } from '@/actions/auth'
import { AuthShell } from '@/components/auth-shell'

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full inline-flex items-center justify-center px-5 py-3 rounded-full bg-vimet-gradient text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  )
}

function CodigoForm({ email }: { email: string }) {
  const [state, formAction] = useFormState(confirmarRecuperacionAction, {})

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="email" value={email} />
      {state.error && (
        <div
          role="alert"
          className="rounded-lg bg-vimet-red/10 border border-vimet-red/20 px-4 py-3 text-sm text-vimet-red"
        >
          {state.error}
        </div>
      )}
      <p className="text-sm text-gray-600">
        Te mandamos un código a <strong>{email}</strong>.
      </p>
      <div>
        <label className="block text-sm font-medium text-gray-800 mb-1.5">Código</label>
        <input
          type="text"
          name="token"
          required
          minLength={8}
          maxLength={8}
          inputMode="numeric"
          placeholder="12345678"
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-800 mb-1.5">Nueva contraseña</label>
        <input
          type="password"
          name="password"
          required
          minLength={6}
          placeholder="Mínimo 6 caracteres"
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-800 mb-1.5">Confirmar contraseña</label>
        <input
          type="password"
          name="confirm"
          required
          minLength={6}
          placeholder="Repetí la contraseña"
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange"
        />
      </div>
      <SubmitButton label="Cambiar contraseña" pendingLabel="Guardando…" />
    </form>
  )
}

function RecuperarInner() {
  const [state, formAction] = useFormState(recuperarContrasenaAction, {})
  const expired = useSearchParams().get('expired') === '1'

  return (
    <AuthShell
      title="Recuperar contraseña"
      description="Te enviamos un código para crear una nueva"
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
        <CodigoForm email={state.fields?.email ?? ''} />
      ) : (
        <form action={formAction} className="space-y-4">
          {expired && (
            <div
              role="alert"
              className="rounded-lg bg-vimet-red/10 border border-vimet-red/20 px-4 py-3 text-sm text-vimet-red"
            >
              Ese link venció. Pedí un código nuevo abajo.
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
          <SubmitButton label="Enviar código" pendingLabel="Enviando…" />
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
