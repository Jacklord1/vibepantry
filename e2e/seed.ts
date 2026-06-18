import type { Page } from '@playwright/test'
import type { PantryItem, Recipe } from '../src/types'

// Seed helpers for E2E + screenshots. The app's IndexedDB is the only store, so
// we drive the page to '/' (which lazily creates the DB), then write records
// straight into it with the native IndexedDB API and reload to pick them up.

/** Wait for the app shell + DB to exist, then write records into a store. */
async function writeStore(
  page: Page,
  store: 'items' | 'recipes' | 'settings',
  records: unknown[],
): Promise<void> {
  await page.evaluate(
    ({ store, records }) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('vibepantry', 1)
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const db = open.result
          const tx = db.transaction(store, 'readwrite')
          for (const r of records) tx.objectStore(store).put(r)
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
          tx.onerror = () => reject(tx.error)
        }
      }),
    { store, records },
  )
}

/** ISO date N days from today (browser clock), yyyy-mm-dd. */
function isoInDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function sampleItems(): PantryItem[] {
  const now = new Date().toISOString()
  const mk = (
    name: string,
    quantity: string,
    category: PantryItem['category'],
    expiry?: string,
  ): PantryItem => ({
    id: `seed-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name,
    quantity,
    category,
    expiry: expiry ?? null,
    addedAt: now,
    confirmed: true,
  })
  return [
    mk('Beef mince', '500g', 'meat_seafood', isoInDays(1)),
    mk('Chicken thighs', '1kg', 'meat_seafood'),
    mk('Free-range eggs', '12', 'dairy_eggs', isoInDays(5)),
    mk('Greek yoghurt', '500g tub', 'dairy_eggs', isoInDays(2)),
    mk('Cheddar', 'half a block', 'dairy_eggs'),
    mk('Baby spinach', '1 bag', 'produce', isoInDays(2)),
    mk('Roma tomatoes', '6', 'produce'),
    mk('Brown onions', '3', 'produce'),
    mk('Garlic', '1 bulb', 'produce'),
    mk('Basmati rice', '2kg', 'pantry_dry'),
    mk('Spaghetti', '1 packet', 'pantry_dry'),
    mk('Tinned chickpeas', '2 cans', 'pantry_dry'),
    mk('Olive oil', '1 bottle', 'spices_condiments'),
    mk('Smoked paprika', '1 jar', 'spices_condiments'),
    mk('Sourdough', '1 loaf', 'bakery', isoInDays(1)),
  ]
}

export function sampleRecipe(): Recipe {
  return {
    id: 'seed-recipe',
    title: 'Smoky chickpea & spinach skillet',
    blurb: 'A one-pan weeknight dinner that leans on what you already have.',
    usesItems: ['Tinned chickpeas', 'Baby spinach', 'Brown onions', 'Garlic', 'Smoked paprika'],
    missingItems: ['Lemon'],
    servings: 2,
    timeMinutes: 25,
    steps: [
      'Warm the olive oil in a wide pan and soften the diced onion with a pinch of salt, about 6 minutes.',
      'Stir in the crushed garlic and smoked paprika and cook until fragrant, 1 minute.',
      'Tip in the drained chickpeas and the tomatoes; simmer until thickened, 10 minutes.',
      'Fold through the spinach a handful at a time until just wilted.',
      'Finish with a squeeze of lemon and serve with sourdough to mop the pan.',
    ],
    ingredients: [
      { name: 'Tinned chickpeas', amount: '2 cans, drained' },
      { name: 'Baby spinach', amount: '2 large handfuls' },
      { name: 'Brown onion', amount: '1, diced' },
      { name: 'Garlic', amount: '2 cloves' },
      { name: 'Smoked paprika', amount: '1 tsp' },
      { name: 'Roma tomatoes', amount: '3, chopped' },
      { name: 'Olive oil', amount: '2 tbsp' },
    ],
    macrosPerServing: { kcal: 410, protein_g: 18, carbs_g: 52, fat_g: 14 },
    tags: ['fast', 'one-pan', 'high-protein'],
    createdAt: new Date().toISOString(),
  }
}

/** Full seed: API key (ungate), a stocked pantry, and one saved recipe. */
export async function seedAll(page: Page): Promise<void> {
  // The app lives at /app (/' is the landing page); HashRouter handles sub-routes.
  await page.goto('/app')
  // Pantry page mounts usePantry → getDB(), so the DB + stores now exist.
  await page.waitForSelector('nav')
  await writeStore(page, 'settings', [{ key: 'apiKey', value: 'sk-ant-e2e-test' }])
  await writeStore(page, 'items', sampleItems())
  await writeStore(page, 'recipes', [sampleRecipe()])
}

/**
 * Ungate the app via a same-origin "proxy" endpoint instead of a key. Pointing
 * the app at a same-origin path means a mocked /v1/messages response needs no
 * CORS dance — pair with page.route() on the same URL. Returns the URL written.
 */
export async function seedProxyEndpoint(page: Page, url = '/__mock_anthropic'): Promise<string> {
  await page.goto('/app')
  await page.waitForSelector('nav')
  await writeStore(page, 'settings', [{ key: 'apiEndpoint', value: url }])
  return url
}

/** A minimal valid 1×1 PNG, for setInputFiles where the app must decode it. */
export const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC',
  'base64',
)
