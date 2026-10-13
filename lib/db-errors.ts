/** Codigo SQLSTATE de un error de pg, aunque Drizzle lo haya envuelto (`cause`). */
export function pgCode(err: unknown): string | undefined {
  let e: unknown = err
  for (let i = 0; i < 4 && e && typeof e === 'object'; i++) {
    const code = (e as { code?: unknown }).code
    if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) return code
    e = (e as { cause?: unknown }).cause
  }
  return undefined
}

export const PG = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  EXCLUSION_VIOLATION: '23P01',
} as const
