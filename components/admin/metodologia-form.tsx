'use client'

import { useFormState, useFormStatus } from 'react-dom'

import { actualizarMetodologiaAction, type ContenidoState } from '@/actions/contenido'
import { useResetOnSuccess } from '@/components/seguimiento/use-reset-on-success'

const inputBase =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange'

const ICONOS = [
  'Users',
  'ClipboardCheck',
  'Scale',
  'Activity',
  'PencilRuler',
  'RefreshCw',
  'TrendingUp',
  'Microscope',
  'SlidersHorizontal',
  'Leaf',
  'HeartPulse',
  'Stethoscope',
]

type PasoPilar = { readonly titulo: string; readonly desc: string; readonly icon: string }
type Dirigido = { readonly text: string; readonly icon: string }

function Btn() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-vimet-gradient text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
    >
      {pending ? 'Guardando…' : 'Guardar metodología'}
    </button>
  )
}

function IconSelect({ name, defaultValue }: { name: string; defaultValue: string }) {
  return (
    <select name={name} defaultValue={defaultValue} className={inputBase}>
      {ICONOS.map((i) => (
        <option key={i} value={i}>
          {i}
        </option>
      ))}
    </select>
  )
}

export function MetodologiaForm({
  pasos,
  pilares,
  dirigidoA,
}: {
  pasos: readonly PasoPilar[]
  pilares: readonly PasoPilar[]
  dirigidoA: readonly Dirigido[]
}) {
  const [state, formAction] = useFormState<ContenidoState, FormData>(actualizarMetodologiaAction, {})
  const formRef = useResetOnSuccess(state)

  return (
    <form ref={formRef} action={formAction} className="space-y-8">
      {state.error ? (
        <div className="rounded-lg bg-vimet-red/10 border border-vimet-red/20 px-4 py-2 text-sm text-vimet-red">
          {state.error}
        </div>
      ) : null}
      {state.ok ? (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">
          Guardado.
        </div>
      ) : null}

      <section className="space-y-4">
        <h3 className="font-heading font-semibold text-gray-900">Pasos del proceso</h3>
        {pasos.map((p, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 grid grid-cols-1 sm:grid-cols-[1fr_1fr_140px] gap-3">
            <label className="block text-sm">
              <span className="block font-medium text-gray-800 mb-1">Título {i + 1}</span>
              <input name={`paso_${i + 1}_titulo`} required defaultValue={p.titulo} className={inputBase} />
            </label>
            <label className="block text-sm">
              <span className="block font-medium text-gray-800 mb-1">Descripción</span>
              <input name={`paso_${i + 1}_desc`} required defaultValue={p.desc} className={inputBase} />
            </label>
            <label className="block text-sm">
              <span className="block font-medium text-gray-800 mb-1">Ícono</span>
              <IconSelect name={`paso_${i + 1}_icon`} defaultValue={p.icon} />
            </label>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h3 className="font-heading font-semibold text-gray-900">Pilares</h3>
        {pilares.map((p, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 grid grid-cols-1 sm:grid-cols-[1fr_1fr_140px] gap-3">
            <label className="block text-sm">
              <span className="block font-medium text-gray-800 mb-1">Título {i + 1}</span>
              <input name={`pilar_${i + 1}_titulo`} required defaultValue={p.titulo} className={inputBase} />
            </label>
            <label className="block text-sm">
              <span className="block font-medium text-gray-800 mb-1">Descripción</span>
              <input name={`pilar_${i + 1}_desc`} required defaultValue={p.desc} className={inputBase} />
            </label>
            <label className="block text-sm">
              <span className="block font-medium text-gray-800 mb-1">Ícono</span>
              <IconSelect name={`pilar_${i + 1}_icon`} defaultValue={p.icon} />
            </label>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h3 className="font-heading font-semibold text-gray-900">¿A quién va dirigido?</h3>
        {dirigidoA.map((d, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3">
            <label className="block text-sm">
              <span className="block font-medium text-gray-800 mb-1">Texto {i + 1}</span>
              <input name={`dirigido_${i + 1}_text`} required defaultValue={d.text} className={inputBase} />
            </label>
            <label className="block text-sm">
              <span className="block font-medium text-gray-800 mb-1">Ícono</span>
              <IconSelect name={`dirigido_${i + 1}_icon`} defaultValue={d.icon} />
            </label>
          </div>
        ))}
      </section>

      <Btn />
    </form>
  )
}
