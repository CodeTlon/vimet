import { Instagram, MapPin, MessageCircle } from 'lucide-react'
import Link from 'next/link'

import { ContactoForm } from '@/components/contacto-form'
import { PageHeader } from '@/components/page-header'
import { location, social, team } from '@/lib/config/team'

export const metadata = { title: 'Contacto' }

export default function ContactoPage() {
  return (
    <>
      <PageHeader
        eyebrow="Hablemos"
        title={<span className="text-white/90 underline decoration-white/40">Contacto</span>}
        description="Escribinos y conocé nuestro formato de trabajo"
      />

      <section className="bg-white py-16 lg:py-24">
        <div className="container-vimet">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            <div>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-gray-900">
                Estamos para ayudarte
              </h2>
              <p className="mt-3 text-gray-700 leading-relaxed">
                Podés comunicarte con nosotros por WhatsApp, Instagram o completando el
                formulario. Atendemos de forma presencial y virtual.
              </p>

              <ul className="mt-8 space-y-4">
                <ContactItem
                  icon={MapPin}
                  iconColor="text-vimet-orange"
                  iconBg="bg-vimet-cream"
                  label="Ubicación"
                  value={`${location.address} · ${location.place}, ${location.city}`}
                />
                <ContactItem
                  icon={MessageCircle}
                  iconColor="text-[#25D366]"
                  iconBg="bg-[#25D366]/15"
                  label="WhatsApp · Avril (Nutrición)"
                  href={team.avril.whatsappUrl}
                  value="Escribir a Avril"
                />
                <ContactItem
                  icon={MessageCircle}
                  iconColor="text-[#25D366]"
                  iconBg="bg-[#25D366]/15"
                  label="WhatsApp · Gero (Entrenamiento)"
                  href={team.gero.whatsappUrl}
                  value="Escribir a Gero"
                />
                <ContactItem
                  icon={Instagram}
                  iconColor="text-vimet-orange"
                  iconBg="bg-vimet-cream"
                  label="Instagram"
                  href={social.instagram}
                  value={social.instagramHandle}
                />
              </ul>
            </div>
            <ContactoForm />
          </div>
        </div>
      </section>

      <section className="bg-vimet-sand py-16 lg:py-20">
        <div className="container-vimet">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900">
              Encontranos en <span className="text-gradient">Córdoba</span>
            </h2>
            <p className="mt-3 text-gray-700">
              Atendemos de forma presencial en el Instituto VIANETT, un espacio pensado para tu
              comodidad y bienestar.
            </p>
          </div>
          <div className="rounded-2xl bg-white p-2 shadow-lg">
            <iframe
              title="Mapa VIMET — Instituto VIANETT"
              src={location.mapEmbed}
              width="100%"
              height={420}
              loading="lazy"
              allowFullScreen
              className="rounded-xl border-0 block w-full"
            />
          </div>
        </div>
      </section>
    </>
  )
}

function ContactItem({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value,
  href,
}: {
  icon: typeof MapPin
  iconColor: string
  iconBg: string
  label: string
  value: string
  href?: string
}) {
  return (
    <li className="flex items-start gap-4">
      <div className={`mt-0.5 size-10 rounded-full ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}>
        <Icon className="size-5" />
      </div>
      <div>
        <p className="font-semibold text-gray-900 text-sm">{label}</p>
        {href ? (
          <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-vimet-orange hover:underline"
          >
            {value}
          </Link>
        ) : (
          <p className="text-sm text-gray-700">{value}</p>
        )}
      </div>
    </li>
  )
}
