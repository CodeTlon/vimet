import { headers } from 'next/headers'

// ponytail: limitador en memoria por instancia — no comparte estado entre
// instancias serverless ni sobrevive a un cold start. Alcanza para frenar
// scripts básicos (brute-force de código de recuperación, spam de contacto,
// email bombing). Si el tráfico crece a multi-instancia en serio, pasar a
// Upstash/Redis con la misma firma.
const intentos = new Map<string, number[]>()

/** true si la request está dentro del límite, false si hay que rechazarla. */
export function rateLimit(key: string, limite: number, ventanaMs: number): boolean {
  const ahora = Date.now()
  const previos = (intentos.get(key) ?? []).filter((t) => ahora - t < ventanaMs)
  if (previos.length >= limite) {
    intentos.set(key, previos)
    return false
  }
  previos.push(ahora)
  intentos.set(key, previos)
  // limpieza perezosa para no crecer indefinidamente
  if (intentos.size > 5000) {
    for (const [k, v] of intentos) {
      if (v.every((t) => ahora - t >= ventanaMs)) intentos.delete(k)
    }
  }
  return true
}

export async function ipDeLaRequest(): Promise<string> {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'desconocida'
}

export function ipDeRequest(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'desconocida'
  )
}
