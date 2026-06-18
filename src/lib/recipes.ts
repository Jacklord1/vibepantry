import type { Macros, PantryItem, Recipe } from '../types'
import { callMessages } from './anthropic'
import { extractJsonObject } from './json'
import { uuid } from './id'

// Recipe generation — the loop's payoff. One text call: confirmed pantry +
// preference taps -> 2–3 recipes makeable mostly from stock. Contract is LOCKED
// in SPEC.md. Phase 4 turns on the macros flag + a "use what's expiring" bias.

export type Vibe = 'fast' | 'clean' | 'comfort'
export type RecipePrefs = {
  /** A pantry item name to star, or null for "surprise me". */
  hero: string | null
  vibe: Vibe
  /** Show macros per serving + lean high-protein. */
  macros: boolean
  /** Names of soon-to-expire items to prioritise (optional). */
  useSoon?: string[]
}

export const VIBES: { value: Vibe; label: string }[] = [
  { value: 'fast', label: 'Fast' },
  { value: 'clean', label: 'Clean' },
  { value: 'comfort', label: 'Comfort' },
]

function recipeSystem(macros: boolean): string {
  const macroRule = macros
    ? `- The user wants macros: set "macrosPerServing" to a best-estimate object { "kcal": number, "protein_g": number, "carbs_g": number, "fat_g": number } per serving. Lean toward higher-protein recipes and add a "high-protein" tag where it genuinely fits. Where a pantry item lists per-100g macros, use them to sharpen your estimate.`
    : `- Set "macrosPerServing" to null.`
  return `You are a practical, resourceful home cook. You are given the user's current pantry (item names with rough quantities, sometimes per-100g macros) and a few preferences. Propose 2–3 recipes they can make MOSTLY from what they already have.

Return ONLY a JSON object of this exact shape — no prose, no explanation, no markdown code fences:
{ "recipes": [ {
  "title": "...",
  "blurb": "one short, appetising line",
  "usesItems": ["pantry item names this draws on"],
  "missingItems": ["only small, common gaps the user may need to buy"],
  "servings": 2,
  "timeMinutes": 30,
  "ingredients": [ { "name": "...", "amount": "..." } ],
  "steps": ["each step, in cooking order"],
  "macrosPerServing": null,
  "tags": ["fast", "one-pan", "high-protein"]
} ] }

Rules:
- Return 2 to 3 recipes.
- Each recipe must be makeable mostly from the listed pantry items — use what they have.
- "missingItems" is only for small, common staples (salt, oil, a lemon), never a full second shop. Prefer recipes that need nothing missing.
- "usesItems" must reference the actual pantry item names provided.
- Respect the preferences: a given hero ingredient should star in at least one recipe; honour the vibe:
  - fast = quick, minimal steps, weeknight.
  - clean = lighter, fresh, whole-food leaning.
  - comfort = hearty, cosy, satisfying.
- If asked to prioritise soon-to-expire items, make sure most recipes use them.
- Keep "steps" concise and in order.
${macroRule}
- Return only the JSON object.`
}

/** Thrown when the model's text can't be parsed into the locked shape. */
export class RecipeParseError extends Error {
  constructor() {
    super('Couldn’t read the recipe response — try again.')
    this.name = 'RecipeParseError'
  }
}

type RawRecipe = Omit<Recipe, 'id' | 'createdAt'>

function strArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.trim())
    .filter(Boolean)
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function ingredients(v: unknown): { name: string; amount: string }[] {
  if (!Array.isArray(v)) return []
  const out: { name: string; amount: string }[] = []
  for (const raw of v) {
    if (typeof raw === 'object' && raw !== null) {
      const o = raw as Record<string, unknown>
      const name = typeof o.name === 'string' ? o.name.trim() : ''
      if (!name) continue
      const amount = typeof o.amount === 'string' ? o.amount.trim() : ''
      out.push({ name, amount })
    } else if (typeof raw === 'string' && raw.trim()) {
      out.push({ name: raw.trim(), amount: '' }) // tolerate plain-string lists
    }
  }
  return out
}

/** Keep macrosPerServing only when all four values are finite numbers. */
function macrosPerServing(v: unknown): Recipe['macrosPerServing'] {
  if (typeof v !== 'object' || v === null) return null
  const o = v as Record<string, unknown>
  const n = (k: string) =>
    typeof o[k] === 'number' && Number.isFinite(o[k]) ? (o[k] as number) : null
  const kcal = n('kcal')
  const protein_g = n('protein_g')
  const carbs_g = n('carbs_g')
  const fat_g = n('fat_g')
  if (kcal === null || protein_g === null || carbs_g === null || fat_g === null)
    return null
  return { kcal, protein_g, carbs_g, fat_g }
}

/** Defensive parse of the recipe response. Throws RecipeParseError on failure. */
export function parseRecipesResponse(text: string): RawRecipe[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(extractJsonObject(text))
  } catch {
    throw new RecipeParseError()
  }
  if (typeof parsed !== 'object' || parsed === null) throw new RecipeParseError()
  const recipes = (parsed as Record<string, unknown>).recipes
  if (!Array.isArray(recipes)) throw new RecipeParseError()

  const out: RawRecipe[] = []
  for (const raw of recipes) {
    if (typeof raw !== 'object' || raw === null) continue
    const o = raw as Record<string, unknown>
    const title = typeof o.title === 'string' ? o.title.trim() : ''
    if (!title) continue // skip a recipe with no title
    out.push({
      title,
      blurb: typeof o.blurb === 'string' ? o.blurb.trim() : '',
      usesItems: strArray(o.usesItems),
      missingItems: strArray(o.missingItems),
      servings: num(o.servings, 2),
      timeMinutes: num(o.timeMinutes, 30),
      ingredients: ingredients(o.ingredients),
      steps: strArray(o.steps),
      macrosPerServing: macrosPerServing(o.macrosPerServing),
      tags: strArray(o.tags),
    })
  }
  if (out.length === 0) throw new RecipeParseError()
  return out
}

function formatItemMacros(m: Macros): string {
  const parts: string[] = []
  if (typeof m.kcal === 'number') parts.push(`${m.kcal}kcal`)
  if (typeof m.protein_g === 'number') parts.push(`P${m.protein_g}`)
  if (typeof m.carbs_g === 'number') parts.push(`C${m.carbs_g}`)
  if (typeof m.fat_g === 'number') parts.push(`F${m.fat_g}`)
  return parts.length ? ` [per 100g: ${parts.join(' ')}]` : ''
}

function pantryList(pantry: PantryItem[]): string {
  return pantry
    .map((i) => {
      const qty = i.quantity ? ` (${i.quantity})` : ''
      const macros = i.macros ? formatItemMacros(i.macros) : ''
      return `- ${i.name}${qty}${macros}`
    })
    .join('\n')
}

/**
 * Generate 2–3 recipes from the confirmed pantry + preferences.
 * Returns ready-to-store Recipe[] (client-assigned ids + createdAt).
 */
export async function generateRecipes(
  pantry: PantryItem[],
  prefs: RecipePrefs,
): Promise<Recipe[]> {
  const userText =
    `My pantry:\n${pantryList(pantry)}\n\n` +
    `Preferences:\n` +
    `- Hero ingredient: ${prefs.hero ?? "cook's choice (surprise me)"}\n` +
    `- Vibe: ${prefs.vibe}\n` +
    (prefs.macros ? `- Show macros per serving and lean high-protein.\n` : '') +
    (prefs.useSoon && prefs.useSoon.length
      ? `- Prioritise using these soon-to-expire items: ${prefs.useSoon.join(', ')}.\n`
      : '') +
    `\nGive me 2–3 recipes I can cook mostly from this.`

  const text = await callMessages({
    system: recipeSystem(prefs.macros),
    kind: 'recipe',
    // 2–3 full recipes (ingredients + steps) blow past ~1500 and truncate the
    // JSON mid-array (verified). 3000 gives headroom like the vision call.
    maxTokens: 3000,
    messages: [{ role: 'user', content: userText }],
  })

  const now = new Date().toISOString()
  return parseRecipesResponse(text).map((r) => ({
    ...r,
    id: uuid(),
    createdAt: now,
  }))
}
