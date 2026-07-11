'use client'

import { RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'

// Boundary de errores para todo lo que renderiza DENTRO del root layout (navbar/
// footer siguen en pie). Errores del layout raíz en sí los cubre global-error.tsx.
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Error de aplicación:', error)
  }, [error])

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        <p className="font-heading text-2xl font-extrabold text-gradient mb-2">VIMET</p>
        <h1 className="font-heading text-xl font-semibold text-gray-900 mb-2">
          Algo no salió como esperábamos
        </h1>
        <p className="text-sm text-gray-600 mb-8">
          Ocurrió un error inesperado. Podés intentar de nuevo o volver al inicio.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-vimet-gradient text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all"
          >
            <RotateCcw className="size-4" /> Reintentar
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-full border border-gray-200 text-sm font-semibold text-gray-700 hover:border-vimet-orange hover:text-vimet-orange transition-colors"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
