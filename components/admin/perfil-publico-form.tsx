'use client'

import { useFormState, useFormStatus } from 'react-dom'

import { actualizarPerfilPublicoAction, type ContenidoState } from '@/actions/contenido'
import { useResetOnSuccess, useScrollToMessage } from '@/components/seguimiento/use-reset-on-success'

const inputBase =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange'

const AREA_ICONOS = ['Activity', 'Scale', 'Pill', 'HeartPulse', 'Dumbbell', 'Stethoscope', 'Shield']

type AreaTrabajo = { readonly icon: string; readonly title: string; readonly desc: string }

function Btn() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-vimet-gradient text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
    >
      {pending ? 'Guardando…' : 'Guardar perfil'}
    </button>
  )
}

export function PerfilPublicoForm({
  profileId,
  nombre,
  titulo,
  matricula,
  fotoUrl,
  instagramHandle,
  instagramUrl,
  whatsappUrl,
  bioCorta,
  bio,
  especialidades,
  areasTrabajo,
}: {
  profileId: string
  nombre: string
  titulo: string
  matricula: string
  fotoUrl: string
  instagramHandle: string
  instagramUrl: string
  whatsappUrl: string
  bioCorta: string
  bio: string
  especialidades: readonly string[]
  areasTrabajo: readonly AreaTrabajo[]
}) {
  const [state, formAction] = useFormState<ContenidoState, FormData>(actualizarPerfilPublicoAction, {})
  const formRef = useResetOnSuccess(state)
  const msgRef = useScrollToMessage(state)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="font-heading font-semibold text-gray-900 mb-1">Perfil público — {nombre}</h2>
      <p className="text-sm text-gray-500 mb-5">
        Esta información se muestra en la página pública &quot;Nosotros&quot;.
      </p>

      <form ref={formRef} action={formAction} className="space-y-4" encType="multipart/form-data">
        <input type="hidden" name="profile_id" value={profileId} />

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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="block font-medium text-gray-800 mb-1">Título profesional</span>
            <input name="titulo" defaultValue={titulo} className={inputBase} />
          </label>
          <label className="block text-sm">
            <span className="block font-medium text-gray-800 mb-1">Matrícula</span>
            <input name="matricula" defaultValue={matricula} className={inputBase} />
          </label>
        </div>

        <label className="block text-sm">
          <span className="block font-medium text-gray-800 mb-1">Foto de perfil</span>
          {fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fotoUrl} alt="" className="w-16 h-16 rounded-full object-cover mb-2" />
          ) : null}
          <input type="file" name="foto" accept="image/jpeg,image/png,image/webp" className={inputBase} />
        </label>

        <label className="block text-sm">
          <span className="block font-medium text-gray-800 mb-1">Bio corta</span>
          <input name="bio_corta" defaultValue={bioCorta} className={inputBase} />
        </label>
        <label className="block text-sm">
          <span className="block font-medium text-gray-800 mb-1">Bio completa</span>
          <textarea name="bio" rows={4} defaultValue={bio} className={inputBase} />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="block font-medium text-gray-800 mb-1">Usuario de Instagram</span>
            <input name="instagram_handle" defaultValue={instagramHandle} className={inputBase} />
          </label>
          <label className="block text-sm">
            <span className="block font-medium text-gray-800 mb-1">URL de Instagram</span>
            <input name="instagram_url" type="url" defaultValue={instagramUrl} className={inputBase} />
          </label>
        </div>

        <label className="block text-sm">
          <span className="block font-medium text-gray-800 mb-1">URL de WhatsApp (wa.me)</span>
          <input name="whatsapp_url" type="url" defaultValue={whatsappUrl} className={inputBase} />
        </label>

        <label className="block text-sm">
          <span className="block font-medium text-gray-800 mb-1">Especialidades (separadas por coma)</span>
          <input
            name="especialidades"
            defaultValue={especialidades.join(', ')}
            className={inputBase}
          />
        </label>

        <div className="space-y-3">
          <span className="block font-medium text-gray-800 text-sm">Áreas de trabajo</span>
          {areasTrabajo.map((a, i) => (
            <div
              key={i}
              className="grid grid-cols-1 sm:grid-cols-[140px_1fr_1fr] gap-3 border border-gray-100 rounded-lg p-3"
            >
              <select name={`area_${i + 1}_icon`} defaultValue={a.icon} className={inputBase}>
                {AREA_ICONOS.map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </select>
              <input name={`area_${i + 1}_title`} defaultValue={a.title} placeholder="Título" className={inputBase} />
              <input name={`area_${i + 1}_desc`} defaultValue={a.desc} placeholder="Descripción" className={inputBase} />
            </div>
          ))}
        </div>

        <Btn />
      </form>
    </div>
  )
}
