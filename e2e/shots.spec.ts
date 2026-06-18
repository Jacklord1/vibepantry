import { test, type Page } from '@playwright/test'
import { seedAll, seedProxyEndpoint, writeStore, sampleItems, TINY_PNG } from './seed'

// Three canned recipes for the cook-reveal mock (valid parse shape).
const RECIPES_JSON = JSON.stringify({
  recipes: [
    {
      title: 'Smoky chickpea & spinach skillet',
      blurb: 'A one-pan weeknight dinner that leans on what you already have.',
      usesItems: ['Tinned chickpeas', 'Baby spinach', 'Smoked paprika'],
      missingItems: ['Lemon'],
      servings: 2, timeMinutes: 25,
      ingredients: [{ name: 'Tinned chickpeas', amount: '2 cans' }],
      steps: ['Soften the onion.', 'Add chickpeas and paprika.', 'Wilt the spinach.'],
      macrosPerServing: { kcal: 410, protein_g: 18, carbs_g: 52, fat_g: 14 },
      tags: ['fast', 'one-pan', 'high-protein'],
    },
    {
      title: 'Garlic butter chicken & rice',
      blurb: 'Cosy, golden, and on the table in half an hour.',
      usesItems: ['Chicken thighs', 'Basmati rice', 'Garlic'],
      missingItems: [], servings: 3, timeMinutes: 30,
      ingredients: [{ name: 'Chicken thighs', amount: '1kg' }],
      steps: ['Sear the thighs.', 'Toast the rice.', 'Simmer together.'],
      macrosPerServing: null, tags: ['comfort'],
    },
    {
      title: 'Spinach & cheddar frittata',
      blurb: 'Fridge-clearing eggs that work for any meal.',
      usesItems: ['Free-range eggs', 'Cheddar', 'Baby spinach'],
      missingItems: [], servings: 4, timeMinutes: 20,
      ingredients: [{ name: 'Free-range eggs', amount: '8' }],
      steps: ['Beat the eggs.', 'Fold in spinach and cheddar.', 'Bake until set.'],
      macrosPerServing: null, tags: ['clean', 'high-protein'],
    },
  ],
})

// A canned vision response: two items plus a same-named duplicate (enables
// "Merge duplicates") and one carrying macros (shows the macros badge).
const VISION_ITEMS = JSON.stringify({
  items: [
    { name: 'Beef mince', quantity: '500g', category: 'meat_seafood', macros: null },
    { name: 'Greek yoghurt', quantity: '1 tub', category: 'dairy_eggs',
      macros: { kcal: 59, protein_g: 10, carbs_g: 4, fat_g: 0 } },
    { name: 'Roma tomatoes', quantity: '6', category: 'produce', macros: null },
    { name: 'Beef mince', quantity: '1 tray', category: 'meat_seafood', macros: null },
  ],
})

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

  test('cook reveal', async ({ page }) => {
    const mockUrl = await seedProxyEndpoint(page)
    await writeStore(page, 'items', sampleItems())
    await page.route(`**${mockUrl}`, async (route) => {
      await new Promise((r) => setTimeout(r, 1500)) // hold so the skeleton shows
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ content: [{ type: 'text', text: RECIPES_JSON }] }),
      })
    })
    await page.goto('/app#/cook')
    await page.getByRole('button', { name: 'Cook up options' }).click()
    await page.getByRole('heading', { name: 'Cooking up options' }).waitFor()
    await page.locator('[aria-busy="true"]').waitFor()
    await shoot(page, 'cook-cooking')
    await page.getByRole('heading', { name: 'Pick a recipe' }).waitFor()
    await page.waitForTimeout(400) // let the stagger settle for a clean shot
    await shoot(page, 'cook-options')
  })

  test('cook tonight', async ({ page }) => {
    const mockUrl = await seedProxyEndpoint(page)
    await writeStore(page, 'items', sampleItems())
    await page.route(`**${mockUrl}`, async (route) => {
      await new Promise((r) => setTimeout(r, 800))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ content: [{ type: 'text', text: RECIPES_JSON }] }),
      })
    })
    await page.goto('/app')
    await page.getByRole('button', { name: 'Cook tonight' }).click()
    // One tap auto-cooks straight to options.
    await page.getByRole('heading', { name: 'Pick a recipe' }).waitFor()
    await page.waitForTimeout(400)
    await shoot(page, 'cook-tonight')
  })

  test('undo toast', async ({ page }) => {
    await seedAll(page)
    await page.goto('/app')
    await page.getByText('Use soon').waitFor()
    await page.getByRole('button', { name: 'Delete Chicken thighs' }).click()
    await page.getByText('Removed Chicken thighs').waitFor()
    await shoot(page, 'undo-toast')
  })

  test('review grid', async ({ page }) => {
    const mockUrl = await seedProxyEndpoint(page)
    await page.route(`**${mockUrl}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ content: [{ type: 'text', text: VISION_ITEMS }] }),
      }),
    )
    await page.goto('/app#/snap')
    // The picker input (no capture attr) accepts the seeded photo.
    await page.locator('input[type="file"]:not([capture])').setInputFiles({
      name: 'shelf.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    })
    await page.getByRole('button', { name: /^Read 1 photo$/ }).click()
    await page.getByRole('button', { name: /Add 4 items to pantry/ }).waitFor()
    await shoot(page, 'review-grid')
  })
})
