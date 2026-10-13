import { Body, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { ReactNode } from 'react'

const ORANGE = '#E8611A'
const RED = '#C4391C'
const DARK = '#1A1A1A'

// Marco comun de los mails de autenticacion (confirmar cuenta, codigo de
// recuperacion, invitacion). Mismo lenguaje visual que los mails de turnos.
export function AuthEmailLayout({ preview, titulo, children }: { preview: string; titulo: string; children: ReactNode }) {
  return (
    <Html lang="es">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: '#FAFAFA', margin: 0, padding: '24px 0', fontFamily: 'Arial, sans-serif' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto', backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden' }}>
          <Section style={{ background: `linear-gradient(135deg, ${ORANGE}, ${RED})`, color: '#FFFFFF', padding: '32px 32px 24px', textAlign: 'center' }}>
            <Text style={{ margin: 0, fontSize: 12, letterSpacing: 4, fontWeight: 600, textTransform: 'uppercase' }}>VIMET</Text>
            <Heading as="h1" style={{ margin: '12px 0 0', fontSize: 24, color: '#FFFFFF' }}>{titulo}</Heading>
          </Section>
          <Section style={{ padding: '28px 32px', color: DARK, fontSize: 15, lineHeight: '24px' }}>{children}</Section>
          <Section style={{ padding: '0 32px 28px', color: '#7A7A7A', fontSize: 12 }}>
            <Text style={{ margin: 0 }}>Si no pediste este mail, podés ignorarlo.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export function BotonAuth({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      style={{ display: 'inline-block', background: ORANGE, color: '#FFFFFF', padding: '12px 24px', borderRadius: 10, textDecoration: 'none', fontWeight: 600 }}
    >
      {children}
    </a>
  )
}
