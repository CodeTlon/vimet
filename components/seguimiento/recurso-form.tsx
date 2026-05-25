'use client'

import { FileImage, FileText, Link2, PlusCircle, Video } from 'lucide-react'
import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'

import { crearRecursoAction, type RecursoState } from '@/actions/recursos'

const initial: RecursoState = {}

const TIPOS = [
  { value: 'link',   label: 'Link externo', icon: Link2,      accept: '',                                                  hint: '' },
  { value: 'pdf',    label: 'PDF',          icon: FileText,   accept: '.pdf,application/pdf',                              hint: 'PDF · máx 20 MB' },
  { value: 'imagen', label: 'Imagen',       icon: FileImage,  accept: 'image/jpeg,image/png,image/webp,image/gif',         hint: 'JPG, PNG, WEBP, GIF · máx 10 MB' },
  { value: 'video',  label: 'Video',        icon: Video,      accept: 'video/mp4,video/webm,video/quicktime',              hint: 'MP4, WEBM, MOV · máx 100 MB' },
] as const

type TipoValue = (typeof TIPOS)[number]['value']

const inputBase =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange'

function Btn() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-vimet-gradient text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
    >
      <PlusCircle className="size-4" />
      {pending ? 'Guardando…' : 'Agregar recurso'}
    </button>
  )
}

export function RecursoForm({ pacienteId }: { pacienteId: string }) {
  const [tipo, setTipo]   = useState<TipoValue>('link')
  const [state, action]   = useFormState(crearRecursoAction, initial)

  const tipoInfo = TIPOS.find((t) => t.value === tipo)!

  return (
    <form
      action={action}
      encType="multipart/form-data"
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4"
    >
      <input type="hidden" name="paciente_id" value={pacienteId} />
      <input type="hidden" name="tipo" value={tipo} />

      <h3 className="font-heading font-semibold text-gray-900">Nuevo recurso</h3>

      {state.error ? (
        <div className="rounded-lg bg-vimet-red/10 border border-vimet-red/20 px-4 py-2 text-sm text-vimet-red">
          {state.error}
        </div>
      ) : null}
      {state.ok ? (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">
          Recurso agregado correctamente.
        </div>
      ) : null}

      {/* Selector de tipo */}
      <div>
        <span className="block text-sm font-medium text-gray-800 mb-2">Tipo</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TIPOS.map((t) => {
            const Icon     = t.icon
            const selected = tipo === t.value
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setTipo(t.value)}
                className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-xs font-medium transition-colors ${
                  selected
                    ? 'border-vimet-orange bg-vimet-cream text-vimet-orange'
                    : 'border-gray-200 text-gray-700 hover:border-vimet-orange/40 hover:text-vimet-orange'
                }`}
              >
                <Icon className="size-5" />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* URL o archivo */}
      {tipo === 'link' ? (
        <label className="block text-sm">
          <span className="block font-medium text-gray-800 mb-1">URL *</span>
          <input
            type="url"
            name="url"
            required
            placeholder="https://youtube.com/watch?v=..."
            className={inputBase}
          />
        </label>
      ) : (
        <label className="block text-sm">
          <span className="block font-medium text-gray-800 mb-1">Archivo *</span>
          <input
            type="file"
            name="archivo"
            required
            accept={tipoInfo.accept}
            className="w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-vimet-cream file:text-vimet-orange hover:file:bg-vimet-orange/10 cursor-pointer"
          />
          {tipoInfo.hint ? (
            <span className="text-xs text-gray-400 mt-1 block">{tipoInfo.hint}</span>
          ) : null}
        </label>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <label className="block">
          <span className="block font-medium text-gray-800 mb-1">Título *</span>
          <input type="text" name="titulo" required maxLength={200} className={inputBase} />
        </label>
        <label className="block">
          <span className="block font-medium text-gray-800 mb-1">Categoría</span>
          <select name="categoria" defaultValue="otro" className={inputBase}>
            <option value="ejercicio">Ejercicio</option>
            <option value="nutricion">Nutrición</option>
            <option value="progreso">Progreso</option>
            <option value="educativo">Educativo</option>
            <option value="otro">Otro</option>
          </select>
        </label>
      </div>

      <label className="block text-sm">
        <span className="block font-medium text-gray-800 mb-1">Descripción</span>
        <textarea name="descripcion" rows={2} maxLength={1000} className={inputBase} />
      </label>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="block text-sm">
          <span className="block font-medium text-gray-800 mb-1">Visible al paciente</span>
          <select name="visible_paciente" defaultValue="false" className={`${inputBase} w-auto`}>
            <option value="false">No — solo el staff</option>
            <option value="true">Sí — el paciente puede verlo</option>
          </select>
        </label>
        <Btn />
      </div>
    </form>
  )
}
