import type { Metadata, Viewport } from 'next'
import { DM_Sans, Outfit } from 'next/font/google'

import CookieConsent from '@/components/cookie-consent'
import GoogleAnalytics from '@/components/google-analytics'
import { HashInviteHandler } from '@/components/hash-invite-handler'
import { JsonLd } from '@/components/seo/json-ld'
import { location, social } from '@/lib/config/team'
import { SITE_URL } from '@/lib/config/site'

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
  metadataBase: new URL(SITE_URL),
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
      { url: '/icons/favicon-light.svg', type: 'image/svg+xml', media: '(prefers-color-scheme: light)' },
      { url: '/icons/favicon-dark.svg', type: 'image/svg+xml', media: '(prefers-color-scheme: dark)' },
    ],
  },
  alternates: { canonical: '/' },
  openGraph: {
    title: 'VIMET — Vida y Metabolismo',
    description: 'Nutrición y entrenamiento especializado en alteraciones metabólicas.',
    url: '/',
    siteName: 'VIMET',
    locale: 'es_AR',
    type: 'website',
    images: [{ url: '/images/hero/training.jpg', width: 1200, height: 630, alt: 'VIMET — Vida y Metabolismo' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VIMET — Vida y Metabolismo',
    description: 'Nutrición y entrenamiento especializado en alteraciones metabólicas.',
    images: ['/images/hero/training.jpg'],
  },
}

const GA_ID = process.env.NEXT_PUBLIC_GA_ID
const gaActivo = Boolean(GA_ID && GA_ID !== 'G-XXXXXXXXXX')

// LocalBusiness (no MedicalBusiness): VIMET es nutrición + entrenamiento
// personalizado, no una clínica/consultorio médico — usar el tipo genérico
// evita sobre-reclamar una certificación clínica que el servicio no tiene.
const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'VIMET — Vida y Metabolismo',
  description:
    'Nutrición y entrenamiento especializado en alteraciones metabólicas. Equipo interdisciplinario en Córdoba, Argentina.',
  url: SITE_URL,
  image: `${SITE_URL}/images/hero/training.jpg`,
  telephone: '+543513752818',
  priceRange: '$$',
  address: {
    '@type': 'PostalAddress',
    streetAddress: location.address,
    addressLocality: location.city,
    addressCountry: 'AR',
  },
  sameAs: [social.instagram],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${outfit.variable} ${dmSans.variable}`}>
      <body className="min-h-screen flex flex-col">
        <JsonLd data={localBusinessSchema} />
        {gaActivo && GA_ID ? <GoogleAnalytics gaId={GA_ID} /> : null}
        <HashInviteHandler />
        {children}
        <CookieConsent />
      </body>
    </html>
  )
}
