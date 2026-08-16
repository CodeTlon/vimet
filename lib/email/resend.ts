import { Resend } from 'resend'
import type { ReactElement } from 'react'

import { brand } from '@/lib/config/team'

type EnviarEmailTurno = {
  to: string
  subject: string
  react: ReactElement
}

// Best-effort: nunca lanza. Si falta RESEND_API_KEY/RESEND_FROM_EMAIL o el
// envío falla (ver quirk de sandbox sin dominio verificado en CLAUDE.md),
// loguea y sigue — ninguna notificación de turnos debe bloquear el flujo
// que la origina (reservar, confirmar, cancelar, reprogramar).
export async function enviarEmailTurno({ to, subject, react }: EnviarEmailTurno): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from) return

  try {
    const resend = new Resend(apiKey)
    await resend.emails.send({ from: `${brand.name} <${from}>`, to: [to], subject, react })
  } catch (err) {
    console.error(`No se pudo enviar el email "${subject}" a ${to}`, err)
  }
}
