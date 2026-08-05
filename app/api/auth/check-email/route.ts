import { NextResponse } from 'next/server'
import { z } from 'zod'

import { emailExists } from '@/lib/auth/email-exists'

export const dynamic = 'force-dynamic'

const schema = z.object({ email: z.string().email() })

/**
 * POST { email } -> { exists: boolean }
 *
 * Lo consume el login de la app mobile (repo `vimet-app`, sin backend propio)
 * para decidir si limpia el campo email tras un intento fallido. El mensaje
 * de error que ve el usuario es el mismo en ambos casos — igual que en la web.
 *
 * Es un endpoint sin autenticar (en el login todavía no hay sesión), así que
 * confirma la existencia de una cuenta a quien lo llame. Ese trade-off ya
 * estaba tomado en el registro (`/api/mobile/auth/registro` responde "Ya
 * existe una cuenta con ese email"). Rate limit: no hay utilidad propia en el
 * repo; el único freno real hoy es el de la plataforma. Si en algún momento
 * se suma rate limiting server-side, esta ruta es candidata de primera.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
  }

  return NextResponse.json({ exists: await emailExists(parsed.data.email) })
}
