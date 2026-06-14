import { expect, test } from '@playwright/test'

import { SMOKE_EMAIL, SMOKE_PASSWORD } from './_creds'

// Smoke de verificación del upgrade Next 14 -> 15. Cubre el riesgo real del
// cambio de APIs async (cookies() + params como Promise) a través de rutas
// auth-gated que sólo se ejercitan con una sesión real.
test('login staff + rutas /admin no rompen en Next 15', async ({ page }) => {
  // 1) Login (server action signInWithPassword -> set-cookie -> redirect)
  await page.goto('/login')
  await page.fill('input[name="email"]', SMOKE_EMAIL)
  await page.fill('input[name="password"]', SMOKE_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/admin/**', { timeout: 15_000 })
  await expect(page).toHaveURL(/\/admin\//)

  // 2) Rutas admin estáticas: deben renderizar (no 5xx). Ejercitan cookies() async.
  for (const path of ['/admin/dashboard', '/admin/calendario', '/admin/pacientes', '/admin/configuracion']) {
    const res = await page.goto(path)
    expect(res?.status(), `${path} no debe ser 5xx`).toBeLessThan(500)
    await expect(page, `${path} no debe redirigir fuera de /admin`).toHaveURL(new RegExp('/admin'))
  }

  // 3) Ruta dinámica [id]: ejercita `await props.params`. Con un paciente
  //    inexistente debe caer en notFound() (404) — un 500 indicaría que el
  //    cambio de params async rompió el componente.
  const dyn = await page.goto('/admin/pacientes/00000000-0000-0000-0000-000000000000')
  expect(dyn?.status(), 'la ruta [id] no debe ser 5xx (params async OK)').toBeLessThan(500)
})
