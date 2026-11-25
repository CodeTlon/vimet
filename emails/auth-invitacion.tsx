import { Text } from '@react-email/components'

import { AuthEmailLayout, BotonAuth } from './auth-layout'

export default function InvitacionEmail({ nombre, url, rol }: { nombre: string; url: string; rol: string }) {
  return (
    <AuthEmailLayout preview="Te invitaron a VIMET" titulo="Te invitaron a VIMET">
      <Text>
        Hola {nombre}, te dieron acceso a VIMET como <strong>{rol}</strong>. Elegí tu contraseña para empezar.
      </Text>
      <BotonAuth href={url}>Elegir contraseña</BotonAuth>
      <Text style={{ fontSize: 13, color: '#7A7A7A' }}>El enlace vence en 7 días.</Text>
    </AuthEmailLayout>
  )
}
