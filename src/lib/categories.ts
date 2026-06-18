import type { Category } from '../types'

// Display label + sort order for each category. Order drives the
// grouped pantry view and the Add-form dropdown. Keep in sync with
// the Category union in types.ts.

type CategoryMeta = { value: Category; label: string }

export const CATEGORIES: CategoryMeta[] = [
  { value: 'produce', label: 'Produce' },
  { value: 'meat_seafood', label: 'Meat & Seafood' },
  { value: 'dairy_eggs', label: 'Dairy & Eggs' },
  { value: 'pantry_dry', label: 'Pantry & Dry Goods' },
  { value: 'spices_condiments', label: 'Spices & Condiments' },
  { value: 'frozen', label: 'Frozen' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'beverages', label: 'Beverages' },
  { value: 'other', label: 'Other' },
]

const LABELS: Record<Category, string> = CATEGORIES.reduce(
  (acc, c) => {
    acc[c.value] = c.label
    return acc
  },
  {} as Record<Category, string>,
)

const ORDER: Record<Category, number> = CATEGORIES.reduce(
  (acc, c, i) => {
    acc[c.value] = i
    return acc
  },
  {} as Record<Category, number>,
)

export function categoryLabel(c: Category): string {
  return LABELS[c] ?? 'Other'
}

export function categoryOrder(c: Category): number {
  return ORDER[c] ?? CATEGORIES.length
}

export const DEFAULT_CATEGORY: Category = 'other'

// Categories that spoil within days — these get the optional "use by" expiry
// chips in the review grid. Shelf-stable categories (pantry_dry, spices, frozen,
// beverages, other) don't, to keep the confirm step clean. `frozen` is excluded
// deliberately (months-long); add it here if that changes.
export const PERISHABLE_CATEGORIES = new Set<Category>([
  'produce',
  'meat_seafood',
  'dairy_eggs',
  'bakery',
])

export function isPerishable(c: Category): boolean {
  return PERISHABLE_CATEGORIES.has(c)
}
