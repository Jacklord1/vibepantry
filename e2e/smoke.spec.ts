import { test, expect } from '@playwright/test'

// Deterministic smoke suite — no network, no API key. Exercises the spine on a
// phone viewport so the mobile polish pass can't silently break navigation,
// the manual-add flow, search, the cook gate, or settings.

test('app loads with the bottom nav and an empty pantry', async ({ page }) => {
  await page.goto('/app')
  const nav = page.getByRole('navigation', { name: 'Primary' })
  await expect(nav).toBeVisible()
  for (const label of ['Pantry', 'Cook', 'Add', 'Settings']) {
    await expect(nav.getByRole('link', { name: label })).toBeVisible()
  }
  await expect(page.getByText('No items yet')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Snap pantry' })).toBeVisible()
})

test('can add an item manually and find it via search', async ({ page }) => {
  await page.goto('/app')
  await page.getByRole('navigation').getByRole('link', { name: 'Add' }).click()
  await expect(page.getByRole('heading', { name: 'Add items' })).toBeVisible()

  await page.getByLabel('Name').fill('Beef mince')
  await page.getByLabel('Quantity').fill('500g')
  await page.getByRole('button', { name: 'Add to pantry' }).click()

  // Redirected back to the pantry with the new item shown.
  await expect(page).toHaveURL(/\/app#\/$/)
  await expect(page.getByText('Beef mince')).toBeVisible()

  // Live search filters by name.
  const search = page.getByPlaceholder('Search your pantry…')
  await search.fill('beef')
  await expect(page.getByText('Beef mince')).toBeVisible()
  await search.fill('zzz')
  await expect(page.getByText(/No items match/)).toBeVisible()
})

test('cook is gated without an API key', async ({ page }) => {
  await page.goto('/app')
  await page.getByRole('navigation').getByRole('link', { name: 'Cook' }).click()
  await expect(page.getByText(/Cooking needs your Anthropic API key/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Go to Settings' })).toBeVisible()
})

test('settings saves then clears an API key', async ({ page }) => {
  await page.goto('/app#/settings')
  await expect(page.getByRole('heading', { name: 'Anthropic API key' })).toBeVisible()

  await page.getByPlaceholder('sk-ant-…').fill('sk-ant-fake-key-1234')
  await page.getByRole('button', { name: 'Save key' }).click()
  await expect(page.getByText('Key saved to this browser.')).toBeVisible()
  await expect(page.getByText(/••••/)).toBeVisible()

  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(page.getByText('Key removed.')).toBeVisible()
  await expect(page.getByPlaceholder('sk-ant-…')).toBeVisible()
})

test('no in-app-browser banner in a normal mobile browser', async ({ page }) => {
  // Default project UA is a real iOS Safari UA — must NOT trip the wall/banner.
  await page.goto('/app#/snap')
  await expect(page.getByText("won't work properly")).toHaveCount(0)
  await expect(
    page.getByRole('heading', { name: 'Photo scanning needs a real browser' }),
  ).toHaveCount(0)
})

// A chat-app in-app browser (Instagram) — photo decode OOMs there, so we wall
// off Snap and push the user into a real browser, with an escape hatch.
test.describe('in-app browser wall', () => {
  test.use({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 302.0.0.0',
  })

  test('shows the banner + Snap wall, with a continue-anyway escape', async ({
    page,
  }) => {
    await page.goto('/app')
    // App-wide danger banner names the app and offers a real-browser escape.
    await expect(page.getByRole('alert')).toContainText("won't work properly")
    await expect(page.getByRole('alert')).toContainText('Instagram')

    // Snap itself is fully walled off — no capture UI.
    await page.goto('/app#/snap')
    await expect(
      page.getByRole('heading', { name: 'Photo scanning needs a real browser' }),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Take photo' })).toHaveCount(0)

    // The escape dismisses the wall (never lock out a real browser); what's
    // behind it (here, the key gate) is no longer walled off.
    await page.getByRole('button', { name: /continue anyway/ }).click()
    await expect(
      page.getByRole('heading', { name: 'Photo scanning needs a real browser' }),
    ).toHaveCount(0)
  })
})
