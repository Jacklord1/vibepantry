import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'
import type { PantryItem, Recipe } from '../types'

// VibePantry persistence. IndexedDB is the single source of truth —
// no localStorage, no server. All access goes through this module.

const DB_NAME = 'vibepantry'
const DB_VERSION = 1

type SettingRecord = { key: string; value: string }

interface VibePantryDB extends DBSchema {
  items: {
    key: string
    value: PantryItem
    indexes: { 'by-category': string }
  }
  settings: {
    key: string
    value: SettingRecord
  }
  recipes: {
    key: string
    value: Recipe
  }
}

let dbPromise: Promise<IDBPDatabase<VibePantryDB>> | null = null

function getDB(): Promise<IDBPDatabase<VibePantryDB>> {
  if (!dbPromise) {
    dbPromise = openDB<VibePantryDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('items')) {
          const items = db.createObjectStore('items', { keyPath: 'id' })
          items.createIndex('by-category', 'category')
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' })
        }
        if (!db.objectStoreNames.contains('recipes')) {
          db.createObjectStore('recipes', { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

/* ---------- Items ---------- */

export async function getAllItems(): Promise<PantryItem[]> {
  const db = await getDB()
  return db.getAll('items')
}

export async function getItem(id: string): Promise<PantryItem | undefined> {
  const db = await getDB()
  return db.get('items', id)
}

/** Insert or update an item (keyed by id). */
export async function putItem(item: PantryItem): Promise<void> {
  const db = await getDB()
  await db.put('items', item)
}

export async function deleteItem(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('items', id)
}

export async function clearItems(): Promise<void> {
  const db = await getDB()
  await db.clear('items')
}

/* ---------- Recipes (generation history) ---------- */

export async function getAllRecipes(): Promise<Recipe[]> {
  const db = await getDB()
  return db.getAll('recipes')
}

export async function getRecipe(id: string): Promise<Recipe | undefined> {
  const db = await getDB()
  return db.get('recipes', id)
}

export async function putRecipe(recipe: Recipe): Promise<void> {
  const db = await getDB()
  await db.put('recipes', recipe)
}

/** Save a batch of freshly generated recipes (history). */
export async function saveRecipes(recipes: Recipe[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('recipes', 'readwrite')
  for (const r of recipes) await tx.store.put(r)
  await tx.done
}

/* ---------- Settings (key/value) ---------- */

export async function getSetting(key: string): Promise<string | undefined> {
  const db = await getDB()
  const rec = await db.get('settings', key)
  return rec?.value
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDB()
  await db.put('settings', { key, value })
}

export async function deleteSetting(key: string): Promise<void> {
  const db = await getDB()
  await db.delete('settings', key)
}

/* ---------- Export / Import (the only "sync") ---------- */

const EXPORT_VERSION = 1

type PantryExport = {
  app: 'vibepantry'
  version: number
  exportedAt: string
  items: PantryItem[]
}

export async function exportPantry(): Promise<string> {
  const items = await getAllItems()
  const payload: PantryExport = {
    app: 'vibepantry',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    items,
  }
  return JSON.stringify(payload, null, 2)
}

const VALID_CATEGORIES = new Set([
  'produce',
  'meat_seafood',
  'dairy_eggs',
  'pantry_dry',
  'spices_condiments',
  'frozen',
  'bakery',
  'beverages',
  'other',
])

function isPantryItem(v: unknown): v is PantryItem {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    typeof o.quantity === 'string' &&
    typeof o.category === 'string' &&
    VALID_CATEGORIES.has(o.category) &&
    typeof o.addedAt === 'string' &&
    typeof o.confirmed === 'boolean'
  )
}

export type ImportResult = { imported: number; skipped: number }

/**
 * Replace the pantry with the items in a JSON export.
 * Accepts either a full export object or a bare array of items.
 * Throws with a human-readable message on malformed input so the
 * caller can surface it — never fails silently.
 */
export async function importPantry(json: string): Promise<ImportResult> {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error("That file isn't valid JSON.")
  }

  let rawItems: unknown
  if (Array.isArray(parsed)) {
    rawItems = parsed
  } else if (
    typeof parsed === 'object' &&
    parsed !== null &&
    Array.isArray((parsed as Record<string, unknown>).items)
  ) {
    rawItems = (parsed as Record<string, unknown>).items
  } else {
    throw new Error("That doesn't look like a VibePantry export.")
  }

  const all = rawItems as unknown[]
  const valid = all.filter(isPantryItem)
  if (valid.length === 0) {
    throw new Error('No valid pantry items found in that file.')
  }

  const db = await getDB()
  const tx = db.transaction('items', 'readwrite')
  await tx.store.clear()
  for (const item of valid) {
    await tx.store.put(item)
  }
  await tx.done

  return { imported: valid.length, skipped: all.length - valid.length }
}
