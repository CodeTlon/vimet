'use client'

import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'

import { actualizarMetodologiaAction, type ContenidoState } from '@/actions/contenido'
import { useScrollToMessage } from '@/components/seguimiento/use-reset-on-success'

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

type PasoPilar = { titulo: string; desc: string; icon: string }
type Dirigido = { text: string; icon: string }

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
    <div className="relative">
      <select name={name} defaultValue={defaultValue} className={`${inputBase} appearance-none pr-8`}>
        {ICONOS.map((i) => (
          <option key={i} value={i}>
            {i}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
    </div>
  )
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Eliminar"
      className="inline-flex items-center justify-center size-9 rounded-lg text-gray-400 hover:text-vimet-red hover:bg-vimet-red/5 transition-colors self-end"
    >
      <Trash2 className="size-4" />
    </button>
  )
}

function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 text-sm font-semibold text-vimet-orange hover:underline"
    >
      <Plus className="size-4" /> {label}
    </button>
  )
}

export function MetodologiaForm({
  pasos: pasosIniciales,
  pilares: pilaresIniciales,
  dirigidoA: dirigidoAInicial,
}: {
  pasos: readonly PasoPilar[]
  pilares: readonly PasoPilar[]
  dirigidoA: readonly Dirigido[]
}) {
  const [state, formAction] = useFormState<ContenidoState, FormData>(actualizarMetodologiaAction, {})
  const msgRef = useScrollToMessage(state)

  const [pasos, setPasos] = useState<PasoPilar[]>([...pasosIniciales])
  const [pilares, setPilares] = useState<PasoPilar[]>([...pilaresIniciales])
  const [dirigidoA, setDirigidoA] = useState<Dirigido[]>([...dirigidoAInicial])
  // Al guardar con éxito: releer los props recién refrescados por el server
  // (revalidatePath) y forzar un remount del <form> para que los inputs no
  // controlados tomen esos valores como nuevo defaultValue — si no, quedan
  // mostrando lo que había antes de guardar aunque el guardado haya sido ok.
  const [formKey, setFormKey] = useState(0)
  useEffect(() => {
    if (!state.ok) return
    setPasos([...pasosIniciales])
    setPilares([...pilaresIniciales])
    setDirigidoA([...dirigidoAInicial])
    setFormKey((k) => k + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  return (
    <form key={formKey} action={formAction} className="space-y-8">
      <div ref={msgRef}>
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
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-semibold text-gray-900">Pasos del proceso</h3>
          <AddBtn
            label="Agregar paso"
            onClick={() => setPasos((rows) => [...rows, { titulo: '', desc: '', icon: ICONOS[0] }])}
          />
        </div>
        {pasos.map((p, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 grid grid-cols-1 sm:grid-cols-[1fr_1fr_140px_auto] gap-3"
          >
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
            <RemoveBtn onClick={() => setPasos((rows) => rows.filter((_, idx) => idx !== i))} />
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-semibold text-gray-900">Pilares</h3>
          <AddBtn
            label="Agregar pilar"
            onClick={() => setPilares((rows) => [...rows, { titulo: '', desc: '', icon: ICONOS[0] }])}
          />
        </div>
        {pilares.map((p, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 grid grid-cols-1 sm:grid-cols-[1fr_1fr_140px_auto] gap-3"
          >
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
            <RemoveBtn onClick={() => setPilares((rows) => rows.filter((_, idx) => idx !== i))} />
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-semibold text-gray-900">¿A quién va dirigido?</h3>
          <AddBtn
            label="Agregar ítem"
            onClick={() => setDirigidoA((rows) => [...rows, { text: '', icon: ICONOS[0] }])}
          />
        </div>
        {dirigidoA.map((d, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] gap-3"
          >
            <label className="block text-sm">
              <span className="block font-medium text-gray-800 mb-1">Texto {i + 1}</span>
              <input name={`dirigido_${i + 1}_text`} required defaultValue={d.text} className={inputBase} />
            </label>
            <label className="block text-sm">
              <span className="block font-medium text-gray-800 mb-1">Ícono</span>
              <IconSelect name={`dirigido_${i + 1}_icon`} defaultValue={d.icon} />
            </label>
            <RemoveBtn onClick={() => setDirigidoA((rows) => rows.filter((_, idx) => idx !== i))} />
          </div>
        ))}
      </section>

      <Btn />
    </form>
  )
}
