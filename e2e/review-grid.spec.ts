import { test, expect, type Page } from '@playwright/test'
import { seedProxyEndpoint, TINY_PNG } from './seed'

// Expiry "use by" chips in the review grid. Deterministic: the vision call is
// mocked via a same-origin proxy endpoint (no network). One perishable item
// (produce) and one shelf-stable (pantry_dry) so we can assert the gating both
// ways. The installed values are fake; nothing hits a real API.

const VISION_ITEMS = JSON.stringify({
  items: [
    { name: 'Baby spinach', quantity: '1 bag', category: 'produce', macros: null },
    { name: 'Basmati rice', quantity: '2kg', category: 'pantry_dry', macros: null },
  ],
})

/** today + N days as yyyy-mm-dd from LOCAL components — mirrors the app's
 *  isoDaysFromToday so the expected date matches regardless of timezone. */
function isoDaysFromToday(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Drive Snap → review grid with the mocked vision response. */
async function openReview(page: Page) {
  const mockUrl = await seedProxyEndpoint(page)
  await page.route(`**${mockUrl}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ content: [{ type: 'text', text: VISION_ITEMS }] }),
    }),
  )
  await page.goto('/app#/snap')
  await page.locator('input[type="file"]:not([capture])').setInputFiles({
    name: 'shelf.png',
    mimeType: 'image/png',
    buffer: TINY_PNG,
  })
  await page.getByRole('button', { name: /^Read 1 photo$/ }).click()
  await page.getByRole('button', { name: /Add 2 items to pantry/ }).waitFor()
}

async function readItems(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ name: string; expiry: string | null }[]>((resolve, reject) => {
        const open = indexedDB.open('vibepantry', 1)
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const tx = open.result.transaction('items', 'readonly')
          const req = tx.objectStore('items').getAll()
          req.onsuccess = () => resolve(req.result)
          req.onerror = () => reject(req.error)
        }
      }),
  )
}

test('use-by chips show on perishable cards only', async ({ page }) => {
  await openReview(page)
  // Exactly one perishable item (produce) → one chip row; the pantry_dry item has none.
  await expect(page.getByText('use by?')).toHaveCount(1)
  await expect(page.getByRole('button', { name: '1wk', exact: true })).toHaveCount(1)
})

test('changing a shelf-stable item to a perishable category reveals the chips', async ({
  page,
}) => {
  await openReview(page)
  await expect(page.getByText('use by?')).toHaveCount(1)
  // The 2nd card is Basmati rice (pantry_dry); switch it to produce.
  await page.getByRole('combobox', { name: 'Category' }).nth(1).selectOption('produce')
  await expect(page.getByText('use by?')).toHaveCount(2)
})

test('tapping a chip sets the expiry and it persists to the pantry', async ({ page }) => {
  await openReview(page)
  await page.getByRole('button', { name: '1wk', exact: true }).click()
  await page.getByRole('button', { name: /Add 2 items to pantry/ }).click()
  await expect(page).toHaveURL(/\/app#\/$/)

  const items = await readItems(page)
  const spinach = items.find((i) => i.name === 'Baby spinach')
  const rice = items.find((i) => i.name === 'Basmati rice')
  expect(spinach?.expiry).toBe(isoDaysFromToday(7))
  // Shelf-stable item was never offered a chip → stays null.
  expect(rice?.expiry ?? null).toBeNull()
})

test('tapping the active chip again clears it (nothing required)', async ({ page }) => {
  await openReview(page)
  const chip = page.getByRole('button', { name: '1wk', exact: true })
  await chip.click()
  await expect(chip).toHaveAttribute('aria-pressed', 'true')
  await chip.click()
  await expect(chip).toHaveAttribute('aria-pressed', 'false')
})

test('a picked custom (non-preset) date shows as its own chip and clears on tap', async ({
  page,
}) => {
  await openReview(page)
  const custom = isoDaysFromToday(20) // not one of 2d/5d/1wk
  await page.locator('input[type="date"]').fill(custom)
  // Surfaces as a single pressed chip (no preset is active).
  const pressed = page.locator('button[aria-pressed="true"]')
  await expect(pressed).toHaveCount(1)
  await expect(page.locator('input[type="date"]')).toHaveValue(custom)
  // Tapping the custom chip clears the date.
  await pressed.click()
  await expect(page.locator('input[type="date"]')).toHaveValue('')
  await expect(page.locator('button[aria-pressed="true"]')).toHaveCount(0)
})
