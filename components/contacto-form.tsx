'use client'

import { CheckCircle2, Send } from 'lucide-react'
import { useFormState, useFormStatus } from 'react-dom'

import { contactoAction, type ContactoState } from '@/actions/contacto'

const initialState: ContactoState = {}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-vimet-gradient text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? 'Enviando…' : (
        <>
          <Send className="size-4" /> Enviar mensaje
        </>
      )}
    </button>
  )
}

export function ContactoForm() {
  const [state, formAction] = useFormState(contactoAction, initialState)

  if (state.ok) {
    return (
      <div className="rounded-2xl bg-white border border-vimet-orange/30 p-8 shadow-md text-center">
        <div className="size-14 mx-auto rounded-full bg-vimet-cream text-vimet-orange flex items-center justify-center">
          <CheckCircle2 className="size-7" />
        </div>
        <h3 className="mt-4 font-heading text-xl font-semibold text-gray-900">
          ¡Mensaje enviado!
        </h3>
        <p className="mt-2 text-sm text-gray-700 leading-relaxed max-w-sm mx-auto">
          Te respondemos a la brevedad. Si necesitás algo urgente, escribinos por WhatsApp.
        </p>
      </div>
    )
  }

  const f = state.fields ?? { nombre: '', email: '', telefono: '', mensaje: '' }

  return (
    <form
      action={formAction}
      className="rounded-2xl bg-white border border-gray-100 p-6 sm:p-8 shadow-md"
    >
      <h3 className="font-heading text-xl font-semibold text-gray-900 mb-5">
        Envianos un mensaje
      </h3>

      {state.error ? (
        <div
          role="alert"
          className="mb-5 rounded-lg bg-vimet-red/10 border border-vimet-red/20 px-4 py-3 text-sm text-vimet-red"
        >
          {state.error}
        </div>
      ) : null}

      <div className="space-y-4">
        <Field label="Nombre" name="nombre" defaultValue={f.nombre} placeholder="Tu nombre y apellido" required />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Email" name="email" type="email" defaultValue={f.email} placeholder="tu@email.com" required />
          <Field label="Teléfono" name="telefono" type="tel" defaultValue={f.telefono} placeholder="Ej: 3513752818" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1.5">Mensaje</label>
          <textarea
            name="mensaje"
            required
            minLength={10}
            rows={5}
            defaultValue={f.mensaje}
            placeholder="¿En qué podemos ayudarte?"
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange"
          />
        </div>
        <SubmitButton />
      </div>
    </form>
  )
}

function Field({
  label,
  name,
  type = 'text',
  defaultValue,
  placeholder,
  required,
}: {
  label: string
  name: string
  type?: string
  defaultValue?: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-800 mb-1.5">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-vimet-orange/40 focus:border-vimet-orange"
      />
    </div>
  )
}
