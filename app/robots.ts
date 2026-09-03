import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/lib/config/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/', '/api/', '/login', '/registro', '/auth/',
        '/mi-ficha', '/mi-progreso', '/mis-objetivos', '/mis-planes',
        '/mis-recursos', '/mis-turnos', '/feedback-semanal',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
