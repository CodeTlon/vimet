'use client'

import { useFormState, useFormStatus } from 'react-dom'

import { actualizarUbicacionAction, type ContenidoState } from '@/actions/contenido'
import { useResetOnSuccess, useScrollToMessage } from '@/components/seguimiento/use-reset-on-success'

const inputBase =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange'

function Btn() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-vimet-gradient text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
    >
      {pending ? 'Guardando…' : 'Guardar'}
    </button>
  )
}

export function UbicacionForm({
  direccion,
  lugar,
  ciudad,
  mapEmbed,
  emailContacto,
  whatsappGeneral,
  instagramHandle,
  instagramUrl,
}: {
  direccion: string
  lugar: string
  ciudad: string
  mapEmbed: string
  emailContacto: string
  whatsappGeneral: string
  instagramHandle: string
  instagramUrl: string
}) {
  const [state, formAction] = useFormState<ContenidoState, FormData>(actualizarUbicacionAction, {})
  const formRef = useResetOnSuccess(state)
  const msgRef = useScrollToMessage(state)

  return (
    <form ref={formRef} action={formAction} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4 max-w-2xl">
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

      <label className="block text-sm">
        <span className="block font-medium text-gray-800 mb-1">Lugar</span>
        <input name="lugar" required defaultValue={lugar} className={inputBase} />
      </label>
      <label className="block text-sm">
        <span className="block font-medium text-gray-800 mb-1">Dirección</span>
        <input name="direccion" required defaultValue={direccion} className={inputBase} />
      </label>
      <label className="block text-sm">
        <span className="block font-medium text-gray-800 mb-1">Ciudad</span>
        <input name="ciudad" required defaultValue={ciudad} className={inputBase} />
      </label>
      <label className="block text-sm">
        <span className="block font-medium text-gray-800 mb-1">URL de mapa embebido</span>
        <input name="map_embed_url" type="url" required defaultValue={mapEmbed} className={inputBase} />
      </label>
      <label className="block text-sm">
        <span className="block font-medium text-gray-800 mb-1">Email de contacto</span>
        <input name="email_contacto" type="email" required defaultValue={emailContacto} className={inputBase} />
      </label>
      <label className="block text-sm">
        <span className="block font-medium text-gray-800 mb-1">WhatsApp (URL wa.me)</span>
        <input name="whatsapp_general" type="url" required defaultValue={whatsappGeneral} className={inputBase} />
      </label>
      <label className="block text-sm">
        <span className="block font-medium text-gray-800 mb-1">Usuario de Instagram</span>
        <input name="instagram_handle" required defaultValue={instagramHandle} className={inputBase} />
      </label>
      <label className="block text-sm">
        <span className="block font-medium text-gray-800 mb-1">URL de Instagram</span>
        <input name="instagram_url" type="url" required defaultValue={instagramUrl} className={inputBase} />
      </label>

      <Btn />
    </form>
  )
}
