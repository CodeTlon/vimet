import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components'

type Props = {
  nombre: string
  email: string
  telefono: string
  mensaje: string
}

const ORANGE = '#E8611A'
const RED = '#C4391C'
const DARK = '#1A1A1A'
const LIGHT = '#FFF8F5'

export default function ContactoEmail({ nombre, email, telefono, mensaje }: Props) {
  return (
    <Html lang="es">
      <Head />
      <Preview>Nuevo mensaje de contacto desde vimet.com.ar</Preview>
      <Tailwind>
        <Body style={{ backgroundColor: '#FAFAFA', margin: 0, padding: '24px 0' }}>
          <Container
            style={{
              maxWidth: 560,
              margin: '0 auto',
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            }}
          >
            <Section
              style={{
                background: `linear-gradient(135deg, ${ORANGE}, ${RED})`,
                color: '#FFFFFF',
                padding: '32px 32px 24px',
                textAlign: 'center',
              }}
            >
              <Text
                style={{
                  margin: 0,
                  fontSize: 12,
                  letterSpacing: 4,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  opacity: 0.85,
                }}
              >
                VIMET
              </Text>
              <Heading
                as="h1"
                style={{ margin: '8px 0 0', fontSize: 24, fontWeight: 700, color: '#FFFFFF' }}
              >
                Nuevo mensaje de contacto
              </Heading>
              <Text style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
                Recibido desde el sitio público
              </Text>
            </Section>

            <Section style={{ padding: '28px 32px 8px' }}>
              <Text style={{ margin: 0, fontSize: 14, color: '#4A4A4A' }}>
                <strong style={{ color: DARK }}>{nombre}</strong> escribió un nuevo mensaje a través
                del formulario.
              </Text>
            </Section>

            <Section style={{ padding: '0 32px 8px' }}>
              <DataRow label="Nombre" value={nombre} />
              <DataRow label="Email" value={email} link={`mailto:${email}`} />
              {telefono ? (
                <DataRow
                  label="Teléfono / WhatsApp"
                  value={telefono}
                  link={`https://wa.me/${telefono.replace(/\D/g, '')}`}
                />
              ) : null}
            </Section>

            <Section
              style={{
                margin: '12px 32px 24px',
                padding: 20,
                backgroundColor: LIGHT,
                borderRadius: 12,
                borderLeft: `4px solid ${ORANGE}`,
              }}
            >
              <Text
                style={{
                  margin: 0,
                  fontSize: 11,
                  fontWeight: 700,
                  color: ORANGE,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                Mensaje
              </Text>
              <Text
                style={{
                  margin: '8px 0 0',
                  fontSize: 14,
                  color: '#2D2D2D',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {mensaje}
              </Text>
            </Section>

            <Hr style={{ margin: '0 32px', borderColor: '#F0F0F0' }} />

            <Section style={{ padding: '20px 32px 28px', textAlign: 'center' }}>
              <Text style={{ margin: 0, fontSize: 12, color: '#7A7A7A' }}>
                VIMET · Vida y Metabolismo · Córdoba, Argentina
              </Text>
              <Text style={{ margin: '4px 0 0', fontSize: 11, color: '#B8B8B8' }}>
                Este email fue enviado automáticamente desde vimet.com.ar
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

function DataRow({ label, value, link }: { label: string; value: string; link?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        padding: '12px 0',
        borderBottom: '1px solid #F0F0F0',
      }}
    >
      <Text
        style={{
          margin: 0,
          fontSize: 12,
          fontWeight: 600,
          color: '#7A7A7A',
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        {label}
      </Text>
      {link ? (
        <a
          href={link}
          style={{
            margin: 0,
            fontSize: 14,
            color: ORANGE,
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          {value}
        </a>
      ) : (
        <Text style={{ margin: 0, fontSize: 14, color: DARK, fontWeight: 600 }}>{value}</Text>
      )}
    </div>
  )
}
