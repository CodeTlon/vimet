import { render } from '@react-email/components'
import { Resend } from 'resend'
import type { ReactElement } from 'react'

import { brand } from '@/lib/config/team'
import { aplicarSandboxEmail, limpiarValorEnv } from '@/lib/email/sandbox'

// Mails de autenticacion. A diferencia de enviarEmailTurno (best-effort), un fallo aca
// IMPORTA: si no sale el codigo o el enlace el usuario queda bloqueado. Por eso lanza.
// Mismo remitente y sandbox por entorno que lib/email/resend.ts.
export async function enviarEmailAuth(args: { to: string; subject: string; react: ReactElement }): Promise<void> {
  const apiKey = limpiarValorEnv(process.env.RESEND_API_KEY)
  const from = limpiarValorEnv(process.env.RESEND_FROM_EMAIL)
  if (!apiKey || !from) throw new Error('Falta RESEND_API_KEY o RESEND_FROM_EMAIL: no se puede enviar el mail de autenticacion.')

  // Politica de correo por entorno (lib/email/sandbox.ts): en test todo va a MAIL_SANDBOX_TO y en
  // produccion se niega el remitente de pruebas. Lanza si la configuracion es insegura.
  const destino = aplicarSandboxEmail({ from, to: [args.to], subject: args.subject })

  const html = await render(args.react)
  const { error } = await new Resend(apiKey).emails.send({
    from: `${brand.name} <${from}>`,
    to: destino.to,
    subject: destino.subject,
    html,
  })
  if (error) throw new Error(`Resend rechazo el mail de autenticacion: ${error.message}`)
}
