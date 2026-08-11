import { test, expect, request } from '@playwright/test'

/**
 * Smoke tests for the 0ncore.com signup chain (PF-010..PF-017 regression net).
 * Runs against the deployed URL set by BASE_URL (default https://www.0ncore.com).
 */

const TEST_EMAIL = `e2e-test-${Date.now()}@cryptogoatz.com`
const TEST_PASSWORD = 'E2eTest!Password123'

test.describe('@smoke signup chain', () => {
  // The homepage carries no inline email capture — the CTA is a link to
  // /signup. These two tests asserted an input that the page has not had since
  // the CRM rebuild, so the suite failed on EVERY commit and stopped meaning
  // anything. Assert the real entry path instead.
  test('homepage loads and offers signup @smoke', async ({ page }) => {
    const res = await page.goto('/')
    expect(res?.ok()).toBeTruthy()
    await expect(page.locator('a[href="/signup"]').first()).toBeVisible()
  })

  test('signup page takes an email and honours ?email= prefill @smoke', async ({ page }) => {
    // The form is client-rendered, so wait for hydration rather than for HTML.
    await page.goto(`/signup?email=${encodeURIComponent(TEST_EMAIL)}`)
    const email = page.locator('input[type="email"]').first()
    await expect(email).toBeVisible({ timeout: 15_000 })
    await expect(email).toHaveValue(TEST_EMAIL)
  })

  test('POST /api/auth/signup creates a user @smoke', async ({ playwright }) => {
    const api = await playwright.request.newContext({
      baseURL: process.env.BASE_URL || 'https://www.0ncore.com',
    })
    const res = await api.post('/api/auth/signup', {
      data: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        full_name: 'E2E Test',
        company: 'E2E Test Co',
      },
    })
    expect(res.status(), `signup body: ${await res.text()}`).toBeLessThan(300)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.userId).toBeTruthy()
    await api.dispose()
  })

  test('GET /api/health/crm returns ok @smoke', async ({ request }) => {
    const res = await request.get('/api/health/crm')
    expect(res.ok(), `health body: ${await res.text()}`).toBeTruthy()
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  test('/welcome redirects unauth users to /login @smoke', async ({ page }) => {
    // Basic auth-gate check: without a session, /welcome must redirect.
    // This verifies middleware + getSession() flow without needing real creds.
    await page.goto('/welcome', { waitUntil: 'domcontentloaded' })
    await page.waitForURL(/\/login/, { timeout: 15_000 })
    expect(page.url()).toMatch(/\/login/)
    expect(page.url()).toContain('next=')
  })
})
