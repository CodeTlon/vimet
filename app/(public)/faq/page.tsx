import { Mail } from 'lucide-react'
import Link from 'next/link'

import { FaqList } from '@/components/faq-list'
import { PageHeader } from '@/components/page-header'
import { faq } from '@/lib/config/team'

export const metadata = { title: 'Preguntas frecuentes' }

export default function FaqPage() {
  return (
    <>
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
          <FaqList items={faq} />

          <div className="text-center mt-12">
            <p className="text-gray-700 mb-4">¿Tenés otra pregunta?</p>
            <Link
              href="/contacto"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-vimet-gradient text-white font-semibold shadow-md hover:shadow-lg transition-all"
            >
              <Mail className="size-5" /> Contactanos
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
