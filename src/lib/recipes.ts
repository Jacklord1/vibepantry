import type { PantryItem, Recipe } from '../types'
import { callMessages } from './anthropic'
import { extractJsonObject } from './json'

// Recipe generation — the loop's payoff. One text call: confirmed pantry +
// 1–2 preference taps -> 2–3 recipes makeable mostly from stock. Contract is
// LOCKED in SPEC.md. (Macros stay null in Phase 3; the macros layer is Phase 4.)

export type Vibe = 'fast' | 'clean' | 'comfort'
export type RecipePrefs = {
  /** A pantry item name to star, or null for "surprise me". */
  hero: string | null
  vibe: Vibe
}

export const VIBES: { value: Vibe; label: string }[] = [
  { value: 'fast', label: 'Fast' },
  { value: 'clean', label: 'Clean' },
  { value: 'comfort', label: 'Comfort' },
]

export const RECIPE_SYSTEM = `You are a practical, resourceful home cook. You are given the user's current pantry (item names with rough quantities) and 1–2 preferences. Propose 2–3 recipes they can make MOSTLY from what they already have.

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
- Keep "steps" concise and in order. Set "macrosPerServing" to null.
- Return only the JSON object.`

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
      macrosPerServing: null,
      tags: strArray(o.tags),
    })
  }
  if (out.length === 0) throw new RecipeParseError()
  return out
}

function pantryList(pantry: PantryItem[]): string {
  return pantry
    .map((i) => `- ${i.name}${i.quantity ? ` (${i.quantity})` : ''}`)
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
    `- Vibe: ${prefs.vibe}\n\n` +
    `Give me 2–3 recipes I can cook mostly from this.`

  const text = await callMessages({
    system: RECIPE_SYSTEM,
    // 2–3 full recipes (ingredients + steps) blow past ~1500 and truncate the
    // JSON mid-array (verified). 3000 gives headroom like the vision call.
    maxTokens: 3000,
    messages: [{ role: 'user', content: userText }],
  })

  const now = new Date().toISOString()
  return parseRecipesResponse(text).map((r) => ({
    ...r,
    id: crypto.randomUUID(),
    createdAt: now,
  }))
}
