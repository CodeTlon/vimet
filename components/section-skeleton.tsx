/**
 * Skeleton genérico para los loading.tsx de las áreas internas (paciente / admin).
 * Da feedback instantáneo al navegar entre secciones mientras el server component
 * resuelve sus queries (Suspense del App Router).
 */
export function SectionSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden>
      <div className="h-8 w-48 rounded-lg bg-gray-200" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-gray-200/80" />
        ))}
      </div>
      <div className="h-40 rounded-2xl bg-gray-200/60" />
    </div>
  )
}
