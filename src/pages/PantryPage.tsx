import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePantry } from '../hooks/usePantry'
import { deleteItem } from '../db'
import { expiringSoonCount } from '../lib/expiry'
import { PageHeader } from '../components/PageHeader'
import { CategoryGroup } from '../components/CategoryGroup'
import { EmptyState } from '../components/EmptyState'
import { UseSoonBanner, UseSoonList } from '../components/UseSoon'
import { IconCamera, IconCook } from '../components/Icons'
import styles from './PantryPage.module.css'

export function PantryPage() {
  const navigate = useNavigate()
  const { groups, items, loading, error, refresh } = usePantry()
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const soonCount = expiringSoonCount(items)

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
          {soonCount > 0 && !bannerDismissed && (
            <UseSoonBanner
              count={soonCount}
              onDismiss={() => setBannerDismissed(true)}
            />
          )}

          <button className={styles.cook} onClick={() => navigate('/cook')}>
            <IconCook size={20} />
            Cook from my pantry
          </button>
          <button className={styles.snap} onClick={() => navigate('/snap')}>
            <IconCamera size={18} />
            Snap to add more
          </button>

          <UseSoonList
            items={items}
            onEdit={(id) => navigate(`/edit/${id}`)}
          />

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
