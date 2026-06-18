// Cook-preference option lists shared by the Cook page, Settings and the recipe
// prompt builder, so the three never drift. Mirrors categories.ts: a value+label
// list plus small lookups. Meal type is per-cook; dietary persists as a default.

export type MealType =
  | 'any'
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'snack'
  | 'dessert'

export const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'any', label: 'Any' },
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
  { value: 'dessert', label: 'Dessert' },
]

const MEAL_LABELS: Record<MealType, string> = MEAL_TYPES.reduce(
  (acc, m) => {
    acc[m.value] = m.label
    return acc
  },
  {} as Record<MealType, string>,
)

export function mealTypeLabel(m: MealType): string {
  return MEAL_LABELS[m] ?? 'Any'
}

/** Settings key for the persisted, per-device dietary default. */
export const DIETARY_SETTING = 'dietary'

export type Dietary = 'vegetarian' | 'vegan' | 'gluten_free'

export const DIETARY_OPTIONS: { value: Dietary; label: string }[] = [
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'gluten_free', label: 'Gluten-free' },
]

const DIETARY_VALUES = new Set<string>(DIETARY_OPTIONS.map((d) => d.value))

const DIETARY_LABELS: Record<Dietary, string> = DIETARY_OPTIONS.reduce(
  (acc, d) => {
    acc[d.value] = d.label
    return acc
  },
  {} as Record<Dietary, string>,
)

/** Lower-case prompt phrasing for the hard dietary rule (e.g. "gluten-free"). */
export function dietaryLabel(d: Dietary): string {
  return (DIETARY_LABELS[d] ?? d).toLowerCase()
}

/** Serialise the per-device dietary default for the string-only settings store. */
export function serialiseDietary(d: Dietary[]): string {
  return d.join(',')
}

/** Parse the stored default back, dropping anything no longer a known option. */
export function parseDietary(raw: string | undefined): Dietary[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is Dietary => DIETARY_VALUES.has(s))
}
