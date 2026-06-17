import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Category } from '../types'
import { CATEGORIES, DEFAULT_CATEGORY } from '../lib/categories'
import styles from './ItemForm.module.css'

export type ItemFormValues = {
  name: string
  quantity: string
  category: Category
}

type Props = {
  initial?: Partial<ItemFormValues>
  submitLabel?: string
  onSubmit: (values: ItemFormValues) => void | Promise<void>
  onCancel?: () => void
}

export function ItemForm({
  initial,
  submitLabel = 'Add item',
  onSubmit,
  onCancel,
}: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [quantity, setQuantity] = useState(initial?.quantity ?? '')
  const [category, setCategory] = useState<Category>(
    initial?.category ?? DEFAULT_CATEGORY,
  )
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Give the item a name.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      await onSubmit({
        name: trimmed,
        quantity: quantity.trim(),
        category,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <label className={styles.field}>
        <span className={styles.label}>Name</span>
        <input
          className={styles.input}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Beef mince"
          autoFocus
          autoComplete="off"
          enterKeyHint="done"
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Quantity</span>
        <input
          className={styles.input}
          type="text"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="1kg · 2 cans · half a jar"
          autoComplete="off"
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>Category</span>
        <select
          className={styles.input}
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.actions}>
        {onCancel && (
          <button
            type="button"
            className={styles.cancel}
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
        )}
        <button type="submit" className={styles.submit} disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
