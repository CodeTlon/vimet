import { defineConfig, devices } from '@playwright/test'

// Smoke de verificación del upgrade a Next 15: corre contra el build de
// producción (npm start) para reproducir el comportamiento real de las
// Server Components y el middleware (cookies async).
const PORT = 3137
// BASE_URL externo = entorno test desplegado (entornos.yml): no se levanta server local.
const EXTERNAL_URL = process.env.BASE_URL
const BASE_URL = EXTERNAL_URL ?? `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: EXTERNAL_URL
    ? undefined
    : {
        command: `cross-env PORT=${PORT} npm start`,
        url: `${BASE_URL}/login`,
        timeout: 120_000,
        reuseExistingServer: true,
      },
})
