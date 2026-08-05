import { createAdminClient } from '@/lib/supabase/admin'

/**
 * ¿Existe una cuenta con este email? Solo para decidir si vale la pena
 * conservar lo que el usuario tipeó tras un login fallido — el mensaje de
 * error que se le muestra es SIEMPRE el mismo, exista o no (no revelamos
 * la existencia de la cuenta por texto).
 *
 * Fuente de verdad: `profiles.email`, que el trigger `handle_new_user`
 * copia de `auth.users.email` al crearse la cuenta (migración 0001/0006).
 * Se usa en vez de `auth.admin.listUsers()` porque ese endpoint es paginado
 * y no filtra por email — habría que barrer todos los usuarios. El proyecto
 * no tiene flujo de cambio de email, así que la columna no se desincroniza.
 *
 * Ante cualquier error devuelve `true` (asumimos que existe): equivocarse
 * para este lado deja el campo tal cual estaba, que es lo inocuo.
 */
export async function emailExists(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return true

  const { data, error } = await createAdminClient()
    .from('profiles')
    .select('id')
    .eq('email', normalized)
    .limit(1)

  if (error) {
    console.error('emailExists:', error.message)
    return true
  }

  return (data?.length ?? 0) > 0
}
