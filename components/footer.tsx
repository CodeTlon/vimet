'use client'

import { Instagram, MapPin } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { CodeTlonBadge } from '@/components/codetlon-badge'
import { brand, location, social, team } from '@/lib/config/team'

const HIDE_PREFIXES = ['/admin', '/login', '/registro']

const navigation = [
  { href: '/', label: 'Inicio' },
  { href: '/nosotros', label: 'Nosotros' },
  { href: '/metodologia', label: 'Metodología' },
  { href: '/servicios', label: 'Servicios' },
  { href: '/faq', label: 'Preguntas frecuentes' },
  { href: '/contacto', label: 'Contacto' },
]

const servicios = [
  { href: '/servicios#nutricion', label: 'Consulta nutricional' },
  { href: '/servicios#nutricion', label: 'Nutrición deportiva' },
  { href: '/servicios#entrenamiento', label: 'Plan de entrenamiento' },
  { href: '/servicios#combo', label: 'Plan integral VIMET' },
]

export function Footer() {
  const pathname = usePathname()
  if (HIDE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container-vimet py-14 lg:py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="space-y-4">
            <div className="bg-white/95 rounded-md p-2 inline-block">
              <Image
                src="/images/brand/logo-light.jpg"
                alt="VIMET"
                width={140}
                height={48}
                sizes="140px"
                className="h-10 w-auto object-contain"
              />
            </div>
            <p className="text-sm text-white/70 leading-relaxed">
              {brand.slogan}. Trabajo interdisciplinario presencial y virtual en {brand.city}.
            </p>
            <div className="flex items-center gap-2 text-sm text-white/70">
              <MapPin className="size-4 text-vimet-orange" />
              <span>
                {location.address}, {location.place}
              </span>
            </div>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-base mb-4">Navegación</h4>
            <ul className="space-y-2 text-sm">
              {navigation.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-white/70 hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-base mb-4">Servicios</h4>
            <ul className="space-y-2 text-sm">
              {servicios.map((s) => (
                <li key={s.label}>
                  <Link href={s.href} className="text-white/70 hover:text-white transition-colors">
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-base mb-4">Redes</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href={social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors"
                >
                  <Instagram className="size-4" /> {social.instagramHandle}
                </Link>
              </li>
              <li>
                <Link
                  href={team.avril.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors"
                >
                  <Instagram className="size-4" /> {team.avril.instagram}
                </Link>
              </li>
              <li>
                <Link
                  href={team.gero.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors"
                >
                  <Instagram className="size-4" /> {team.gero.instagram}
                </Link>
              </li>
            </ul>
            <Link
              href="/contacto"
              className="mt-5 inline-flex items-center px-4 py-2 rounded-full text-xs font-semibold border border-white/30 text-white hover:bg-white/10 transition-colors"
            >
              Contactanos
            </Link>
          </div>
        </div>
      </div>

      <CodeTlonBadge />
    </footer>
  )
}
