import Link from 'next/link'
import { type ReactNode } from 'react'

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string
  description: string
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <div className="min-h-screen pt-24 pb-16 bg-gradient-to-br from-vimet-sand to-vimet-cream flex items-center">
      <div className="container-vimet">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
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
            <div className="mt-6 text-center text-sm text-gray-700">{footer}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
