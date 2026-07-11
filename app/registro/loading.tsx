import { AuthShell } from '@/components/auth-shell'
import { Skeleton } from '@/components/ui/skeleton'

export default function RegistroLoading() {
  return (
    <AuthShell description="Creá tu cuenta para reservar turnos" title="Crear cuenta">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-11 w-full rounded-full" />
      </div>
    </AuthShell>
  )
}
