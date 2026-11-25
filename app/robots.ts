import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/lib/config/site'

// Se resuelve por request: APP_ENV es variable de runtime (no de build) y la misma imagen sirve test y prod.
export const dynamic = 'force-dynamic'

export default function robots(): MetadataRoute.Robots {
  // Fuera de produccion (test.vimetsalud.com.ar, previews) no se indexa nada: duplicaria el sitio real.
  if (process.env.APP_ENV !== 'production') {
    return { rules: { userAgent: '*', disallow: '/' } }
  }
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/', '/api/', '/login', '/registro', '/auth/',
        '/mi-ficha', '/mi-progreso', '/mis-objetivos', '/mis-planes',
        '/mis-recursos', '/mis-turnos', '/feedback-semanal', '/planes/',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
