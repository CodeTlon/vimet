// Cliente del servicio global de compresión de video (codetlon-cloud/templates/video-transcode, regla en video-transcode.md).
// Solo servidor: la API key no llega nunca al navegador.
// Soft-fail: si el servicio no está configurado, no responde o falla, devuelve null y quien llama guarda el original.

export type TranscodePreset = 'hero' | 'web' | 'mobile'

// Servicio compartido de toda la flota: por proyecto solo hace falta TRANSCODE_API_KEY (la URL se puede pisar con TRANSCODE_SERVICE_URL).
const DEFAULT_URL = 'https://videotranscode.51.91.253.54.sslip.io'
const TIMEOUT_MS = 10 * 60_000

export async function transcodeWithService(input: Buffer, preset: TranscodePreset = 'web'): Promise<Buffer | null> {
  const key = process.env.TRANSCODE_API_KEY
  if (!key) return null
  const url = (process.env.TRANSCODE_SERVICE_URL || DEFAULT_URL).replace(/\/$/, '')

  const body = new FormData()
  body.append('file', new Blob([new Uint8Array(input)]), 'video')

  try {
    const res = await fetch(`${url}/v1/transcode?preset=${preset}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) {
      console.error(`[transcode] el servicio respondió ${res.status}; se guarda el original`)
      return null
    }
    const out = Buffer.from(await res.arrayBuffer())
    // Una "compresión" que pesa más que el original no sirve: ya venía optimizado.
    return out.length > 0 && out.length < input.length ? out : null
  } catch (e) {
    console.error('[transcode] no se pudo contactar al servicio; se guarda el original:', e instanceof Error ? e.message : e)
    return null
  }
}
