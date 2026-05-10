import {
  Activity,
  ArrowRight,
  Dumbbell,
  HeartPulse,
  Pill,
  Scale,
  Shield,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import { PageHeader } from '@/components/page-header'
import { brand, team, type Profesional } from '@/lib/config/team'

const ICONS: Record<string, LucideIcon> = {
  Activity,
  Scale,
  Pill,
  HeartPulse,
  Dumbbell,
  Stethoscope,
  Shield,
}

export const metadata = { title: 'Nosotros' }

function ProfileSection({ prof, reverse }: { prof: Profesional; reverse: boolean }) {
  return (
    <section className={reverse ? 'bg-vimet-sand py-16 lg:py-24' : 'bg-white py-16 lg:py-24'}>
      <div className="container-vimet">
        <div
          className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${
            reverse ? 'lg:[&>*:first-child]:order-last' : ''
          }`}
        >
          <div className="relative aspect-[4/5] w-full max-w-md mx-auto rounded-2xl overflow-hidden shadow-lg">
            <Image
              src={prof.avatar}
              alt={prof.nombre}
              fill
              sizes="(min-width: 1024px) 480px, 100vw"
              className="object-cover"
            />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide uppercase text-vimet-orange">
              {prof.titulo}
              {prof.matricula ? ` · ${prof.matricula}` : ''}
            </p>
            <h2 className="mt-2 font-heading text-3xl sm:text-4xl font-bold text-gray-900">
              {prof.nombre}
            </h2>
            <p className="mt-4 text-gray-700 leading-relaxed">{prof.bio}</p>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {prof.areasTrabajo.map((area) => {
                const Icon = ICONS[area.icon] ?? Activity
                return (
                  <div
                    key={area.title}
                    className="flex items-start gap-3 rounded-xl bg-white border border-gray-100 p-4 shadow-sm"
                  >
                    <div className="mt-0.5 size-9 rounded-lg bg-vimet-cream text-vimet-orange flex items-center justify-center shrink-0">
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{area.title}</p>
                      <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">{area.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={prof.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-vimet-gradient text-white font-semibold shadow-md hover:shadow-lg transition-all text-sm"
              >
                Consultá por WhatsApp <ArrowRight className="size-4" />
              </a>
              <a
                href={prof.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-300 text-gray-800 font-semibold hover:bg-gray-50 transition-colors text-sm"
              >
                {prof.instagram}
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function NosotrosPage() {
  return (
    <>
      <PageHeader
        eyebrow="Quiénes somos"
        title={
          <>
            Sobre <span className="text-white/90 underline decoration-white/40">nosotros</span>
          </>
        }
        description={brand.description}
      />

      <ProfileSection prof={team.avril} reverse={false} />
      <ProfileSection prof={team.gero} reverse={true} />

      <section className="bg-vimet-gradient py-16 lg:py-20 text-center">
        <div className="container-vimet text-white">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold">
            ¿Querés conocer nuestra metodología?
          </h2>
          <p className="mt-3 max-w-xl mx-auto text-white/90">
            Descubrí cómo combinamos nutrición y entrenamiento para lograr resultados sostenibles.
          </p>
          <Link
            href="/metodologia"
            className="mt-7 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-vimet-red font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            Ver metodología <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </>
  )
}
