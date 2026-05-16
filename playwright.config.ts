import { defineConfig, devices } from '@playwright/test'

/**
 * Minimal Playwright config for the onork-app smoke suite.
 * Runs against the deployed URL — no local dev server required.
 *
 * Override target via BASE_URL env var:
 *   BASE_URL=https://preview-xyz.vercel.app npx playwright test
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 1,
  fullyParallel: true,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  use: {
    baseURL: process.env.BASE_URL || 'https://www.0ncore.com',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
