import { Text } from '@react-email/components'

import { AuthEmailLayout } from './auth-layout'

export default function CodigoRecuperacionEmail({ codigo }: { codigo: string }) {
  return (
    <AuthEmailLayout preview="Tu código para recuperar la contraseña" titulo="Recuperar contraseña">
      <Text>Ingresá este código en la pantalla de recuperación para elegir una contraseña nueva:</Text>
      <Text style={{ fontSize: 32, letterSpacing: 8, fontWeight: 700, margin: '16px 0' }}>{codigo}</Text>
      <Text style={{ fontSize: 13, color: '#7A7A7A' }}>El código vence en 30 minutos y solo sirve una vez.</Text>
    </AuthEmailLayout>
  )
}
