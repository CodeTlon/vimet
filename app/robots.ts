import type { MetadataRoute } from 'next'

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
    sitemap: 'https://vimet.com.ar/sitemap.xml',
  }
}
