import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/registro')
  const isProtected =
    pathname.startsWith('/mis-turnos') ||
    pathname.startsWith('/mi-ficha') ||
    pathname.startsWith('/mi-progreso') ||
    pathname.startsWith('/mis-planes') ||
    pathname.startsWith('/mis-objetivos') ||
    pathname.startsWith('/feedback-semanal') ||
    pathname.startsWith('/turnos') ||
    pathname.startsWith('/admin')

  // Páginas públicas (home, nosotros, servicios, etc.) no gatean nada acá ni
  // consumen la sesión server-side — el navbar la resuelve client-side. Nos
  // ahorramos el round-trip a Supabase Auth (getUser) que agregaba latencia
  // en cada recarga sin necesidad real de refrescar el token en ese request.
  if (!isProtected && !isAuthRoute) {
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    const { data: profile } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', user.id)
      .maybeSingle()
    const isStaff = profile?.rol && ['nutricionista', 'entrenador', 'admin'].includes(profile.rol)
    url.pathname = isStaff ? '/admin/dashboard' : '/mis-turnos'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}
