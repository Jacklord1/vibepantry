import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { PantryItem } from '../types'
import { getItem, putItem } from '../db'
import { ItemForm } from '../components/ItemForm'
import type { ItemFormValues } from '../components/ItemForm'
import { PageHeader } from '../components/PageHeader'
import { IconCamera } from '../components/Icons'
import styles from './ItemEditorPage.module.css'

/** Handles both /add (new item) and /edit/:id (existing item). */
export function ItemEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [existing, setExisting] = useState<PantryItem | null>(null)
  const [loading, setLoading] = useState(isEdit)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    let active = true
    void (async () => {
      const item = await getItem(id)
      if (!active) return
      if (item) setExisting(item)
      else setNotFound(true)
      setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [id])

  async function handleSubmit(values: ItemFormValues) {
    const item: PantryItem = existing
      ? { ...existing, ...values }
      : {
          id: crypto.randomUUID(),
          ...values,
          addedAt: new Date().toISOString(),
          confirmed: true,
        }
    await putItem(item)
    navigate('/')
  }

  if (loading) {
    return <p className={styles.status}>Loading…</p>
  }

  if (notFound) {
    return (
      <>
        <PageHeader title="Not found" />
        <p className={styles.status}>That item no longer exists.</p>
        <button className={styles.back} onClick={() => navigate('/')}>
          Back to pantry
        </button>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={isEdit ? 'Edit item' : 'Add items'}
        subtitle={
          isEdit
            ? 'Update the details below.'
            : 'Snap a photo to add many at once, or type one in by hand.'
        }
      />

      {!isEdit && (
        <>
          <button className={styles.snap} onClick={() => navigate('/snap')}>
            <IconCamera size={20} />
            Snap photos
          </button>
          <div className={styles.divider}>
            <span>or add manually</span>
          </div>
        </>
      )}

      <ItemForm
        initial={existing ?? undefined}
        submitLabel={isEdit ? 'Save changes' : 'Add to pantry'}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/')}
      />
    </>
  )
}
