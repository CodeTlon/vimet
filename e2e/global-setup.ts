import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

import { SMOKE_EMAIL, SMOKE_PASSWORD } from './_creds'

// Garantiza un usuario staff (rol nutricionista) en el Supabase DEV para que el
// smoke pueda atravesar el gate de /admin. Idempotente: si ya existe, sólo
// re-fija la contraseña y promueve el rol.
export default async function globalSetup() {
  const env = Object.fromEntries(
    readFileSync('.env.local', 'utf8')
      .split('\n')
      .filter((l) => l.includes('='))
      .map((l) => {
        const i = l.indexOf('=')
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
      }),
  )

  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env.local')

  const sb = createClient(url, key, { auth: { persistSession: false } })

  const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 })
  let user = list?.users?.find((u) => u.email === SMOKE_EMAIL)

  if (!user) {
    const { data, error } = await sb.auth.admin.createUser({
      email: SMOKE_EMAIL,
      password: SMOKE_PASSWORD,
      email_confirm: true,
      user_metadata: { nombre: 'Smoke', apellido: 'Staff' },
    })
    if (error) throw new Error('createUser: ' + error.message)
    user = data.user
  } else {
    await sb.auth.admin.updateUserById(user.id, { password: SMOKE_PASSWORD, email_confirm: true })
  }

  // El trigger handle_new_user crea el profile con rol 'paciente'; lo promovemos a staff.
  const { error: upErr } = await sb
    .from('profiles')
    .upsert(
      { id: user!.id, email: SMOKE_EMAIL, nombre: 'Smoke', apellido: 'Staff', rol: 'nutricionista' },
      { onConflict: 'id' },
    )
  if (upErr) throw new Error('upsert profile: ' + upErr.message)

  console.log('[global-setup] usuario staff de smoke listo:', SMOKE_EMAIL)
}
