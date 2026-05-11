'use client'

import { Instagram, Mail, MapPin, Video } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { social, team } from '@/lib/config/team'

const HIDE_PREFIXES = ['/admin', '/login', '/registro']

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 448 512" fill="currentColor" className={className} aria-hidden>
      <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
    </svg>
  )
}

const quickLinks = [
  { href: '/turnos/nuevo', label: 'Reservar turno' },
  { href: '/metodologia', label: 'Metodología' },
  { href: '/servicios', label: 'Servicios' },
  { href: '/faq', label: 'Preguntas frecuentes' },
  { href: '/contacto', label: 'Contacto' },
]

export function Footer() {
  const pathname = usePathname()
  if (HIDE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null

  return (
    <footer className="bg-gray-900 text-white">
      <div className="container-vimet pt-14 pb-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">

          {/* 1 — Brand */}
          <div className="space-y-4">
            <Image
              src="/images/brand/logo-white.png"
              alt="VIMET"
              width={120}
              height={40}
              sizes="120px"
              className="h-8 w-auto object-contain"
            />
            <p className="text-sm text-white/50 leading-relaxed max-w-[220px]">
              Nutrición y entrenamiento especializado en alteraciones metabólicas.
            </p>
          </div>

          {/* 2 — Contacto */}
          <div>
            <h4 className="font-heading font-semibold text-xs uppercase tracking-widest text-white/35 mb-5">
              Contacto
            </h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2.5 text-white/55">
                <MapPin className="size-4 text-vimet-orange shrink-0" />
                Instituto VIANETT, Cba.
              </li>
              <li className="flex items-center gap-2.5 text-white/55">
                <Video className="size-4 text-vimet-orange shrink-0" />
                Atención virtual
              </li>
              <li>
                <Link
                  href={social.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-white/55 hover:text-white transition-colors"
                >
                  <WhatsAppIcon className="size-4" />
                  WhatsApp
                </Link>
              </li>
              <li>
                <Link
                  href="/contacto"
                  className="inline-flex items-center gap-2.5 text-white/55 hover:text-white transition-colors"
                >
                  <Mail className="size-4" />
                  Formulario
                </Link>
              </li>
            </ul>
          </div>

          {/* 3 — Quick links */}
          <div>
            <h4 className="font-heading font-semibold text-xs uppercase tracking-widest text-white/35 mb-5">
              Accesos
            </h4>
            <ul className="space-y-2.5 text-sm">
              {quickLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-white/55 hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 4 — Redes */}
          <div>
            <h4 className="font-heading font-semibold text-xs uppercase tracking-widest text-white/35 mb-5">
              Seguinos
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href={social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-white/55 hover:text-white transition-colors"
                >
                  <Instagram className="size-4" />
                  {social.instagramHandle}
                </Link>
              </li>
              <li>
                <Link
                  href={team.avril.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-white/55 hover:text-white transition-colors"
                >
                  <Instagram className="size-4" />
                  {team.avril.instagram}
                </Link>
              </li>
              <li>
                <Link
                  href={team.gero.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-white/55 hover:text-white transition-colors"
                >
                  <Instagram className="size-4" />
                  {team.gero.instagram}
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/30">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1">
            <span>© {new Date().getFullYear()} VIMET — Vida y Metabolismo</span>
            <Link href="/privacidad" className="hover:text-white/60 transition-colors">
              Política de privacidad
            </Link>
            <Link href="/terminos" className="hover:text-white/60 transition-colors">
              Términos y condiciones
            </Link>
          </div>
          <Link
            href="https://codetlon.com.ar"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-white/60 transition-colors"
          >
            Desarrollado por <span className="font-semibold text-white/50">CodeTlon</span>
          </Link>
        </div>
      </div>
    </footer>
  )
}
