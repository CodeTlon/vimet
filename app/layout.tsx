import type { Metadata, Viewport } from 'next'
import { DM_Sans, Outfit } from 'next/font/google'

import { HashInviteHandler } from '@/components/hash-invite-handler'

import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-heading',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#E8611A',
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'VIMET — Vida y Metabolismo',
    template: '%s — VIMET',
  },
  description:
    'Nutrición y entrenamiento especializado en alteraciones metabólicas. Equipo interdisciplinario en Córdoba, Argentina.',
  keywords: [
    'nutrición',
    'entrenamiento',
    'metabolismo',
    'salud',
    'Córdoba',
    'nutrición deportiva',
    'composición corporal',
    'patologías metabólicas',
  ],
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icons/favicon-light.svg', type: 'image/svg+xml', media: '(prefers-color-scheme: light)' },
      { url: '/icons/favicon-dark.svg', type: 'image/svg+xml', media: '(prefers-color-scheme: dark)' },
    ],
  },
  openGraph: {
    title: 'VIMET — Vida y Metabolismo',
    description: 'Nutrición y entrenamiento especializado en alteraciones metabólicas.',
    locale: 'es_AR',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${outfit.variable} ${dmSans.variable}`}>
      <body className="min-h-screen flex flex-col">
        <HashInviteHandler />
        {children}
      </body>
    </html>
  )
}
