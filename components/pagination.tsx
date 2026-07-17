import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export function Pagination({
  page,
  totalPages,
  makeHref,
}: {
  page: number
  totalPages: number
  makeHref: (page: number) => string
}) {
  if (totalPages <= 1) return null

  return (
    <nav aria-label="Paginación" className="flex items-center justify-center gap-3 mt-6">
      <Link
        href={makeHref(Math.max(1, page - 1))}
        aria-disabled={page <= 1}
        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold border border-gray-200 text-gray-700 ${
          page <= 1 ? 'pointer-events-none opacity-40' : 'hover:bg-gray-50'
        }`}
      >
        <ChevronLeft className="size-4" /> Anterior
      </Link>
      <span className="text-sm text-gray-600">
        Página {page} de {totalPages}
      </span>
      <Link
        href={makeHref(Math.min(totalPages, page + 1))}
        aria-disabled={page >= totalPages}
        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold border border-gray-200 text-gray-700 ${
          page >= totalPages ? 'pointer-events-none opacity-40' : 'hover:bg-gray-50'
        }`}
      >
        Siguiente <ChevronRight className="size-4" />
      </Link>
    </nav>
  )
}
