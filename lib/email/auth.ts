import { render } from '@react-email/components'
import { Resend } from 'resend'
import type { ReactElement } from 'react'

import { brand } from '@/lib/config/team'

// Mails de autenticacion. A diferencia de enviarEmailTurno (best-effort), un fallo aca
// IMPORTA: si no sale el codigo o el enlace el usuario queda bloqueado. Por eso lanza.
// Mismo criterio que lib/email/resend.ts para remitente y sandbox por entorno (APP_ENV).
export async function enviarEmailAuth(args: { to: string; subject: string; react: ReactElement }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.RESEND_FROM_EMAIL?.trim()
  if (!apiKey || !from) throw new Error('Falta RESEND_API_KEY o RESEND_FROM_EMAIL: no se puede enviar el mail de autenticacion.')

  const sandboxTo = process.env.MAIL_SANDBOX_TO?.trim()
  const appEnv = (process.env.APP_ENV ?? '').trim().toLowerCase()
  if (appEnv === 'test' && !sandboxTo) throw new Error('APP_ENV=test requiere MAIL_SANDBOX_TO.')
  if (appEnv === 'production' && (sandboxTo || from.toLowerCase().includes('onboarding@resend.dev'))) {
    throw new Error('Configuracion de test detectada en produccion: no se envia mail.')
  }
  const to = sandboxTo || args.to
  const subject = sandboxTo ? `[TEST → ${args.to}] ${args.subject}` : args.subject

  const html = await render(args.react)
  const { error } = await new Resend(apiKey).emails.send({ from: `${brand.name} <${from}>`, to: [to], subject, html })
  if (error) throw new Error(`Resend rechazo el mail de autenticacion: ${error.message}`)
}
