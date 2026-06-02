'use client'

import Link from 'next/link'
import { useFormState, useFormStatus } from 'react-dom'

import { nuevaContrasenaAction } from '@/actions/auth'
import { AuthShell } from '@/components/auth-shell'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full inline-flex items-center justify-center px-5 py-3 rounded-full bg-vimet-gradient text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-60"
    >
      {pending ? 'Guardando…' : 'Guardar contraseña'}
    </button>
  )
}

export default function NuevaContrasenaPage() {
  const [state, formAction] = useFormState(nuevaContrasenaAction, {})

  return (
    <AuthShell
      title="Crear contraseña"
      description="Elegí una contraseña para tu cuenta VIMET"
      footer={
        <>
          ¿Ya tenés contraseña?{' '}
          <Link href="/login" className="font-semibold text-vimet-orange hover:underline">
            Iniciar sesión
          </Link>
        </>
      }
    >
      <form action={formAction} className="space-y-4">
        {state.error && (
          <div role="alert" className="rounded-lg bg-vimet-red/10 border border-vimet-red/20 px-4 py-3 text-sm text-vimet-red">
            {state.error}
          </div>
        )}
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
        <SubmitButton />
      </form>
    </AuthShell>
  )
}
