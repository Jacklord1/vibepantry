import type { Category, Macros, PantryItem } from '../types'
import { CATEGORIES, DEFAULT_CATEGORY } from './categories'
import { callMessages } from './anthropic'
import { downscaleToBase64 } from './image'
import { extractJsonObject } from './json'
import { uuid } from './id'

// Vision extraction — the hero call. One image per request, returns an array
// of items (multi-item per photo is the point; a single item or a nutrition
// label is just an array of length 1). Contract is LOCKED in SPEC.md.

const VALID_CATEGORIES = new Set<string>(CATEGORIES.map((c) => c.value))

const CATEGORY_LIST = CATEGORIES.map((c) => c.value).join(', ')

export const VISION_SYSTEM = `You are a pantry-cataloguing vision assistant. You receive one image, which may contain one grocery/pantry item, many items, or a single nutrition/macro label.

Return ONLY a JSON object of this exact shape — no prose, no explanation, no markdown code fences:
{ "items": [ { "name": "...", "quantity": "...", "category": "<enum>", "macros": null } ] }

Rules:
- List every distinct grocery or pantry item that is visibly present. Several items in one photo means several entries in the array.
- "name": a short, common name a home cook would use (e.g. "Beef mince", "Smoked paprika", "Greek yoghurt").
- "quantity": a freeform best-guess string (e.g. "1kg", "2 cans", "half a jar", "1 bunch"). If you can't tell, give a sensible guess.
- "category": exactly one of: ${CATEGORY_LIST}.
- "macros": null in normal cases. If the image is a nutrition/macro label, populate it for that one item as { "kcal": number, "protein_g": number, "carbs_g": number, "fat_g": number } using the label's per-100g values where shown (omit any field not on the label).
- Never invent items that are not visibly present. If there are no food items, return { "items": [] }.

Return only the JSON object.`

const USER_INSTRUCTION = 'Catalogue the grocery items in this photo.'

type RawItem = {
  name: string
  quantity: string
  category: Category
  macros: Macros | null
}

/** Thrown when the model's text can't be parsed into the locked shape. */
export class VisionParseError extends Error {
  constructor() {
    super("Couldn't read that photo's response — try again.")
    this.name = 'VisionParseError'
  }
}

function coerceMacros(value: unknown): Macros | null {
  if (typeof value !== 'object' || value === null) return null
  const o = value as Record<string, unknown>
  const out: Macros = {}
  for (const k of ['kcal', 'protein_g', 'carbs_g', 'fat_g'] as const) {
    if (typeof o[k] === 'number' && Number.isFinite(o[k])) {
      out[k] = o[k] as number
    }
  }
  return Object.keys(out).length > 0 ? out : null
}

/**
 * Defensive parse of the vision response into validated raw items.
 * Strips fences, try/catch, coerces categories to the enum. Throws
 * VisionParseError on anything it can't read (never a silent crash).
 */
export function parseVisionResponse(text: string): RawItem[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(extractJsonObject(text))
  } catch {
    throw new VisionParseError()
  }
  if (typeof parsed !== 'object' || parsed === null) throw new VisionParseError()

  const items = (parsed as Record<string, unknown>).items
  if (!Array.isArray(items)) throw new VisionParseError()

  const out: RawItem[] = []
  for (const raw of items) {
    if (typeof raw !== 'object' || raw === null) continue
    const o = raw as Record<string, unknown>
    const name = typeof o.name === 'string' ? o.name.trim() : ''
    if (!name) continue // never surface a nameless item
    const quantity = typeof o.quantity === 'string' ? o.quantity.trim() : ''
    const category: Category =
      typeof o.category === 'string' && VALID_CATEGORIES.has(o.category)
        ? (o.category as Category)
        : DEFAULT_CATEGORY
    out.push({ name, quantity, category, macros: coerceMacros(o.macros) })
  }
  return out
}

/**
 * Run one vision call for one photo and return unconfirmed PantryItems
 * (confirmed:false until the user accepts them from the review grid).
 */
export async function extractItemsFromPhoto(
  file: File,
  photoId: string,
): Promise<PantryItem[]> {
  const img = await downscaleToBase64(file)
  const text = await callMessages({
    system: VISION_SYSTEM,
    kind: 'vision',
    maxTokens: 3000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: img.mediaType,
              data: img.base64,
            },
          },
          { type: 'text', text: USER_INSTRUCTION },
        ],
      },
    ],
  })

  const raw = parseVisionResponse(text)
  const now = new Date().toISOString()
  return raw.map((r) => ({
    id: uuid(),
    name: r.name,
    quantity: r.quantity,
    category: r.category,
    macros: r.macros,
    sourcePhotoId: photoId,
    addedAt: now,
    confirmed: false,
  }))
}
