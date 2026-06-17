import type { PantryItem } from '../types'
import { ItemCard } from './ItemCard'
import styles from './CategoryGroup.module.css'

type Props = {
  label: string
  items: PantryItem[]
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export function CategoryGroup({ label, items, onEdit, onDelete }: Props) {
  return (
    <section className={styles.group}>
      <h2 className={styles.heading}>
        {label}
        <span className={styles.count}>{items.length}</span>
      </h2>
      <ul className={styles.list}>
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </ul>
    </section>
  )
}
