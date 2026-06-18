import type { Category, PantryItem } from '../types'
import { CATEGORIES, isPerishable } from '../lib/categories'
import { isoDaysFromToday } from '../lib/expiry'
import { IconCheck, IconTrash } from './Icons'
import styles from './ReviewGrid.module.css'

export type RowPatch = Partial<
  Pick<PantryItem, 'name' | 'quantity' | 'category' | 'expiry'>
>

// Quick relative "use by" options for perishables (today + N days). The native
// date picker covers everything else.
const EXPIRY_PRESETS = [
  { label: '2d', days: 2 },
  { label: '5d', days: 5 },
  { label: '1wk', days: 7 },
] as const

type Props = {
  items: PantryItem[]
  onUpdate: (id: string, patch: RowPatch) => void
  onDelete: (id: string) => void
  onMergeDuplicates: () => void
  onAccept: () => void
  accepting: boolean
}

function hasDuplicates(items: PantryItem[]): boolean {
  const seen = new Set<string>()
  for (const i of items) {
    const key = i.name.trim().toLowerCase()
    if (seen.has(key)) return true
    seen.add(key)
  }
  return false
}

function hasMacros(item: PantryItem): boolean {
  return !!item.macros && Object.keys(item.macros).length > 0
}

export function ReviewGrid({
  items,
  onUpdate,
  onDelete,
  onMergeDuplicates,
  onAccept,
  accepting,
}: Props) {
  const dupes = hasDuplicates(items)

  return (
    <section className={styles.wrap}>
      <div className={styles.head}>
        <h2 className={styles.title}>
          Review
          <span className={styles.count}>{items.length}</span>
        </h2>
        <button
          className={styles.merge}
          onClick={onMergeDuplicates}
          disabled={!dupes}
          title={dupes ? 'Combine same-named items' : 'No duplicates'}
        >
          Merge duplicates
        </button>
      </div>

      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.id} className={styles.row}>
            <div className={styles.fields}>
              <input
                className={styles.name}
                value={item.name}
                onChange={(e) => onUpdate(item.id, { name: e.target.value })}
                placeholder="Name"
                aria-label="Item name"
              />
              <div className={styles.sub}>
                <input
                  className={styles.qty}
                  value={item.quantity}
                  onChange={(e) =>
                    onUpdate(item.id, { quantity: e.target.value })
                  }
                  placeholder="Quantity"
                  aria-label="Quantity"
                />
                <select
                  className={styles.cat}
                  value={item.category}
                  onChange={(e) =>
                    onUpdate(item.id, { category: e.target.value as Category })
                  }
                  aria-label="Category"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                {hasMacros(item) && <span className={styles.macros}>macros</span>}
              </div>
              {isPerishable(item.category) && (
                <div className={styles.expiry}>
                  <span className={styles.expLabel}>use by?</span>
                  {EXPIRY_PRESETS.map((p) => {
                    const iso = isoDaysFromToday(p.days)
                    const on = item.expiry === iso
                    return (
                      <button
                        key={p.days}
                        className={`${styles.expChip} ${on ? styles.expChipOn : ''}`}
                        aria-pressed={on}
                        onClick={() =>
                          onUpdate(item.id, { expiry: on ? null : iso })
                        }
                      >
                        {p.label}
                      </button>
                    )
                  })}
                  <input
                    type="date"
                    className={styles.expDate}
                    value={item.expiry ?? ''}
                    onChange={(e) =>
                      onUpdate(item.id, { expiry: e.target.value || null })
                    }
                    aria-label="Pick expiry date"
                  />
                </div>
              )}
            </div>
            <button
              className={styles.del}
              onClick={() => onDelete(item.id)}
              aria-label={`Discard ${item.name}`}
            >
              <IconTrash />
            </button>
          </li>
        ))}
      </ul>

      <button
        className={styles.accept}
        onClick={onAccept}
        disabled={accepting || items.length === 0}
      >
        <IconCheck size={20} />
        {accepting
          ? 'Adding…'
          : `Add ${items.length} item${items.length === 1 ? '' : 's'} to pantry`}
      </button>
    </section>
  )
}
