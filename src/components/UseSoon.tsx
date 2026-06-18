import type { PantryItem } from '../types'
import { expiryLabel, expiringItems } from '../lib/expiry'
import { IconClose, IconCook } from './Icons'
import styles from './UseSoon.module.css'

/** On-open reminder banner — items expiring within 3 days, with a one-tap
    shortcut into the cook flow biased to use them tonight. */
export function UseSoonBanner({
  count,
  onCook,
  onDismiss,
}: {
  count: number
  onCook: () => void
  onDismiss: () => void
}) {
  return (
    <div className={styles.banner} role="status">
      <span className={styles.bannerText}>
        <strong>
          {count} item{count === 1 ? '' : 's'}
        </strong>{' '}
        expiring within 3 days.
      </span>
      <div className={styles.bannerActions}>
        <button className={styles.cookSoon} onClick={onCook}>
          <IconCook size={16} />
          Cook tonight
        </button>
        <button
          className={styles.dismiss}
          onClick={onDismiss}
          aria-label="Dismiss reminder"
        >
          <IconClose size={16} />
        </button>
      </div>
    </div>
  )
}

/** "Use soon" list — items with an expiry within a week, soonest first. */
export function UseSoonList({
  items,
  onEdit,
}: {
  items: PantryItem[]
  onEdit: (id: string) => void
}) {
  const soon = expiringItems(items)
  if (!soon.length) return null
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Use soon</h2>
      <ul className={styles.list}>
        {soon.map(({ item, days, urgency }) => (
          <li key={item.id} className={`${styles.row} ${styles[urgency]}`}>
            <button className={styles.rowBtn} onClick={() => onEdit(item.id)}>
              <span className={styles.dot} aria-hidden />
              <span className={styles.name}>{item.name}</span>
              {item.quantity && <span className={styles.qty}>{item.quantity}</span>}
              <span className={styles.when}>{expiryLabel(days)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
