import { getSessionCookie } from 'better-auth/cookies'
import { NextResponse, type NextRequest } from 'next/server'

// Next-Action real es un hash hex de 40-64 chars. Scanners mandan valores
// tipo "x"/"0"/"action" probando encontrar endpoints — cortarlos acá evita
// que gasten cómputo de auth/render y ensucien logs.
const VALID_NEXT_ACTION_ID = /^[a-f0-9]{40,64}$/i

// Rutas que exigen sesión. Es un redirect OPTIMISTA por presencia de cookie: NO es seguridad.
// La sesión real se valida en cada página/acción (requireAuth/requireStaff) y en cada ruta de API.
const PROTEGIDAS = ['/mis-', '/mi-', '/feedback-semanal', '/turnos/', '/admin', '/planes/']

export async function proxy(request: NextRequest) {
  const nextAction = request.headers.get('next-action')
  if (nextAction && !VALID_NEXT_ACTION_ID.test(nextAction)) {
    return new NextResponse('Invalid Next-Action', { status: 400 })
  }

  const { pathname } = request.nextUrl
  if (PROTEGIDAS.some((p) => pathname.startsWith(p)) && !getSessionCookie(request)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)',
  ],
}
