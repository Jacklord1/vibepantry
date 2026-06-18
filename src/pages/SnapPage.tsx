import { useEffect, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { PantryItem } from '../types'
import { putItem } from '../db'
import { hasApiAccess, MissingApiKeyError } from '../lib/anthropic'
import { extractItemsFromPhoto } from '../lib/vision'
import { readImageSize } from '../lib/image'
import { copyLink, detectEnv, openInRealBrowser } from '../lib/platform'
import { uuid } from '../lib/id'
import { useToast } from '../hooks/useToast'
import { PageHeader } from '../components/PageHeader'
import { ReviewGrid } from '../components/ReviewGrid'
import type { RowPatch } from '../components/ReviewGrid'
import { IconCamera, IconCheck, IconClose, IconUpload } from '../components/Icons'
import styles from './SnapPage.module.css'

// Decode/read at most this many photos at once. Each decode is the memory
// spike, so a small cap keeps a big multi-select batch from OOM-ing the tab.
const READ_CONCURRENCY = 2

// Session flag: the user dismissed the in-app-browser wall ("continue anyway").
const FORCE_KEY = 'vp_snap_force'

type PhotoStatus = 'queued' | 'reading' | 'done' | 'error'
type Photo = {
  id: string
  /** Dropped after a successful read to release the original blob. */
  file?: File
  thumbUrl: string
  status: PhotoStatus
  error?: string
  count?: number
  sizeBytes: number
  dims?: { w: number; h: number }
}

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong reading that photo.'
}

function fmtSize(bytes: number): string {
  return bytes >= 1e6
    ? `${(bytes / 1e6).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1e3))} KB`
}

/** Run `worker` over `items` with at most `limit` in flight at once. */
async function runPool<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let i = 0
  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (i < items.length) await worker(items[i++])
    },
  )
  await Promise.all(runners)
}

/** Combine case-insensitive same-name rows, joining their quantities. */
function mergeItems(items: PantryItem[]): PantryItem[] {
  const order: string[] = []
  const groups = new Map<string, PantryItem[]>()
  for (const item of items) {
    const key = item.name.trim().toLowerCase()
    if (!groups.has(key)) {
      groups.set(key, [])
      order.push(key)
    }
    groups.get(key)!.push(item)
  }
  return order.map((key) => {
    const group = groups.get(key)!
    const first = group[0]
    if (group.length === 1) return first
    const quantities = [
      ...new Set(group.map((g) => g.quantity.trim()).filter(Boolean)),
    ]
    const withMacros = group.find(
      (g) => g.macros && Object.keys(g.macros).length > 0,
    )
    return {
      ...first,
      quantity: quantities.join(' + '),
      macros: withMacros?.macros ?? first.macros ?? null,
    }
  })
}

export function SnapPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [gated, setGated] = useState<boolean | null>(null) // null = checking
  const [photos, setPhotos] = useState<Photo[]>([])
  const [reviewItems, setReviewItems] = useState<PantryItem[]>([])
  const [reading, setReading] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [accepting, setAccepting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [copied, setCopied] = useState(false)

  // In-app-browser wall: photo decode OOMs in chat-app webviews. Block capture
  // and push the user into a real browser, with a "continue anyway" escape so a
  // mis-detected real browser is never locked out.
  const env = detectEnv()
  const [forced, setForced] = useState(
    () =>
      typeof sessionStorage !== 'undefined' &&
      sessionStorage.getItem(FORCE_KEY) === '1',
  )

  const cameraRef = useRef<HTMLInputElement>(null)
  const pickerRef = useRef<HTMLInputElement>(null)
  const urlsRef = useRef<string[]>([])

  useEffect(() => {
    void (async () => {
      setGated(!(await hasApiAccess()))
    })()
  }, [])

  // Revoke all object URLs on unmount. Capture the (stable) array reference so
  // the cleanup revokes whatever URLs have accumulated by unmount time.
  useEffect(() => {
    const urls = urlsRef.current
    return () => {
      for (const url of urls) URL.revokeObjectURL(url)
    }
  }, [])

  function addFiles(list: FileList | null) {
    if (!list) return
    const next: Photo[] = []
    for (const file of Array.from(list)) {
      if (!file.type.startsWith('image/')) continue
      const thumbUrl = URL.createObjectURL(file)
      urlsRef.current.push(thumbUrl)
      const id = uuid()
      next.push({ id, file, thumbUrl, status: 'queued', sizeBytes: file.size })
      // Cheap header read so the tile can show "12 MP · 4.2 MB" BEFORE the read
      // — visible even if a later decode crashes the tab (remote reporting).
      void readImageSize(file).then((d) => {
        if (d) patchPhoto(id, { dims: { w: d.width, h: d.height } })
      })
    }
    if (next.length) setPhotos((ps) => [...ps, ...next])
  }

  function removePhoto(id: string) {
    setPhotos((ps) => {
      const target = ps.find((p) => p.id === id)
      if (target) URL.revokeObjectURL(target.thumbUrl)
      return ps.filter((p) => p.id !== id)
    })
  }

  function patchPhoto(id: string, patch: Partial<Photo>) {
    setPhotos((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  async function readPhotos() {
    if (reading) return
    if (!(await hasApiAccess())) {
      setGated(true)
      return
    }
    const queued = photos.filter((p) => p.status === 'queued')
    if (!queued.length) return

    setReading(true)
    setProgress({ done: 0, total: queued.length })
    setPhotos((ps) =>
      ps.map((p) => (p.status === 'queued' ? { ...p, status: 'reading' } : p)),
    )

    // Bounded concurrency — at most READ_CONCURRENCY decodes in flight so a big
    // batch can't pile full-resolution bitmaps into memory all at once.
    await runPool(queued, READ_CONCURRENCY, async (p) => {
      if (!p.file) return
      try {
        const items = await extractItemsFromPhoto(p.file, p.id)
        setReviewItems((prev) => [...prev, ...items])
        // Read succeeded — drop the original File (frees the blob once its
        // thumbnail is gone). Kept on error so the photo can be retried.
        patchPhoto(p.id, {
          status: 'done',
          count: items.length,
          file: undefined,
          error: undefined,
        })
      } catch (e) {
        if (e instanceof MissingApiKeyError) {
          setGated(true)
          patchPhoto(p.id, { status: 'queued' })
        } else {
          patchPhoto(p.id, { status: 'error', error: errMessage(e) })
        }
      } finally {
        setProgress((pr) => ({ ...pr, done: pr.done + 1 }))
      }
    })
    setReading(false)
  }

  async function accept() {
    if (!reviewItems.length) return
    setAccepting(true)
    try {
      const count = reviewItems.length
      for (const item of reviewItems) {
        await putItem({ ...item, name: item.name.trim(), confirmed: true })
      }
      toast({
        message: `Added ${count} item${count === 1 ? '' : 's'} to your pantry`,
      })
      navigate('/')
    } finally {
      setAccepting(false)
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    addFiles(e.dataTransfer.files)
  }

  function continueAnyway() {
    try {
      sessionStorage.setItem(FORCE_KEY, '1')
    } catch {
      // sessionStorage unavailable — still let them through this session.
    }
    setForced(true)
  }

  async function onCopyLink() {
    setCopied(await copyLink())
  }

  if (gated === null) {
    return <p className={styles.status}>Loading…</p>
  }

  // In-app-browser wall takes precedence — fix the browser before anything else.
  if (env.inAppBrowser && !forced) {
    const realBrowser = env.platform === 'ios' ? 'Safari' : 'Chrome'
    return (
      <>
        <PageHeader title="Snap your pantry" />
        <div className={styles.wall}>
          <div className={styles.wallIcon} aria-hidden>
            🚫
          </div>
          <h2 className={styles.wallTitle}>Photo scanning needs a real browser</h2>
          <p className={styles.wallCopy}>
            You're in {env.appName ? `${env.appName}'s` : 'an in-app'} browser,
            which runs out of memory on photos. Open VibePantry in {realBrowser} —
            or add it to your home screen — and scanning will work properly.
          </p>
          <ol className={styles.wallSteps}>
            {env.platform === 'ios' ? (
              <>
                <li>
                  Tap <strong>•••</strong> or the share button, then{' '}
                  <strong>Open in Safari</strong>.
                </li>
                <li>
                  Or <strong>Share → Add to Home Screen</strong>.
                </li>
              </>
            ) : (
              <>
                <li>
                  Tap the <strong>•••</strong> menu, then{' '}
                  <strong>Open in Chrome</strong>.
                </li>
                <li>
                  Or <strong>⋮ → Add to Home screen</strong>.
                </li>
              </>
            )}
          </ol>
          <div className={styles.wallActions}>
            <button className={styles.primary} onClick={() => openInRealBrowser()}>
              Open in {realBrowser}
            </button>
            <button className={styles.secondary} onClick={onCopyLink}>
              {copied ? 'Link copied ✓' : 'Copy link'}
            </button>
          </div>
          <button className={styles.wallContinue} onClick={continueAnyway}>
            continue anyway (risky)
          </button>
        </div>
      </>
    )
  }

  if (gated) {
    return (
      <>
        <PageHeader title="Snap your pantry" />
        <div className={styles.gate}>
          <p className={styles.gateCopy}>
            Snapping needs your Anthropic API key. Add it in Settings — it stays
            in your browser and is only ever sent to api.anthropic.com.
          </p>
          <button className={styles.primary} onClick={() => navigate('/settings')}>
            Go to Settings
          </button>
        </div>
      </>
    )
  }

  const queuedCount = photos.filter((p) => p.status === 'queued').length
  const doneCount = photos.filter((p) => p.status === 'done').length
  const noItemsFound =
    !reading && doneCount > 0 && reviewItems.length === 0 && queuedCount === 0
  const debug =
    typeof location !== 'undefined' &&
    new URLSearchParams(location.search).get('debug') === '1'

  return (
    <>
      <PageHeader
        title="Snap your pantry"
        subtitle="Photograph your shelves and fridge — one shot can hold many items."
      />

      <div
        className={`${styles.zone} ${dragOver ? styles.zoneOver : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <div className={styles.captureRow}>
          <button
            className={styles.primary}
            onClick={() => cameraRef.current?.click()}
          >
            <IconCamera size={20} />
            Take photo
          </button>
          <button
            className={styles.secondary}
            onClick={() => pickerRef.current?.click()}
          >
            <IconUpload size={18} />
            Choose photos
          </button>
        </div>
        <p className={styles.hint}>or drop images here</p>

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <input
          ref={pickerRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {photos.length > 0 && (
        <ul className={styles.thumbs}>
          {photos.map((p) => {
            const mp = p.dims ? (p.dims.w * p.dims.h) / 1e6 : null
            return (
              <li key={p.id} className={styles.tile}>
                <img className={styles.thumb} src={p.thumbUrl} alt="" />
                <p className={styles.tileMeta}>
                  {mp != null && (
                    <span className={mp > 24 ? styles.big : undefined}>
                      {mp.toFixed(mp >= 10 ? 0 : 1)} MP ·{' '}
                    </span>
                  )}
                  {fmtSize(p.sizeBytes)}
                  {debug && p.dims && ` · ${p.dims.w}×${p.dims.h}`}
                </p>
                <div className={`${styles.badge} ${styles[p.status]}`}>
                  {p.status === 'reading' && <span className={styles.spinner} />}
                  {p.status === 'done' && (
                    <>
                      <IconCheck size={13} />
                      {p.count}
                    </>
                  )}
                  {p.status === 'queued' && 'queued'}
                  {p.status === 'error' && '!'}
                </div>
                {!reading && (
                  <button
                    className={styles.remove}
                    onClick={() => removePhoto(p.id)}
                    aria-label="Remove photo"
                  >
                    <IconClose size={14} />
                  </button>
                )}
                {p.status === 'error' && (
                  <p className={styles.tileError}>{p.error}</p>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {queuedCount > 0 && (
        <button
          className={styles.read}
          onClick={readPhotos}
          disabled={reading}
        >
          {reading
            ? `Reading photo ${progress.done + 1} of ${progress.total}…`
            : `Read ${queuedCount} photo${queuedCount === 1 ? '' : 's'}`}
        </button>
      )}

      {noItemsFound && (
        <p className={styles.status}>
          No items found in those photos. Try a clearer, closer shot.
        </p>
      )}

      {reviewItems.length > 0 && (
        <ReviewGrid
          items={reviewItems}
          onUpdate={(id, patch: RowPatch) =>
            setReviewItems((items) =>
              items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
            )
          }
          onDelete={(id) =>
            setReviewItems((items) => items.filter((i) => i.id !== id))
          }
          onMergeDuplicates={() => setReviewItems((items) => mergeItems(items))}
          onAccept={accept}
          accepting={accepting}
        />
      )}
    </>
  )
}
