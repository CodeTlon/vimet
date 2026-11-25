import { describe, expect, it } from 'vitest'

import { safeNextPath } from '@/lib/safe-next'

describe('safeNextPath (destino post-login)', () => {
  it('acepta paths internos con query', () => {
    expect(safeNextPath('/turnos/nuevo')).toBe('/turnos/nuevo')
    expect(safeNextPath('/mis-planes/3?tab=rutina')).toBe('/mis-planes/3?tab=rutina')
  })
  it('rechaza open redirects y basura', () => {
    for (const malo of ['https://evil.com', '//evil.com', String.raw`/\evil.com`, 'evil.com', '', null, 42, '/a\nb', '/login', '/login?next=/x']) {
      expect(safeNextPath(malo)).toBeNull()
    }
  })
})
