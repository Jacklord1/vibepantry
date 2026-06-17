import { useState } from 'react'
import type { PantryItem } from '../types'
import { IconEdit, IconTrash } from './Icons'
import styles from './ItemCard.module.css'

type Props = {
  item: PantryItem
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export function ItemCard({ item, onEdit, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <li className={`${styles.card} ${styles.confirm}`}>
        <span className={styles.confirmText}>Delete “{item.name}”?</span>
        <div className={styles.actions}>
          <button
            className={styles.cancel}
            onClick={() => setConfirming(false)}
          >
            Cancel
          </button>
          <button className={styles.delete} onClick={() => onDelete(item.id)}>
            Delete
          </button>
        </div>
      </li>
    )
  }

  return (
    <li className={styles.card}>
      <div className={styles.body}>
        <span className={styles.name}>{item.name}</span>
        {item.quantity && (
          <span className={styles.quantity}>{item.quantity}</span>
        )}
      </div>
      <div className={styles.actions}>
        <button
          className={styles.iconBtn}
          onClick={() => onEdit(item.id)}
          aria-label={`Edit ${item.name}`}
        >
          <IconEdit />
        </button>
        <button
          className={styles.iconBtn}
          onClick={() => setConfirming(true)}
          aria-label={`Delete ${item.name}`}
        >
          <IconTrash />
        </button>
      </div>
    </li>
  )
}
