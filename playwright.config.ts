import { defineConfig, devices } from '@playwright/test'

// Dos juegos de pruebas:
//  - publico.spec.ts: humo sin base ni sesion en 3 viewports (mobile / tablet / desktop). Corre en CI y contra TEST_URL.
//  - smoke.spec.ts: login staff + rutas /admin (necesita .env.local con una base de TEST). Solo local, nunca en CI ni prod.
// BASE_URL externo = entorno test desplegado (entornos.yml): no se levanta server local.
const PORT = 3137
const EXTERNAL_URL = process.env.BASE_URL
const BASE_URL = EXTERNAL_URL ?? `http://localhost:${PORT}`
const SOLO_PUBLICO = !!process.env.CI || !!EXTERNAL_URL

export default defineConfig({
  testDir: './e2e',
  // El setup crea un usuario staff en la base de .env.local: solo tiene sentido en local.
  globalSetup: SOLO_PUBLICO ? undefined : './e2e/global-setup.ts',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Permite usar un Chromium ya instalado (ej. /opt/playwright) si no coincide con la version de Playwright.
    launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH || undefined },
  },
  projects: [
    { name: 'mobile', testMatch: 'publico.spec.ts', use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 667 } } },
    { name: 'tablet', testMatch: 'publico.spec.ts', use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } } },
    { name: 'desktop', testMatch: 'publico.spec.ts', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    ...(SOLO_PUBLICO ? [] : [{ name: 'chromium', testMatch: 'smoke.spec.ts', use: { ...devices['Desktop Chrome'] } }]),
  ],
  webServer: EXTERNAL_URL
    ? undefined
    : {
        command: `cross-env PORT=${PORT} npm start`,
        url: `${BASE_URL}/login`,
        timeout: 120_000,
        reuseExistingServer: true,
      },
})
