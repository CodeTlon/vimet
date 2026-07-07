import {
  Apple,
  ArrowRight,
  CalendarPlus,
  Dumbbell,
  HandHeart,
  HeartPulse,
  Instagram,
  Leaf,
  MapPin,
  Microscope,
  SlidersHorizontal,
  Users,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import { HeroVideo } from '@/components/hero-video'
import { LazyMap } from '@/components/lazy-map'
import { location, social, team } from '@/lib/config/team'

const pilares = [
  {
    icon: Users,
    titulo: 'Interdisciplina',
    desc: 'La nutrición y el entrenamiento no funcionan por separado. Nuestro abordaje integra ambas disciplinas.',
  },
  {
    icon: Microscope,
    titulo: 'Evidencia científica',
    desc: 'Cada recomendación está respaldada por literatura científica actualizada.',
  },
  {
    icon: SlidersHorizontal,
    titulo: 'Personalización',
    desc: 'No hay planes genéricos. Diseñamos todo adaptado a tu estilo de vida, nivel y objetivos.',
  },
  {
    icon: Leaf,
    titulo: 'Sostenibilidad',
    desc: 'Buscamos generar hábitos reales que puedas mantener a largo plazo, sin restricciones extremas.',
  },
] as const

const serviciosDestacados = [
  {
    icon: Apple,
    nombre: 'Nutrición Personalizada',
    descripcion:
      'Planes de alimentación adaptados a tus objetivos, requerimientos y estilo de vida.',
    tipo: 'Nutrición',
    color: 'from-vimet-orange/15 to-vimet-orange/5 text-vimet-orange',
  },
  {
    icon: Dumbbell,
    nombre: 'Entrenamiento Adaptado',
    descripcion:
      'Rutinas diseñadas según tu nivel físico, asegurando una progresión segura y constante.',
    tipo: 'Entrenamiento',
    color: 'from-vimet-red/15 to-vimet-red/5 text-vimet-red',
  },
  {
    icon: HandHeart,
    nombre: 'Plan Integral VIMET',
    descripcion:
      'Nuestro abordaje más completo. Combinamos nutrición y entrenamiento trabajando en equipo para vos.',
    tipo: 'Plan Integral',
    color: 'from-gray-900/10 to-gray-900/5 text-gray-900',
  },
] as const

export default function HomePage() {
  return (
    <>
      <section className="relative h-dvh overflow-hidden">
        {/* Video de fondo — cubre todo el hero */}
        <HeroVideo />
        {/* Scrim: sólido en mobile (el texto ocupa todo el ancho), a la izquierda en desktop */}
        <div className="absolute inset-0 bg-black/90 lg:bg-gradient-to-r lg:from-black/70 lg:via-black/40 lg:to-transparent" />
        {/* Contrastado superior (negro casi transparente) */}
        <div className="absolute inset-x-0 top-0 h-40 lg:h-48 bg-gradient-to-b from-black/70 lg:from-black/80 to-transparent" />

        {/* Contenido */}
        <div className="relative flex flex-col h-full">
          <div className="flex-none h-20 lg:h-24" />
          <div className="flex-1 flex items-center py-8">
            <div className="container-vimet">
              <div className="w-full lg:w-1/2">
                <div className="w-10 h-[3px] rounded-full bg-vimet-gradient mb-8" />

                <h1 className="font-heading font-extrabold tracking-tight">
                  <span className="block text-white text-5xl sm:text-6xl xl:text-[4rem] leading-[1.04]">
                    Nutrición y<br />entrenamiento
                  </span>
                  <span className="block text-gradient text-3xl sm:text-[2.1rem] xl:text-[2.6rem] mt-2 pb-2 leading-snug">
                    para tu salud
                  </span>
                </h1>

                <p className="mt-5 text-white/75 text-[15px] max-w-[360px] leading-relaxed">
                  Especialistas en alteraciones metabólicas. Plan nutricional y
                  entrenamiento adaptado a cada persona.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/turnos/nuevo"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-vimet-gradient text-white font-semibold shadow-lg hover:shadow-xl transition-all text-sm"
                  >
                    <CalendarPlus className="size-4" /> Reservar turno
                  </Link>
                  <Link
                    href="/metodologia"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/20 text-white/80 font-semibold hover:bg-white/10 transition-colors text-sm"
                  >
                    Cómo trabajamos <ArrowRight className="size-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 lg:py-24">
        <div className="container-vimet">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900">
              ¿Por qué <span className="text-gradient">VIMET</span>?
            </h2>
            <p className="mt-3 text-gray-700">
              Cuatro pilares que definen nuestra forma de trabajar
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {pilares.map((p) => (
              <article
                key={p.titulo}
                className="group rounded-xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all"
              >
                <div className="size-12 rounded-lg bg-vimet-cream text-vimet-orange flex items-center justify-center mb-4 group-hover:bg-vimet-gradient group-hover:text-white transition-colors">
                  <p.icon className="size-6" />
                </div>
                <h3 className="font-heading font-semibold text-lg text-gray-900 mb-2">
                  {p.titulo}
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">{p.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative h-[300px] sm:h-[360px] w-full overflow-hidden">
        <Image
          src="/images/sections/gym-wide.jpg"
          alt="Entrenamiento"
          fill
          quality={80}
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/65" />
        <div className="relative h-full container-vimet flex items-center justify-center text-center">
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
            Transformá tu <span className="text-gradient">relación</span> con la salud
          </h2>
        </div>
      </section>

      <section className="bg-white py-16 lg:py-24">
        <div className="container-vimet">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900">
              Nuestros <span className="text-gradient">servicios</span>
            </h2>
            <p className="mt-3 text-gray-700">
              Abordaje integral combinando nutrición y entrenamiento
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {serviciosDestacados.map((s) => (
              <article
                key={s.nombre}
                className="rounded-2xl bg-white border border-gray-100 p-7 shadow-sm hover:shadow-lg transition-all"
              >
                <div
                  className={`size-14 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-5`}
                >
                  <s.icon className="size-7" />
                </div>
                <h3 className="font-heading text-xl font-semibold text-gray-900 mb-2">
                  {s.nombre}
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed mb-4">{s.descripcion}</p>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                  {s.tipo}
                </span>
              </article>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              href="/turnos/nuevo"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-vimet-gradient text-white font-semibold shadow-md hover:shadow-lg transition-all"
            >
              <CalendarPlus className="size-5" /> Agendá tu consulta
            </Link>
          </div>
        </div>
      </section>

      <section className="relative h-[300px] sm:h-[360px] w-full overflow-hidden">
        <Image
          src="/images/sections/healthy-food.jpg"
          alt="Alimentación saludable"
          fill
          quality={80}
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/65" />
        <div className="relative h-full container-vimet flex items-center justify-center text-center">
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-white max-w-3xl">
            Alimentación como aliada clave del <span className="text-gradient">rendimiento</span>
          </h2>
        </div>
      </section>

      <section className="bg-vimet-sand py-16 lg:py-24">
        <div className="container-vimet">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900">
              Nuestro <span className="text-gradient">equipo</span>
            </h2>
            <p className="mt-3 text-gray-700">Profesionales comprometidos con tu salud</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {Object.values(team).map((prof) => (
              <article
                key={prof.key}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="relative aspect-[4/3] w-full">
                  <Image
                    src={prof.avatar}
                    alt={prof.nombre}
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-heading text-2xl font-semibold text-gray-900">
                    {prof.nombre}
                  </h3>
                  <p className="text-sm text-vimet-red font-medium mt-1">{prof.titulo}</p>
                  <p className="text-sm text-gray-700 mt-3 leading-relaxed">{prof.bioCorta}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {prof.especialidades.slice(0, 3).map((esp) => (
                      <span
                        key={esp}
                        className="px-3 py-1 rounded-full bg-vimet-cream text-vimet-red text-xs font-medium"
                      >
                        {esp}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative bg-vimet-gradient py-16 lg:py-20 text-center">
        <div className="container-vimet text-white">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold">¿Listo para empezar?</h2>
          <p className="mt-3 max-w-xl mx-auto text-white/90">
            Reservá tu primera consulta y empezá a transformar tu salud con acompañamiento
            profesional.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/turnos/nuevo"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white text-vimet-red font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              <CalendarPlus className="size-5" /> Reservar turno
            </Link>
            <Link
              href="/contacto"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-white text-white font-semibold hover:bg-white/10 transition-colors"
            >
              Contactanos
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-vimet-sand py-16 lg:py-24">
        <div className="container-vimet">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900">
                ¿Dónde <span className="text-gradient">estamos</span>?
              </h2>
              <p className="mt-3 text-gray-700 max-w-md">
                Modalidad presencial y virtual. Escribinos y conocé nuestro formato de trabajo.
              </p>
              <ul className="mt-6 space-y-4">
                <li className="flex items-start gap-3">
                  <div className="mt-1 size-9 rounded-full bg-vimet-cream text-vimet-orange flex items-center justify-center shrink-0">
                    <MapPin className="size-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Ubicación</p>
                    <p className="text-sm text-gray-700">
                      {location.address}, {location.place}
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 size-9 rounded-full bg-vimet-cream text-vimet-orange flex items-center justify-center shrink-0">
                    <HeartPulse className="size-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">WhatsApp</p>
                    <a
                      href={social.whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-vimet-red hover:underline"
                    >
                      Escribinos por WhatsApp
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 size-9 rounded-full bg-vimet-cream text-vimet-orange flex items-center justify-center shrink-0">
                    <Instagram className="size-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Instagram</p>
                    <a
                      href={social.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-vimet-red hover:underline"
                    >
                      {social.instagramHandle}
                    </a>
                  </div>
                </li>
              </ul>
              <Link
                href="/turnos/nuevo"
                className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-vimet-gradient text-white font-semibold shadow-md hover:shadow-lg transition-all"
              >
                <CalendarPlus className="size-5" /> Reservar consulta
              </Link>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-lg bg-white p-2">
              <LazyMap
                title="Ubicación VIMET en Córdoba"
                src={location.mapEmbed}
                height={400}
              />
            </div>
          </div>
        </div>
      </section>

    </>
  )
}
