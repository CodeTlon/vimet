import { AuthShell } from '@/components/auth-shell'
import { Skeleton } from '@/components/ui/skeleton'

export default function LoginLoading() {
  return (
    <AuthShell description="Iniciá sesión para gestionar tus turnos" title="Bienvenido de nuevo">
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-11 w-full rounded-full" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </AuthShell>
  )
}
