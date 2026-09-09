'use client'

import { ChevronLeft, Printer } from 'lucide-react'

export function PlanImprimirToolbar() {
  return (
    <div className="print:hidden sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-100 mb-6">
      <div className="max-w-[860px] mx-auto flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-1 text-sm text-gray-700 hover:text-vimet-orange"
        >
          <ChevronLeft className="size-4" /> Volver
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-vimet-gradient text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all"
        >
          <Printer className="size-4" /> Imprimir / Guardar como PDF
        </button>
      </div>
    </div>
  )
}
