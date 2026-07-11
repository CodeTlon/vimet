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
  fecha: string
  horaInicio: string
  horaFin: string
  servicioNombre: string
}

const ORANGE = '#E8611A'
const RED = '#C4391C'
const DARK = '#1A1A1A'
const LIGHT = '#FFF8F5'

export default function TurnoCanceladoEmail({
  nombre,
  fecha,
  horaInicio,
  horaFin,
  servicioNombre,
}: Props) {
  return (
    <Html lang="es">
      <Head />
      <Preview>Tu turno fue cancelado — cambio en la agenda de tu profesional</Preview>
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
                Tu turno fue cancelado
              </Heading>
            </Section>

            <Section style={{ padding: '28px 32px 8px' }}>
              <Text style={{ margin: 0, fontSize: 14, color: '#4A4A4A' }}>
                Hola <strong style={{ color: DARK }}>{nombre}</strong>, tu profesional actualizó su
                agenda de atención y tu turno reservado quedó sin horario disponible. Por favor
                coordiná uno nuevo.
              </Text>
            </Section>

            <Section
              style={{
                margin: '12px 32px 24px',
                padding: 20,
                backgroundColor: LIGHT,
                borderRadius: 12,
                borderLeft: `4px solid ${RED}`,
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
                Turno cancelado
              </Text>
              <Text style={{ margin: '8px 0 0', fontSize: 14, color: '#2D2D2D', lineHeight: 1.6 }}>
                {servicioNombre}
                <br />
                {fecha} · {horaInicio}–{horaFin}
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
