import { esStaff } from '@/lib/auth/session'

import { opsEscritura } from './ops-escritura'
import { opsLectura } from './ops-lectura'
import { ErrorOp, type Archivos, type Ctx, type Operacion } from './tipos'

// Catalogo cerrado de operaciones que la app mobile puede pedir. Lo que no esta aca no existe:
// no hay acceso generico a tablas. Cada entrada declara quien puede llamarla y valida sus argumentos.
export const OPS: Record<string, Operacion> = { ...opsLectura, ...opsEscritura } as Record<string, Operacion>

export function permiteAcceso(ctx: Ctx, acceso: Operacion['acceso']): boolean {
  if (acceso === 'usuario') return true
  if (acceso === 'staff') return esStaff(ctx.profile.rol)
  return ctx.profile.rol === 'admin'
}

/** Ejecuta una operacion con las barreras comunes: existe, el rol alcanza y los argumentos validan. */
export async function ejecutarOp(nombre: string, argsCrudos: unknown, ctx: Ctx, archivos: Archivos): Promise<unknown> {
  const def = Object.hasOwn(OPS, nombre) ? OPS[nombre] : undefined
  if (!def) throw new ErrorOp('Operación desconocida', 404)
  if (!permiteAcceso(ctx, def.acceso)) throw new ErrorOp('No autorizado', 403)
  const parsed = def.args.safeParse(argsCrudos ?? {})
  if (!parsed.success) throw new ErrorOp(parsed.error.issues[0]?.message ?? 'Datos inválidos')
  return def.run(ctx, parsed.data, archivos)
}
