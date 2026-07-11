import { ArrowLeft } from 'lucide-react'
import Image from 'next/image'
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
    <div className="lg:flex lg:min-h-screen">
      {/* Panel de imagen: la mitad del viewport, solo desktop */}
      <div className="hidden lg:block lg:w-1/2 lg:h-screen lg:sticky lg:top-0 relative">
        <Image
          src="/images/hero/training.jpg"
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-vimet-dark/80 via-vimet-dark/10 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12">
          <p className="font-heading text-3xl font-bold text-white leading-tight">
            Nutrición y entrenamiento<br />para tu salud
          </p>
        </div>
      </div>

      {/* Panel del form */}
      <div className="flex-1 pt-24 pb-16 lg:pt-0 lg:pb-0 bg-gradient-to-br from-vimet-sand to-vimet-cream flex items-center">
        <div className="container-vimet lg:mx-0 lg:max-w-none lg:px-12 xl:px-20">
          <div className="max-w-md lg:max-w-lg">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-vimet-orange transition-colors mb-4"
            >
              <ArrowLeft className="size-4" /> {backLabel}
            </Link>
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-vimet-gradient text-white px-7 py-7 text-center lg:text-left">
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
    </div>
  )
}
