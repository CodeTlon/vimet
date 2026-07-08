import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as EmailOtpType | null
  const next = url.searchParams.get('next') ?? '/'

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
