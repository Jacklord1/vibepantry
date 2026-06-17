import { test, type Page } from '@playwright/test'
import { seedAll } from './seed'

// Screenshot harness for the mobile polish audit. Not assertions — it captures
// the key surfaces at phone size into e2e/shots/<tag>/ so before/after can be
// compared. Run with: SHOT_TAG=before npx playwright test shots --project=mobile
// Only the 'mobile' project shoots (skip 'small' to avoid doubling files).
const TAG = process.env.SHOT_TAG || 'before'
const DIR = `e2e/shots/${TAG}`

async function shoot(page: Page, name: string) {
  // Above-the-fold (what the thumb sees) and the whole scroll.
  await page.screenshot({ path: `${DIR}/${name}-fold.png` })
  await page.screenshot({ path: `${DIR}/${name}-full.png`, fullPage: true })
}

test.describe(() => {
  test.skip(({ viewport }) => viewport?.width !== 390, 'shoot once at 390')

  test('pantry empty', async ({ page }) => {
    await page.goto('/app')
    await page.getByText('No items yet').waitFor()
    await shoot(page, 'pantry-empty')
  })

  test('pantry stocked', async ({ page }) => {
    await seedAll(page)
    await page.goto('/app')
    await page.getByText('Use soon').waitFor()
    await shoot(page, 'pantry-stocked')
  })

  test('add form', async ({ page }) => {
    await page.goto('/app#/add')
    await page.getByRole('heading', { name: 'Add items' }).waitFor()
    await shoot(page, 'add-form')
  })

  test('cook prefs', async ({ page }) => {
    await seedAll(page)
    await page.goto('/app#/cook')
    await page.getByRole('heading', { name: 'What’s the hero?' }).waitFor()
    await shoot(page, 'cook-prefs')
  })

  test('recipe sheet', async ({ page }) => {
    await seedAll(page)
    await page.goto('/app#/recipe/seed-recipe')
    await page.getByRole('heading', { name: 'Ingredients' }).waitFor()
    await shoot(page, 'recipe-sheet')
  })

  test('snap', async ({ page }) => {
    await seedAll(page)
    await page.goto('/app#/snap')
    await page.getByRole('button', { name: 'Take photo' }).waitFor()
    await shoot(page, 'snap')
  })

  test('settings', async ({ page }) => {
    await seedAll(page)
    await page.goto('/app#/settings')
    await page.getByRole('heading', { name: 'Anthropic API key' }).waitFor()
    await shoot(page, 'settings')
  })
})
