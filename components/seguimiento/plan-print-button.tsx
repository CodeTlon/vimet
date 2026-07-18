'use client'

import { Printer } from 'lucide-react'

export function PlanPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-vimet-orange/40 hover:text-vimet-orange"
    >
      <Printer className="size-4" /> Exportar PDF
    </button>
  )
}
