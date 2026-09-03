import type { createClient } from '@/lib/supabase/server'

type Supabase = Awaited<ReturnType<typeof createClient>>

/**
 * Registra en `audit_log` que un miembro del staff abrió una vista con
 * datos clínicos de un paciente (acción `'ver'`). Postgres no audita SELECT
 * nativamente sin la extensión `pgaudit` (no garantizada en Supabase
 * managed) — este es el complemento a nivel app de los triggers de
 * insert/update/delete (migración 0039_audit_log.sql, que sí cubren
 * escritura automáticamente).
 *
 * Limitación real, documentada también en la migración: solo queda
 * registrado lo que pasa por un call site que llama a esta función. Una
 * lectura que no la invoque (una vista clínica nueva a la que no se le
 * sumó el logging, o un acceso directo a la API de Supabase con la
 * service_role key) no aparece acá.
 *
 * Best-effort a propósito: si el insert falla (RLS, red, lo que sea) NO
 * debe romper la página que la llamó — solo loguea el error server-side.
 */
export async function logAuditView(
  supabase: Supabase,
  params: { pacienteId: string; actorId: string; tabla: string; registroId?: string },
) {
  const { error } = await supabase.from('audit_log').insert({
    paciente_id: params.pacienteId,
    actor_id: params.actorId,
    accion: 'ver',
    tabla: params.tabla,
    registro_id: params.registroId ?? params.pacienteId,
  })
  if (error) {
    console.error(`logAuditView: no se pudo registrar el acceso a ${params.tabla}`, error.message)
  }
}
