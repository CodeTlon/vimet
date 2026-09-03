import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder',
    {
      // httpOnly no se puede forzar acá: @supabase/ssr necesita que el cliente
      // browser (lib/supabase/client.ts, createBrowserClient) lea/escriba esta
      // misma cookie vía document.cookie para el flow de invite por hash y el
      // three-state de sesión del navbar — con httpOnly:true el login client-side
      // se rompe. `secure` sí se puede endurecer sin romper nada: forzado solo en
      // producción (en dev, Next corre sobre http://localhost y una cookie Secure
      // no se setearía, rompiendo el login local).
      cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
      },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Llamado desde un Server Component — set() falla silenciosamente.
            // El middleware refresca la sesión.
          }
        },
      },
    },
  )
}
