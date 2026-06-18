import { test, expect } from '@playwright/test'

// Magic-link key installer (Phase 5a) — receiving end. Each test runs in an
// isolated browser context (fresh IndexedDB). No network: the installed keys are
// fake test values, never used for an API call.
//
// Fixtures (verified): btoa('TESTKEY123') === 'VEVTVEtFWTEyMw=='; last 4 'Y123'.

const KEY_B64 = 'VEVTVEtFWTEyMw==' // -> 'TESTKEY123'
const now = () => Math.floor(Date.now() / 1000)

// The installer only runs on a full document load (the real magic-link flow —
// tapping a link always reloads). A same-path, hash-only `goto` is a
// same-document navigation and would NOT re-run it, so hop via about:blank to
// force a fresh load when re-triggering within one test.
async function openLink(page: import('@playwright/test').Page, url: string) {
  await page.goto('about:blank')
  await page.goto(url)
}

test('happy path: installs the key, scrubs the URL, routes to the intro deck', async ({ page }) => {
  await page.goto(`/app#k=${KEY_B64}&t=${now()}`)

  // Themed confirmation shown.
  await expect(page.getByText(/your key's saved on this device/)).toBeVisible()

  // URL no longer carries the key (neither the param nor the encoded value).
  expect(page.url()).not.toContain('k=')
  expect(page.url()).not.toContain('VEVTVE')

  // CTA routes to the intro deck at the ROOT path (full nav, not the in-app
  // hash router) so first-timers see the landing slides.
  await page.getByRole('button', { name: 'See how it works' }).click()
  await expect(page).toHaveURL(/:\d+\/$/)
  await expect(page.getByRole('heading', { name: 'VibePantry' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Primary' })).toHaveCount(0)

  // Key persisted (same origin) — masked in Settings, proving the SAME write path.
  await page.goto('/app#/settings')
  await expect(page.getByText('••••••••Y123')).toBeVisible()
})

test('no t param still installs (staleness is optional)', async ({ page }) => {
  await page.goto(`/app#k=${KEY_B64}`)
  await expect(page.getByText(/your key's saved on this device/)).toBeVisible()
})

test('stale link (>24h) is refused and nothing is saved', async ({ page }) => {
  await page.goto(`/app#k=${KEY_B64}&t=${now() - 90_000}`)
  await expect(page.getByText(/setup link has expired/)).toBeVisible()

  // Nothing saved: Settings opens in edit mode with the empty key input.
  await page.goto('/app#/settings')
  await expect(page.getByPlaceholder('sk-ant-…')).toBeVisible()
  await expect(page.getByText('••••••••Y123')).toHaveCount(0)
})

test('undecodable key shows the incomplete message, saves nothing', async ({ page }) => {
  await page.goto('/app#k=@@@@@@@@&t=' + now())
  await expect(page.getByText(/looks incomplete/)).toBeVisible()

  await page.goto('/app#/settings')
  await expect(page.getByPlaceholder('sk-ant-…')).toBeVisible()
})

test('implausibly short key (decodes to "ab") shows the incomplete message', async ({ page }) => {
  await page.goto(`/app#k=YWI=&t=${now()}`) // atob -> 'ab', length 2
  await expect(page.getByText(/looks incomplete/)).toBeVisible()
})

test('bare /app (no k) loads normally with no installer dialog', async ({ page }) => {
  await page.goto('/app')
  await expect(page.getByText('No items yet')).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Set up your API key' })).toHaveCount(0)
})

test('empty k param is ignored silently', async ({ page }) => {
  await page.goto('/app#k=')
  await expect(page.getByText('No items yet')).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Set up your API key' })).toHaveCount(0)
})

test('existing key prompts before overwrite; Cancel leaves it, Replace swaps it', async ({ page }) => {
  // Install once.
  await page.goto(`/app#k=${KEY_B64}&t=${now()}`)
  await expect(page.getByText(/your key's saved on this device/)).toBeVisible()

  // A second link with a DIFFERENT key prompts to replace (fresh load).
  const otherB64 = Buffer.from('OTHERKEY999', 'binary').toString('base64') // last4 'Y999'
  await openLink(page, `/app#k=${otherB64}&t=${now()}`)
  await expect(page.getByText(/Replace the existing key on this device\?/)).toBeVisible()

  // Cancel -> overlay dismisses, original key untouched.
  await page.getByRole('button', { name: 'Cancel' }).click()
  await page.goto('/app#/settings')
  await expect(page.getByText('••••••••Y123')).toBeVisible()

  // Re-trigger and Replace -> new key swapped in.
  await openLink(page, `/app#k=${otherB64}&t=${now()}`)
  await page.getByRole('button', { name: 'Replace' }).click()
  await expect(page.getByText(/your key's saved on this device/)).toBeVisible()
  await page.goto('/app#/settings')
  await expect(page.getByText('••••••••Y999')).toBeVisible()
})

test('base64 with "+" survives parsing (manual parser, not URLSearchParams)', async ({ page }) => {
  const decoded = '>'.repeat(9) // printable, length 9
  const b64 = Buffer.from(decoded, 'binary').toString('base64') // 'Pj4+Pj4+Pj4+' — contains '+'
  expect(b64).toMatch(/[+/]/)

  await page.goto(`/app#k=${b64}&t=${now()}`)
  await expect(page.getByText(/your key's saved on this device/)).toBeVisible()

  // Last 4 of the decoded key are preserved -> '+' was not corrupted to a space.
  await page.goto('/app#/settings')
  await expect(page.getByText('••••••••>>>>')).toBeVisible()
})
