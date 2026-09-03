import {
  Activity,
  CalendarPlus,
  ClipboardCheck,
  HeartPulse,
  Leaf,
  Microscope,
  PencilRuler,
  RefreshCw,
  Scale,
  SlidersHorizontal,
  Stethoscope,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import { PageHeader } from '@/components/page-header'
import { ShareButton } from '@/components/share-button'
import { TLDRBox } from '@/components/tldr-box'
import { AnimateIn } from '@/components/ui/animate-in'
import { getContenidoSitio } from '@/lib/config/contenido'
const ICONS: Record<string, LucideIcon> = {
  ClipboardCheck,
  PencilRuler,
  RefreshCw,
  TrendingUp,
  Users,
  Microscope,
  SlidersHorizontal,
  Leaf,
  Scale,
  Activity,
  HeartPulse,
  Stethoscope,
}

export const metadata: Metadata = {
  title: 'Metodología de trabajo en nutrición y entrenamiento',
  description:
    'Conocé el proceso paso a paso de VIMET: entrevista de admisión, evaluación nutricional y funcional, planificación personalizada y seguimiento periódico de resultados.',
  alternates: { canonical: '/metodologia' },
  openGraph: {
    title: 'Metodología — VIMET',
    description: 'El proceso paso a paso: evaluación, planificación y seguimiento personalizado.',
    url: '/metodologia',
  },
}

export default async function MetodologiaPage() {
  const { metodologia } = await getContenidoSitio()

  return (
    <>
      <PageHeader
        eyebrow="Cómo trabajamos"
        title={
          <>
            Nuestra <span className="text-white/90 underline decoration-white/40">metodología</span>
          </>
        }
        description="Cómo trabajamos para que alcances tus objetivos de forma sostenible"
      >
        <div className="mt-6 flex justify-center">
          <ShareButton title="Metodología VIMET — Nutrición y entrenamiento" />
        </div>
      </PageHeader>

      <section className="bg-white pt-16 lg:pt-20">
        <div className="container-vimet">
          <p className="max-w-3xl mx-auto text-center text-gray-700 leading-relaxed mb-8">
            Si querés saber qué pasa desde que agendás tu primera consulta hasta que tenés un plan
            en la mano, acá está el proceso completo: cómo evaluamos, cómo diseñamos tu plan y cada
            cuánto lo revisamos. Para ver el catálogo completo de consultas disponibles, entrá a{' '}
            <Link href="/servicios" className="text-vimet-orange hover:underline">
              servicios
            </Link>
            .
          </p>
          <TLDRBox
            items={[
              'Entrevista de admisión + evaluación nutricional y funcional en la primera consulta.',
              'Plan de nutrición y/o entrenamiento diseñado a medida, no genérico.',
              'Controles periódicos (semanal, quincenal o mensual) para ajustar sobre la marcha.',
              'Revisión formal cada 2–3 meses según resultados obtenidos.',
            ]}
          />
        </div>
      </section>

      <section className="bg-white pb-16 lg:pb-24">
        <div className="container-vimet">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900">
              El proceso <span className="text-gradient">paso a paso</span>
            </h2>
          </div>
          <ol className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {metodologia.pasos.map((paso, i) => {
              const Icon = ICONS[paso.icon] ?? ClipboardCheck
              return (
                <li
                  key={paso.titulo}
                  className="relative bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="absolute -top-3 left-6 inline-flex items-center justify-center size-8 rounded-full bg-vimet-gradient text-white text-sm font-bold shadow-md">
                    {i + 1}
                  </div>
                  <div className="size-12 rounded-lg bg-vimet-cream text-vimet-orange flex items-center justify-center mb-3 mt-2">
                    <Icon className="size-6" />
                  </div>
                  <h3 className="font-heading font-semibold text-lg text-gray-900 mb-1">
                    {paso.titulo}
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed">{paso.desc}</p>
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      <section className="relative h-[300px] sm:h-[360px] w-full overflow-hidden">
        <Image
          src="/images/sections/nutrition-food.jpg"
          alt="Plato de comida saludable preparado como parte de un plan de nutrición personalizado VIMET"
          fill
          quality={80}
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/65" />
        <div className="relative h-full container-vimet flex items-center justify-center text-center">
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
            Cada plan es <span className="text-gradient">único</span>, como vos
          </h2>
        </div>
      </section>

      <section className="bg-vimet-sand py-16 lg:py-24">
        <div className="container-vimet">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900">
              Nuestros <span className="text-gradient">pilares</span>
            </h2>
            <p className="mt-3 text-gray-700">Los principios que guían cada decisión</p>
          </div>
          <AnimateIn className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {metodologia.pilares.map((p) => {
              const Icon = ICONS[p.icon] ?? Users
              return (
                <article
                  key={p.titulo}
                  className="rounded-xl bg-white border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="size-12 rounded-lg bg-vimet-cream text-vimet-orange flex items-center justify-center mb-4">
                    <Icon className="size-6" />
                  </div>
                  <h3 className="font-heading font-semibold text-lg text-gray-900 mb-2">
                    {p.titulo}
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed">{p.desc}</p>
                </article>
              )
            })}
          </AnimateIn>
        </div>
      </section>

      <section className="bg-white py-16 lg:py-24">
        <div className="container-vimet">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900">
              ¿A quién <span className="text-gradient">va dirigido</span>?
            </h2>
          </div>
          <AnimateIn className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {metodologia.dirigidoA.map((item) => {
              const Icon = ICONS[item.icon] ?? Activity
              return (
                <div
                  key={item.text}
                  className="bg-vimet-sand rounded-xl p-6 flex flex-col items-start gap-3"
                >
                  <div className="size-11 rounded-lg bg-vimet-gradient text-white flex items-center justify-center">
                    <Icon className="size-5" />
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed">{item.text}</p>
                </div>
              )
            })}
          </AnimateIn>
        </div>
      </section>

      <section className="bg-vimet-gradient py-16 lg:py-20 text-center">
        <div className="container-vimet text-white">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold">¿Te interesa?</h2>
          <p className="mt-3 max-w-xl mx-auto text-white/90">
            Reservá tu evaluación inicial y empecemos a trabajar juntos.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/turnos/nuevo"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white text-vimet-red font-semibold shadow-lg transition-all hover:shadow-xl active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-vimet-red"
            >
              <CalendarPlus className="size-5" /> Reservar turno
            </Link>
            <Link
              href="/servicios"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-white text-white font-semibold transition-colors hover:bg-white/10 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              Ver servicios
            </Link>
            <Link
              href="/faq"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-white/40 text-white/90 font-semibold transition-colors hover:bg-white/10 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              Ver FAQ
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
