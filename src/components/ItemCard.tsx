import type { PantryItem } from '../types'
import { IconEdit, IconTrash } from './Icons'
import styles from './ItemCard.module.css'

type Props = {
  item: PantryItem
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

/** Deletes immediately — the pantry surfaces an Undo snackbar, so there's no
    confirm step to slow the common case. */
export function ItemCard({ item, onEdit, onDelete }: Props) {
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
          onClick={() => onDelete(item.id)}
          aria-label={`Delete ${item.name}`}
        >
          <IconTrash />
        </button>
      </div>
    </li>
  )
}
