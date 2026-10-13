import { Text } from '@react-email/components'

import { AuthEmailLayout, BotonAuth } from './auth-layout'

export default function ConfirmarCuentaEmail({ nombre, url }: { nombre: string; url: string }) {
  return (
    <AuthEmailLayout preview="Confirmá tu cuenta de VIMET" titulo="Confirmá tu cuenta">
      <Text>Hola {nombre}, gracias por registrarte. Confirmá tu email para activar tu cuenta.</Text>
      <BotonAuth href={url}>Confirmar cuenta</BotonAuth>
      <Text style={{ fontSize: 13, color: '#7A7A7A' }}>El enlace vence en 1 hora.</Text>
    </AuthEmailLayout>
  )
}
