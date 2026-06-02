'use server'

import { Resend } from 'resend'
import { z } from 'zod'

import ContactoEmail from '@/emails/contacto'
import { brand } from '@/lib/config/team'

export type ContactoState = {
  ok?: boolean
  error?: string
  fields?: { nombre: string; email: string; telefono: string; mensaje: string }
}

const schema = z.object({
  nombre: z.string().trim().min(2, 'Nombre demasiado corto').max(100),
  email: z.string().trim().email('Email inválido').max(200),
  telefono: z.string().trim().max(40).optional().default(''),
  mensaje: z.string().trim().min(10, 'Contanos un poco más en el mensaje').max(2000),
})

export async function contactoAction(
  _prev: unknown,
  formData: FormData,
): Promise<ContactoState> {
  const fields = {
    nombre: String(formData.get('nombre') ?? ''),
    email: String(formData.get('email') ?? ''),
    telefono: String(formData.get('telefono') ?? ''),
    mensaje: String(formData.get('mensaje') ?? ''),
  }

  const parsed = schema.safeParse(fields)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos', fields }
  }

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
  const to = process.env.COMPANY_EMAIL ?? 'hola@vimet.com'

  if (!apiKey) {
    return { error: 'El servicio de email no está configurado.', fields }
  }

  try {
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from: `${brand.name} <${from}>`,
      to: [to],
      replyTo: parsed.data.email,
      subject: `Nuevo mensaje de contacto · ${parsed.data.nombre}`,
      react: ContactoEmail({
        nombre: parsed.data.nombre,
        email: parsed.data.email,
        telefono: parsed.data.telefono,
        mensaje: parsed.data.mensaje,
      }),
    })
    if (error) {
      return { error: 'No pudimos enviar el mensaje. Intentá de nuevo más tarde.', fields }
    }
  } catch {
    return { error: 'No pudimos enviar el mensaje. Intentá de nuevo más tarde.', fields }
  }

  return { ok: true }
}
