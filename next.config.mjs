const isDev = process.env.NODE_ENV === 'development'

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    qualities: [75, 80],
    minimumCacheTTL: 60 * 60 * 24 * 60,
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
    serverActions: {
      bodySizeLimit: '16mb',
    },
  },
  async headers() {
    return [
      {
        // Todas las rutas: headers de seguridad base (security-owasp.md §5).
        source: '/:path*',
        headers: [
          // Bloquea que el sitio se embeba en un iframe ajeno (clickjacking).
          { key: 'X-Frame-Options', value: 'DENY' },
          // Evita que el browser adivine el content-type de una respuesta.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // No filtra la URL completa de origen a otros orígenes en navegaciones/fetches.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Desactiva APIs sensibles del browser que el sitio no usa.
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          // Fuerza HTTPS en el browser (Vercel/Dokku sirven siempre sobre TLS en prod).
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // ponytail: sin nonces por script (requeriría middleware). 'unsafe-inline'
          // en script/style es el techo conocido de esta CSP; igual corta la
          // superficie real (scripts/conexiones a orígenes ajenos). Subir a
          // nonce-based strict-dynamic si en algún momento se audita esto en serio.
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // 'unsafe-eval' SOLO en dev: el dev server de webpack compila cada
              // módulo con `eval()` (devtool eval-source-map). Sin esto la CSP lo
              // bloquea, main-app.js tira EvalError y **muere la hidratación** —
              // se cae todo `useEffect` del sitio (navbar sin botones de sesión,
              // hero sin video, wizard de turnos sin slots) sin más síntoma que
              // un error en consola. En prod el build no usa eval: no va nunca.
              `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https://*.supabase.co",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig
