import { useCallback, useEffect, useState } from 'react'
import type { Category, PantryItem } from '../types'
import { getAllItems } from '../db'
import { categoryLabel, categoryOrder } from '../lib/categories'

export type CategoryGroup = {
  category: Category
  label: string
  items: PantryItem[]
}

export type UsePantry = {
  items: PantryItem[]
  groups: CategoryGroup[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/** Loads confirmed pantry items and groups them by category (SPEC order). */
export function usePantry(): UsePantry {
  const [items, setItems] = useState<PantryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const all = await getAllItems()
      setItems(all.filter((i) => i.confirmed))
      setError(null)
    } catch (e) {
      console.error(e)
      setError("Couldn't load your pantry.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Load the pantry from IndexedDB on mount. State only updates after the
    // async read resolves; this is a deliberate local-data load effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
  }, [refresh])

  const groups = groupByCategory(items)
  return { items, groups, loading, error, refresh }
}

function groupByCategory(items: PantryItem[]): CategoryGroup[] {
  const map = new Map<Category, PantryItem[]>()
  for (const item of items) {
    const list = map.get(item.category) ?? []
    list.push(item)
    map.set(item.category, list)
  }
  return [...map.entries()]
    .map(([category, list]) => ({
      category,
      label: categoryLabel(category),
      items: list.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => categoryOrder(a.category) - categoryOrder(b.category))
}
