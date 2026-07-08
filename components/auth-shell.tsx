import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { type ReactNode } from 'react'

export function AuthShell({
  title,
  description,
  children,
  footer,
  backHref = '/',
  backLabel = 'Volver al sitio',
}: {
  title: string
  description: string
  children: ReactNode
  footer?: ReactNode
  backHref?: string
  backLabel?: string
}) {
  return (
    <div className="min-h-screen pt-24 pb-16 bg-gradient-to-br from-vimet-sand to-vimet-cream flex items-center">
      <div className="container-vimet">
        <div className="max-w-md mx-auto">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-vimet-orange transition-colors mb-4"
          >
            <ArrowLeft className="size-4" /> {backLabel}
          </Link>
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-vimet-gradient text-white px-7 py-7 text-center">
            <Link
              href="/"
              className="inline-block font-heading text-3xl font-extrabold tracking-tight"
            >
              VIMET
            </Link>
            <p className="mt-1 text-sm text-white/85">{description}</p>
          </div>
          <div className="p-7">
            <h1 className="font-heading text-xl font-semibold text-gray-900 mb-4">{title}</h1>
            {children}
            {footer && <div className="mt-6 text-center text-sm text-gray-700">{footer}</div>}
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}
