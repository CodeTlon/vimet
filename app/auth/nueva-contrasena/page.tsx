'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useFormState, useFormStatus } from 'react-dom'

import { nuevaContrasenaAction } from '@/actions/auth'
import { AuthShell } from '@/components/auth-shell'

function SubmitButton({ recovery }: { recovery: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full inline-flex items-center justify-center px-5 py-3 rounded-full bg-vimet-gradient text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-60"
    >
      {pending ? 'Guardando…' : recovery ? 'Cambiar contraseña' : 'Guardar contraseña'}
    </button>
  )
}

function NuevaContrasenaInner() {
  const [state, formAction] = useFormState(nuevaContrasenaAction, {})
  const searchParams = useSearchParams()
  // recovery = usuario existente cambiando su contraseña (no pedir datos de perfil).
  const recovery = searchParams.get('flow') === 'recovery'

  return (
    <AuthShell
      title={recovery ? 'Cambiar contraseña' : 'Crear contraseña'}
      description={
        recovery
          ? 'Elegí una nueva contraseña para tu cuenta VIMET'
          : 'Elegí una contraseña para tu cuenta VIMET'
      }
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

        {recovery ? (
          <p className="text-sm text-gray-500">
            Tu cuenta ya está creada. Ingresá tu nueva contraseña para terminar.
          </p>
        ) : (
          <>
            <p className="text-sm text-gray-500">
              Completá tus datos y elegí una contraseña para tu primer ingreso.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">Nombre</label>
                <input
                  type="text"
                  name="nombre"
                  placeholder="Ej: Avril"
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1.5">Apellido</label>
                <input
                  type="text"
                  name="apellido"
                  placeholder="Ej: Jerushalmi"
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1.5">Teléfono (WhatsApp)</label>
              <input
                type="tel"
                name="telefono"
                placeholder="Ej: 3513752818"
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange"
              />
            </div>
          </>
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
        <SubmitButton recovery={recovery} />
      </form>
    </AuthShell>
  )
}

export default function NuevaContrasenaPage() {
  return (
    <Suspense
      fallback={
        <AuthShell
          title="Crear contraseña"
          description="Elegí una contraseña para tu cuenta VIMET"
          footer={<span className="text-gray-400">Un momento…</span>}
        >
          <div className="flex justify-center py-6">
            <div className="h-8 w-8 rounded-full border-4 border-vimet-orange border-t-transparent animate-spin" />
          </div>
        </AuthShell>
      }
    >
      <NuevaContrasenaInner />
    </Suspense>
  )
}
