import { AuthShell } from '@/components/auth-shell'
import { Skeleton } from '@/components/ui/skeleton'

// Cubre las 3 páginas del flujo de auth por link (confirmar / recuperar /
// nueva-contrasena) — todas usan AuthShell, contenido genérico está bien acá.
export default function AuthLoading() {
  return (
    <AuthShell description="Un momento…" title="Cargando">
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-11 w-full rounded-full" />
      </div>
    </AuthShell>
  )
}
