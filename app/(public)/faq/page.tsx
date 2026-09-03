import type { Metadata } from 'next'
import { Mail } from 'lucide-react'
import Link from 'next/link'

import { FaqList } from '@/components/faq-list'
import { PageHeader } from '@/components/page-header'
import { JsonLd } from '@/components/seo/json-ld'
import { faq } from '@/lib/config/team'

export const metadata: Metadata = {
  title: 'Preguntas frecuentes sobre nutrición y entrenamiento',
  description:
    'Resolvemos las dudas más comunes sobre la primera consulta, atención virtual, planes de nutrición y entrenamiento, patologías metabólicas y turnos en VIMET, Córdoba.',
  alternates: { canonical: '/faq' },
  openGraph: {
    title: 'Preguntas frecuentes — VIMET',
    description: 'Todo lo que necesitás saber antes de tu primera consulta de nutrición o entrenamiento.',
    url: '/faq',
  },
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faq.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.a,
    },
  })),
}

export default function FaqPage() {
  return (
    <>
      <JsonLd data={faqSchema} />
      <PageHeader
        eyebrow="FAQ"
        title={
          <>
            Preguntas <span className="text-white/90 underline decoration-white/40">frecuentes</span>
          </>
        }
        description="Todo lo que necesitás saber antes de tu primera consulta"
      />

      <section className="bg-white py-16 lg:py-24">
        <div className="container-vimet max-w-3xl">
          <p className="text-gray-700 leading-relaxed mb-8">
            Reunimos acá las preguntas que más nos hacen los pacientes antes de arrancar: cómo es
            la primera consulta, si atendemos virtual, si hay que contratar nutrición y
            entrenamiento juntos, y cómo trabajamos con patologías metabólicas. Si después de leer
            seguís con dudas, mirá nuestros{' '}
            <Link href="/servicios" className="text-vimet-orange hover:underline">
              servicios
            </Link>{' '}
            y{' '}
            <Link href="/metodologia" className="text-vimet-orange hover:underline">
              metodología
            </Link>{' '}
            o escribinos directamente.
          </p>

          <FaqList items={faq} />

          <div className="text-center mt-12">
            <p className="text-gray-700 mb-4">¿Tenés otra pregunta?</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/contacto"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-vimet-gradient text-white font-semibold shadow-md transition-all hover:shadow-lg active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vimet-orange/50 focus-visible:ring-offset-2"
              >
                <Mail className="size-5" /> Contactanos
              </Link>
              <Link
                href="/turnos/nuevo"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-gray-200 text-gray-800 font-semibold transition-colors hover:bg-gray-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vimet-orange/40 focus-visible:ring-offset-2"
              >
                Reservar turno
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
