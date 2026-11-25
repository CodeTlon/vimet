/**
 * Politica de correo por entorno (estandar CodeTlon, entornos.md "Correo en test").
 *
 *  - APP_ENV=test        -> siempre sandbox: todo mail va a MAIL_SANDBOX_TO y el
 *                           destinatario original queda en el asunto. Sin
 *                           MAIL_SANDBOX_TO no se envia nada (fail-closed).
 *  - APP_ENV=production  -> sale normal; se niega si hay MAIL_SANDBOX_TO o si el
 *                           remitente es onboarding@resend.dev.
 *  - otro / sin definir  -> pasa tal cual (con MAIL_SANDBOX_TO redirige igual).
 *
 * Cargar las variables SIN comillas en Coolify; `limpiarValorEnv` las quita
 * igual como red de seguridad.
 */
const REMITENTE_DE_PRUEBAS = 'onboarding@resend.dev'

export function limpiarValorEnv(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  const v = value.trim()
  if (v.length >= 2 && (v[0] === '"' || v[0] === "'") && v[v.length - 1] === v[0]) {
    return v.slice(1, -1).trim()
  }
  return v
}

type EntradaSandbox = {
  appEnv?: string
  sandboxTo?: string
  from: string
  to: string[]
  subject: string
}

export function resolverDestinoEmail(input: EntradaSandbox): { to: string[]; subject: string } {
  const appEnv = (input.appEnv ?? '').trim().toLowerCase()
  const sandboxTo = (input.sandboxTo ?? '').trim()

  if (appEnv === 'production') {
    if (sandboxTo) {
      throw new Error('MAIL_SANDBOX_TO esta definida en produccion: configuracion de test filtrada a prod.')
    }
    if (input.from.toLowerCase().includes(REMITENTE_DE_PRUEBAS)) {
      throw new Error(`Produccion no puede enviar desde el remitente de pruebas (${REMITENTE_DE_PRUEBAS}).`)
    }
    return { to: input.to, subject: input.subject }
  }
  if (appEnv === 'test' && !sandboxTo) {
    throw new Error('APP_ENV=test requiere MAIL_SANDBOX_TO: no se envia mail desde test sin sandbox.')
  }
  if (sandboxTo) {
    return { to: [sandboxTo], subject: `[TEST -> ${input.to.join(', ')}] ${input.subject}` }
  }
  return { to: input.to, subject: input.subject }
}

/** Resuelve destino y asunto leyendo el entorno del proceso. Puede lanzar (fail-closed). */
export function aplicarSandboxEmail(args: { from: string; to: string[]; subject: string }) {
  return resolverDestinoEmail({
    appEnv: process.env.APP_ENV,
    sandboxTo: limpiarValorEnv(process.env.MAIL_SANDBOX_TO),
    ...args,
  })
}
