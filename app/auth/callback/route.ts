import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/server'

// Solo permitimos redirigir a un path relativo interno del sitio. `next` viene
// de un query param controlado por quien arma el link (ej: un mail de invite
// reenviado con `next` alterado) — sin este chequeo, `new URL(next, origin)`
// deja pasar una URL absoluta (`https://evil.com`) y pisa el origin (open redirect).
function safeNextPath(next: string | null): string {
  if (!next) return '/'
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/'
  try {
    // Si `next` parsea como URL propia (esquema/host), es absoluta → rechazar.
    new URL(next)
    return '/'
  } catch {
    return next
  }
}

const esConfirmacionDeEmail = (type: EmailOtpType | null) => type === 'signup' || type === 'email'

// El origin NO se puede sacar de `request.url`. En el deploy de vimetsalud.com.ar
// la app corre detrás de un reverse proxy que reescribe el Host a localhost:3000
// (no manda X-Forwarded-Host), así que `new URL(request.url).origin` devuelve
// "https://localhost:3000" y todos los redirects de acá terminaban en un link
// muerto — verificado en vivo: GET /auth/callback devolvía
// `Location: https://localhost:3000/`. En Vercel el mismo código funciona, por
// eso pasó desapercibido. La env es la única fuente confiable del dominio;
// `request.url` queda de fallback para dev local.
function siteOrigin(fallback: string): string {
  const configurada = process.env.NEXT_PUBLIC_SITE_URL
  if (!configurada) return fallback
  try {
    return new URL(configurada).origin
  } catch {
    return fallback
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const origin = siteOrigin(url.origin)
  const code = url.searchParams.get('code')
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as EmailOtpType | null
  const next = safeNextPath(url.searchParams.get('next'))

  const supabase = await createClient()

  let error = null
  if (code) {
    ;({ error } = await supabase.auth.exchangeCodeForSession(code))
  } else if (tokenHash && type) {
    ;({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }))
  }

  // Link de un solo uso ya consumido (ej: escáner de email que pre-visita el
  // link) o vencido: no había sesión que crear, así que no seguimos a `next`
  // fingiendo que funcionó. El destino depende del flujo: mandar una
  // confirmación de registro fallida a "recuperar contraseña" no tiene sentido.
  if (error) {
    const destino = type === 'recovery' ? '/auth/recuperar?expired=1' : '/login?linkinvalido=1'
    return NextResponse.redirect(new URL(destino, origin))
  }

  // Confirmación de registro: `verifyOtp` deja la sesión abierta, pero la cuenta
  // sigue `activo=false` hasta que un admin la active. Si la dejamos viva, el
  // middleware ve un `user` al entrar a /login y lo redirige a /mis-turnos,
  // metiendo adentro a un usuario sin activar. `scope: 'local'` alcanza y evita
  // el round-trip de revocación global (mismo criterio que LogoutButton).
  // `signup` y `email` son ambos válidos para el mismo token de confirmación
  // (la plantilla nuestra usa `signup`, los ejemplos de Supabase usan `email`).
  if (esConfirmacionDeEmail(type)) {
    await supabase.auth.signOut({ scope: 'local' })
  }

  return NextResponse.redirect(new URL(next, origin))
}
