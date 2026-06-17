import { useNavigate } from 'react-router-dom'
import { IconAdd, IconCamera } from './Icons'
import styles from './EmptyState.module.css'

/** Pantry empty state — an invitation, not a dead end. */
export function EmptyState() {
  const navigate = useNavigate()
  return (
    <div className={styles.wrap}>
      <div className={styles.art} aria-hidden>
        <IconCamera size={40} />
      </div>
      <h2 className={styles.title}>No items yet</h2>
      <p className={styles.copy}>Snap your pantry to begin.</p>

      {/* Snap CTA is wired in Phase 2 — placeholder for now. */}
      <button className={styles.snap} disabled title="Coming in the next phase">
        <IconCamera size={18} />
        Snap pantry
        <span className={styles.soon}>soon</span>
      </button>

      <button className={styles.manual} onClick={() => navigate('/add')}>
        <IconAdd size={18} />
        Add an item manually
      </button>
    </div>
  )
}
