'use client'

import { useActionState } from 'react'

import { cambiarPasswordAction, configurarProfesionalAction, type StaffState } from '@/actions/staff'

function FormSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-1">{title}</h2>
      {description && <p className="text-sm text-gray-500 mb-5">{description}</p>}
      {!description && <div className="mb-5" />}
      {children}
    </div>
  )
}

function StatusMsg({ state }: { state: StaffState }) {
  if (!state.ok && !state.error) return null
  return (
    <p className={`text-sm mt-3 ${state.ok ? 'text-green-600' : 'text-red-600'}`}>
      {state.ok ? 'Guardado correctamente.' : state.error}
    </p>
  )
}

export function ConfigurarProfesionalForm() {
  const [state, action, pending] = useActionState(configurarProfesionalAction, {})

  return (
    <FormSection
      title="Configurar profesional"
      description="Asigna el rol y linkea todos los servicios y horarios correspondientes a una cuenta. Sirve para configurar quién actúa como nutricionista o entrenador, con cualquier email."
    >
      <form action={action} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email del usuario</label>
          <input
            name="email"
            type="email"
            required
            placeholder="usuario@ejemplo.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
          <select
            name="tipo"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40"
          >
            <option value="nutricionista">Nutricionista</option>
            <option value="entrenador">Entrenador</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-vimet-orange px-5 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-vimet-red transition-colors"
        >
          {pending ? 'Guardando…' : 'Configurar'}
        </button>
        <StatusMsg state={state} />
      </form>
    </FormSection>
  )
}

export function CambiarPasswordForm() {
  const [state, action, pending] = useActionState(cambiarPasswordAction, {})

  return (
    <FormSection title="Cambiar contraseña">
      <form action={action} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email del usuario</label>
          <input
            name="email"
            type="email"
            required
            placeholder="usuario@ejemplo.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="Mínimo 6 caracteres"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-vimet-orange px-5 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-vimet-red transition-colors"
        >
          {pending ? 'Guardando…' : 'Cambiar contraseña'}
        </button>
        <StatusMsg state={state} />
      </form>
    </FormSection>
  )
}
