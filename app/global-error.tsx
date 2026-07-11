'use client'

import { useEffect } from 'react'

import './globals.css'

// Reemplaza el layout raíz entero (por eso trae su propio <html>/<body>) —
// es el único boundary que atrapa errores del RootLayout en sí (fuentes,
// providers globales). No puede depender de next/font (el layout que las
// carga es justamente lo que falló), así que usa system-ui como fallback.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Error global:', error)
  }, [error])

  return (
    <html lang="es">
      <body className="min-h-screen flex items-center justify-center px-4 py-16 bg-gray-50 font-sans">
        <div className="max-w-md w-full text-center">
          <p
            className="text-2xl font-extrabold mb-2 bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(135deg, #E8611A, #C4391C)' }}
          >
            VIMET
          </p>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            No pudimos cargar el sitio
          </h1>
          <p className="text-sm text-gray-600 mb-8">
            Ocurrió un error inesperado al iniciar la aplicación. Probá de nuevo en unos segundos.
          </p>
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full text-white text-sm font-semibold shadow-md"
            style={{ backgroundImage: 'linear-gradient(135deg, #E8611A, #C4391C)' }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  )
}
