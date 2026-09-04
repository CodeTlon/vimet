import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Next-Action real es un hash hex de 40-64 chars. Scanners mandan valores
// tipo "x"/"0"/"action" probando encontrar endpoints — cortarlos acá evita
// que gasten cómputo de auth/render y ensucien logs.
const VALID_NEXT_ACTION_ID = /^[a-f0-9]{40,64}$/i

export async function proxy(request: NextRequest) {
  const nextAction = request.headers.get('next-action')
  if (nextAction && !VALID_NEXT_ACTION_ID.test(nextAction)) {
    return new NextResponse('Invalid Next-Action', { status: 400 })
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)',
  ],
}
