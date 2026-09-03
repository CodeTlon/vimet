// Fuente única de verdad para el dominio base del sitio.
// Se usa en app/layout.tsx (metadataBase), app/robots.ts y app/sitemap.ts
// para que los tres queden siempre consistentes entre sí.
//
// NEXT_PUBLIC_SITE_URL se configura por entorno en Vercel (ver .env.example).
// El fallback es el dominio final del proyecto (vimetsalud.com.ar) — nunca
// localhost — para que un build de producción sin la env var seteada no
// termine publicando URLs de localhost en el sitemap/robots/canonical.
const RAW_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vimetsalud.com.ar'

export const SITE_URL = RAW_SITE_URL.replace(/\/+$/, '')
