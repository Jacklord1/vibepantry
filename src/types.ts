// VibePantry data model.
// LOCKED shape from SPEC.md — extend, don't rename.

export type Category =
  | 'produce'
  | 'meat_seafood'
  | 'dairy_eggs'
  | 'pantry_dry'
  | 'spices_condiments'
  | 'frozen'
  | 'bakery'
  | 'beverages'
  | 'other'

export type Macros = {
  kcal?: number
  protein_g?: number
  carbs_g?: number
  fat_g?: number
}

export type PantryItem = {
  id: string // uuid
  name: string // "Beef mince"
  quantity: string // freeform: "1kg", "2 cans", "half a jar"
  category: Category // enum above
  expiry?: string | null // ISO date, optional (Phase 4)
  macros?: Macros | null // optional, per-100g where known (Phase 4 / label photos)
  sourcePhotoId?: string // which upload it came from (for review grouping)
  addedAt: string // ISO
  confirmed: boolean // false until user accepts it from the review grid
}

export type Recipe = {
  id: string
  title: string
  blurb: string // one-line vibe description
  usesItems: string[] // pantry item names it draws on
  missingItems: string[] // small gaps user may need
  servings: number
  timeMinutes: number
  steps: string[]
  ingredients: { name: string; amount: string }[]
  macrosPerServing?: {
    kcal: number
    protein_g: number
    carbs_g: number
    fat_g: number
  } | null
  tags: string[] // "high-protein", "fast", "one-pan"
  createdAt?: string // ISO — when generated (for history ordering)
}
