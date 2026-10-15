import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

// Archivos en disco (lib/storage/disk.ts): rutas seguras, subir/listar/borrar y URLs firmadas de los buckets privados.
const dir = mkdtempSync(join(tmpdir(), 'vimet-storage-'))
process.env.STORAGE_DIR = dir
process.env.STORAGE_PUBLIC_URL = 'https://vimet.test/media'
process.env.BETTER_AUTH_SECRET = 'secreto_de_prueba_secreto_de_prueba_1234'

const disk = await import('@/lib/storage/disk')

afterAll(() => rmSync(dir, { recursive: true, force: true }))

describe('storage en disco', () => {
  it('sube, lista por prefijo y borra', async () => {
    await disk.subirArchivo('planes', 'pac1/a.pdf', Buffer.from('x'))
    await disk.subirArchivo('planes', 'pac1/sub/b.pdf', Buffer.from('y'))
    await disk.subirArchivo('planes', 'pac2/c.pdf', Buffer.from('z'))
    expect((await disk.listarArchivos('planes', 'pac1/')).sort()).toEqual(['pac1/a.pdf', 'pac1/sub/b.pdf'])
    await disk.borrarArchivos('planes', ['pac1/a.pdf', 'pac1/no-existe.pdf'])
    expect(await disk.listarArchivos('planes', 'pac1/')).toEqual(['pac1/sub/b.pdf'])
  })

  it('rechaza rutas que se escapan del bucket', async () => {
    for (const mala of ['../x.pdf', 'a/../../x.pdf', '/abs.pdf', 'a//b.pdf', 'a\\b.pdf']) {
      await expect(disk.subirArchivo('planes', mala, Buffer.from('x'))).rejects.toThrow(/invalida/)
    }
    await expect(disk.subirArchivo('otro' as never, 'a.pdf', Buffer.from('x'))).rejects.toThrow(/Bucket/)
  })

  it('urlPublica solo en buckets publicos', () => {
    expect(disk.urlPublica('sitio', 'staff/1/foto.webp')).toBe('https://vimet.test/media/sitio/staff/1/foto.webp')
    expect(() => disk.urlPublica('planes', 'a.pdf')).toThrow(/no es publico/)
  })

  it('URL firmada: valida, vencida y manipulada', async () => {
    const url = (await disk.urlFirmada('recursos', 'pac1/r/a.pdf', 60))!
    const q = new URL(url).searchParams
    const exp = Number(q.get('exp'))
    const sig = q.get('sig')!
    expect(disk.firmaValida('recursos', 'pac1/r/a.pdf', exp, sig)).toBe(true)
    expect(disk.firmaValida('recursos', 'pac2/r/a.pdf', exp, sig)).toBe(false) // otro archivo
    expect(disk.firmaValida('recursos', 'pac1/r/a.pdf', exp + 1000, sig)).toBe(false) // vencimiento alterado
    const vencida = (await disk.urlFirmada('recursos', 'pac1/r/a.pdf', -10))!
    const qv = new URL(vencida).searchParams
    expect(disk.firmaValida('recursos', 'pac1/r/a.pdf', Number(qv.get('exp')), qv.get('sig')!)).toBe(false)
  })
})
