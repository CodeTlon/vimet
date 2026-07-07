import type { MetadataRoute } from 'next'

const BASE_URL = 'https://vimet.com.ar'

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/servicios', '/metodologia', '/nosotros', '/faq', '/contacto', '/turnos/nuevo', '/privacidad', '/terminos']
  return routes.map((path) => ({
    url: `${BASE_URL}${path}`,
    changeFrequency: path === '' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : path.startsWith('/turnos') ? 0.9 : 0.7,
  }))
}
