import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePantry } from '../hooks/usePantry'
import { useToast } from '../hooks/useToast'
import { deleteItem, putItem } from '../db'
import { expiringSoonCount } from '../lib/expiry'
import { PageHeader } from '../components/PageHeader'
import { CategoryGroup } from '../components/CategoryGroup'
import { EmptyState } from '../components/EmptyState'
import { UseSoonBanner, UseSoonList } from '../components/UseSoon'
import { IconCamera, IconClose, IconCook, IconSearch } from '../components/Icons'
import styles from './PantryPage.module.css'

export function PantryPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { groups, items, loading, error, refresh } = usePantry()
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [query, setQuery] = useState('')
  const soonCount = expiringSoonCount(items)
  const hasItems = !loading && !error && items.length > 0

  // Live filter by name or quantity; drop categories left with no matches.
  const q = query.trim().toLowerCase()
  const filteredGroups = q
    ? groups
        .map((g) => ({
          ...g,
          items: g.items.filter(
            (i) =>
              i.name.toLowerCase().includes(q) ||
              i.quantity.toLowerCase().includes(q),
          ),
        }))
        .filter((g) => g.items.length > 0)
    : groups
  const matchCount = filteredGroups.reduce((n, g) => n + g.items.length, 0)

  async function handleDelete(id: string) {
    const removed = items.find((i) => i.id === id)
    await deleteItem(id)
    await refresh()
    if (removed) {
      toast({
        message: `Removed ${removed.name}`,
        action: {
          label: 'Undo',
          onClick: async () => {
            await putItem(removed)
            await refresh()
          },
        },
      })
    }
  }

  return (
    <>
      <div className={styles.top}>
        <PageHeader
          title={
            <>
              Vibe<span className={styles.brandTail}>Pantry</span>
            </>
          }
          subtitle="What's in your kitchen, ready to cook from."
          wordmark
          wide
        />
        {hasItems && (
          <div className={styles.actions}>
            <button className={styles.cook} onClick={() => navigate('/cook')}>
              <IconCook size={20} />
              Cook from my pantry
            </button>
            <button className={styles.snap} onClick={() => navigate('/snap')}>
              <IconCamera size={18} />
              Snap to add more
            </button>
          </div>
        )}
      </div>

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
          <div className={styles.search}>
            <IconSearch size={18} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your pantry…"
              aria-label="Search your pantry"
            />
            {query && (
              <button
                className={styles.searchClear}
                onClick={() => setQuery('')}
                aria-label="Clear search"
              >
                <IconClose size={16} />
              </button>
            )}
          </div>

          {!q && soonCount > 0 && !bannerDismissed && (
            <UseSoonBanner
              count={soonCount}
              onDismiss={() => setBannerDismissed(true)}
            />
          )}

          {!q && (
            <UseSoonList items={items} onEdit={(id) => navigate(`/edit/${id}`)} />
          )}

          {matchCount === 0 ? (
            <p className={styles.noMatch}>No items match “{query.trim()}”.</p>
          ) : (
            <div className={styles.groups}>
              {filteredGroups.map((g) => (
                <CategoryGroup
                  key={g.category}
                  label={g.label}
                  items={g.items}
                  onEdit={(id) => navigate(`/edit/${id}`)}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      )}
    </>
  )
}
