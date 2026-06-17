import { useNavigate } from 'react-router-dom'
import { usePantry } from '../hooks/usePantry'
import { deleteItem } from '../db'
import { PageHeader } from '../components/PageHeader'
import { CategoryGroup } from '../components/CategoryGroup'
import { EmptyState } from '../components/EmptyState'
import { IconCamera } from '../components/Icons'
import styles from './PantryPage.module.css'

export function PantryPage() {
  const navigate = useNavigate()
  const { groups, items, loading, error, refresh } = usePantry()

  async function handleDelete(id: string) {
    await deleteItem(id)
    await refresh()
  }

  return (
    <>
      <PageHeader
        title="VibePantry"
        subtitle="What's in your kitchen, ready to cook from."
        wordmark
      />

      {loading ? (
        <p className={styles.status}>Loading your pantry…</p>
      ) : error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Snap CTA placeholder — wired in Phase 2. */}
          <button
            className={styles.snap}
            disabled
            title="Coming in the next phase"
          >
            <IconCamera size={18} />
            Snap to add more
            <span className={styles.soon}>soon</span>
          </button>

          <div className={styles.groups}>
            {groups.map((g) => (
              <CategoryGroup
                key={g.category}
                label={g.label}
                items={g.items}
                onEdit={(id) => navigate(`/edit/${id}`)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </>
      )}
    </>
  )
}
