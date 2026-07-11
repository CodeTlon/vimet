import { Skeleton } from '@/components/ui/skeleton'

// Cubre home + todas las páginas públicas (nosotros, metodologia, servicios,
// faq, contacto, legales) y el wizard de turno (`turnos/nuevo`, anidado acá
// dentro del grupo `(public)`). Aproximación genérica: header + secciones —
// no pixel-perfect por página, solo evita el flash en blanco bajo el navbar
// fijo mientras el server component resuelve sus queries.
export default function PublicLoading() {
  return (
    <div className="pt-32 pb-20 sm:pt-40">
      <div className="container-vimet space-y-12">
        <div className="space-y-4 max-w-2xl">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full max-w-lg" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    </div>
  )
}
