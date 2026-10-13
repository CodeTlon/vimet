import { audit_log } from '@/db/schema'
import { db as dbGlobal, type Db } from '@/lib/db'

/**
 * Registra en `audit_log` que un miembro del staff abrió una vista con datos clínicos de un
 * paciente (acción `'ver'`). Las escrituras las registra el trigger `log_audit_change`
 * (drizzle/0001); las lecturas solo existen a nivel app, así que solo queda registrado lo que
 * pasa por un call site que llame a esta función.
 *
 * Best-effort a propósito: si el insert falla NO debe romper la página que la llamó.
 */
export async function logAuditView(
  params: { pacienteId: string; actorId: string; tabla: string; registroId?: string },
  db: Db = dbGlobal,
) {
  try {
    await db.insert(audit_log).values({
      paciente_id: params.pacienteId,
      actor_id: params.actorId,
      accion: 'ver',
      tabla: params.tabla,
      registro_id: params.registroId ?? params.pacienteId,
    })
  } catch (err) {
    console.error(`logAuditView: no se pudo registrar el acceso a ${params.tabla}`, err)
  }
}
