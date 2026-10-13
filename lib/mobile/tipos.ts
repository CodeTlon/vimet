import type { z } from 'zod'

import type { Profile, SessionUser } from '@/lib/auth/session'

export type Ctx = { user: SessionUser; profile: Profile }

/** Archivos de un request multipart (campos `archivo` e `imagenes`). */
export type Archivos = { archivo: File | null; imagenes: File[] }

export type Acceso = 'usuario' | 'staff' | 'admin'

export type Operacion<S extends z.ZodTypeAny = z.ZodTypeAny> = {
  /** Quien puede invocarla. Es la primera barrera; cada operacion ademas acota por recurso. */
  acceso: Acceso
  args: S
  run: (ctx: Ctx, args: z.infer<S>, archivos: Archivos) => Promise<unknown>
}

/** Error esperado de una operacion: llega al cliente con su status y mensaje. */
export class ErrorOp extends Error {
  constructor(
    message: string,
    public status: 400 | 403 | 404 = 400,
  ) {
    super(message)
  }
}

export const op = <S extends z.ZodTypeAny>(def: Operacion<S>): Operacion<S> => def
