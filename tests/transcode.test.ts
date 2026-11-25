import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { describe, expect, it } from 'vitest'

const { transcodeWithService } = await import('@/lib/transcode')

describe('cliente del servicio de compresion de video', () => {
  it('soft-fail sin configurar, con error, con resultado mas grande y con servicio caido; ok si comprime', async () => {
    let modo: 'ok' | 'grande' | '500' = 'ok'
    let auth = ''
    let url = ''
    const server = createServer((req, res) => {
      auth = req.headers.authorization ?? ''
      url = req.url ?? ''
      req.resume()
      req.on('end', () => {
        if (modo === '500') { res.statusCode = 500; res.end('x'); return }
        res.setHeader('content-type', 'video/mp4')
        res.end(Buffer.alloc(modo === 'grande' ? 5000 : 10, 1))
      })
    })
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    const original = Buffer.alloc(1000, 7)

    delete process.env.TRANSCODE_API_KEY
    delete process.env.TRANSCODE_SERVICE_URL
    expect(await transcodeWithService(original)).toBeNull()

    process.env.TRANSCODE_SERVICE_URL = `${base}/`
    process.env.TRANSCODE_API_KEY = 'clave-de-prueba'
    expect((await transcodeWithService(original, 'web'))?.length).toBe(10)
    expect(auth).toBe('Bearer clave-de-prueba')
    expect(url).toBe('/v1/transcode?preset=web')

    modo = 'grande'
    expect(await transcodeWithService(original)).toBeNull()
    modo = '500'
    expect(await transcodeWithService(original)).toBeNull()

    server.close()
    process.env.TRANSCODE_SERVICE_URL = 'http://127.0.0.1:1'
    expect(await transcodeWithService(original)).toBeNull()
  })
})
