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

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as EmailOtpType | null
  const next = safeNextPath(url.searchParams.get('next'))

  const supabase = createClient()

  let error = null
  if (code) {
    ;({ error } = await supabase.auth.exchangeCodeForSession(code))
  } else if (tokenHash && type) {
    ;({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }))
  }

  // Link de un solo uso ya consumido (ej: escáner de email que pre-visita el
  // link) o vencido: no había sesión que crear, así que no seguimos a `next`
  // fingiendo que funcionó.
  if (error) {
    return NextResponse.redirect(new URL('/auth/recuperar?expired=1', url.origin))
  }

  return NextResponse.redirect(new URL(next, url.origin))
}
