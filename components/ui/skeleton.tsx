import { cn } from '@/lib/utils'

// Primitivo shadcn/ui estándar. El proyecto no tiene tokens CSS de shadcn
// (--muted, etc.) — usa gray-200 directo, consistente con `SectionSkeleton`.
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-md bg-gray-200', className)}
      {...props}
    />
  )
}

export { Skeleton }
