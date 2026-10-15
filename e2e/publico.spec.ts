import { expect, test } from '@playwright/test'

// Humo sin base ni sesion: valida lo deterministico que no depende de los datos.
//  - cada ruta publica responde sin error y tiene contenido
//  - el area privada exige sesion (redirect optimista de proxy.ts)
//  - health, SEO (robots, sitemap) y 404
const RUTAS_PUBLICAS = ['/', '/nosotros', '/metodologia', '/servicios', '/faq', '/contacto', '/login', '/registro', '/terminos', '/privacidad']

test.describe('Publico: renderiza sin error', () => {
  for (const ruta of RUTAS_PUBLICAS) {
    test(`${ruta} responde <400 y tiene contenido`, async ({ page }) => {
      const res = await page.goto(ruta)
      expect(res?.status(), `status HTTP de ${ruta}`).toBeLessThan(400)
      await expect(page.getByRole('heading').first()).toBeVisible()
    })
  }
})

test.describe('Area privada: exige sesion', () => {
  for (const ruta of ['/admin/dashboard', '/mis-turnos', '/feedback-semanal']) {
    test(`${ruta} sin sesion redirige a /login`, async ({ page }) => {
      await page.goto(ruta)
      await expect(page).toHaveURL(/\/login\b/)
    })
  }
})

test.describe('Infra y SEO', () => {
  test('/api/health es JSON (200 con base, 503 sin base)', async ({ request }) => {
    const res = await request.get('/api/health')
    expect([200, 503]).toContain(res.status())
    expect(res.headers()['content-type']).toContain('application/json')
  })

  test('robots.txt y sitemap.xml existen', async ({ request }) => {
    expect((await request.get('/robots.txt')).status()).toBe(200)
    expect((await request.get('/sitemap.xml')).status()).toBe(200)
  })

  test('archivo privado sin firma da 403 y bucket inexistente 404', async ({ request }) => {
    expect((await request.get('/media/planes/pac/x.pdf')).status()).toBe(403)
    expect((await request.get('/media/nada/x.pdf')).status()).toBe(404)
  })

  test('una ruta inexistente da 404', async ({ page }) => {
    const res = await page.goto('/esta-ruta-no-existe')
    expect(res?.status()).toBe(404)
  })
})
