'use client'

import { useActionState } from 'react'

import { asignarRolAction, cambiarPasswordAction, reasignarServiciosAction, type StaffState } from '@/actions/staff'

const ROLES = [
  { value: 'nutricionista', label: 'Nutricionista' },
  { value: 'entrenador', label: 'Entrenador' },
  { value: 'admin', label: 'Admin' },
  { value: 'paciente', label: 'Paciente' },
]

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-5">{title}</h2>
      {children}
    </div>
  )
}

function StatusMsg({ state }: { state: StaffState }) {
  if (!state.ok && !state.error) return null
  return (
    <p
      className={`text-sm mt-3 ${state.ok ? 'text-green-600' : 'text-red-600'}`}
    >
      {state.ok ? 'Guardado correctamente.' : state.error}
    </p>
  )
}

export function AsignarRolForm() {
  const [state, action, pending] = useActionState(asignarRolAction, {})

  return (
    <FormSection title="Asignar rol a usuario">
      <form action={action} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
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
            name="rol"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-vimet-orange px-5 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-vimet-red transition-colors"
        >
          {pending ? 'Guardando…' : 'Asignar rol'}
        </button>
        <StatusMsg state={state} />
      </form>
    </FormSection>
  )
}

export function ReasignarServiciosForm() {
  const [state, action, pending] = useActionState(reasignarServiciosAction, {})

  return (
    <FormSection title="Reasignar servicios y horarios">
      <p className="text-sm text-gray-500 mb-4">
        Mueve todos los servicios y horarios de un profesional a otro. Útil para cambiar qué cuenta actúa como nutricionista o entrenador.
      </p>
      <form action={action} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email origen (tiene los servicios ahora)</label>
          <input
            name="email_origen"
            type="email"
            required
            placeholder="origen@ejemplo.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email destino (recibirá los servicios)</label>
          <input
            name="email_destino"
            type="email"
            required
            placeholder="destino@ejemplo.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-vimet-orange px-5 py-2 text-sm font-semibold text-white disabled:opacity-60 hover:bg-vimet-red transition-colors"
        >
          {pending ? 'Reasignando…' : 'Reasignar'}
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
