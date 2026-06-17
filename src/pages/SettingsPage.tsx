import { useEffect, useRef, useState } from 'react'
import {
  deleteSetting,
  exportPantry,
  getSetting,
  importPantry,
  setSetting,
} from '../db'
import { PageHeader } from '../components/PageHeader'
import { IconDownload, IconUpload } from '../components/Icons'
import styles from './SettingsPage.module.css'

const API_KEY = 'apiKey'

type Notice = { kind: 'ok' | 'error'; text: string } | null

function mask(key: string): string {
  const last4 = key.slice(-4)
  return `${'•'.repeat(8)}${last4}`
}

export function SettingsPage() {
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [keyNotice, setKeyNotice] = useState<Notice>(null)
  const [dataNotice, setDataNotice] = useState<Notice>(null)
  const [loaded, setLoaded] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void (async () => {
      const key = await getSetting(API_KEY)
      setSavedKey(key ?? null)
      setEditing(!key) // open the input when nothing is set yet
      setLoaded(true)
    })()
  }, [])

  async function saveKey() {
    const trimmed = keyInput.trim()
    if (!trimmed) {
      setKeyNotice({ kind: 'error', text: 'Paste a key first.' })
      return
    }
    await setSetting(API_KEY, trimmed)
    setSavedKey(trimmed)
    setKeyInput('')
    setEditing(false)
    setKeyNotice({ kind: 'ok', text: 'Key saved to this browser.' })
  }

  async function clearKey() {
    await deleteSetting(API_KEY)
    setSavedKey(null)
    setKeyInput('')
    setEditing(true)
    setKeyNotice({ kind: 'ok', text: 'Key removed.' })
  }

  async function handleExport() {
    setDataNotice(null)
    try {
      const json = await exportPantry()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vibepantry-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setDataNotice({ kind: 'ok', text: 'Pantry exported.' })
    } catch {
      setDataNotice({ kind: 'error', text: 'Could not export your pantry.' })
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-importing the same file
    if (!file) return
    setDataNotice(null)
    try {
      const text = await file.text()
      const { imported, skipped } = await importPantry(text)
      setDataNotice({
        kind: 'ok',
        text: `Imported ${imported} item${imported === 1 ? '' : 's'}${
          skipped ? ` (skipped ${skipped} invalid)` : ''
        }.`,
      })
    } catch (err) {
      setDataNotice({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Import failed.',
      })
    }
  }

  return (
    <>
      <PageHeader title="Settings" />

      {/* ---- API key ---- */}
      <section className={styles.section}>
        <h2 className={styles.h2}>Anthropic API key</h2>
        <p className={styles.note}>
          Your key stays in this browser (IndexedDB) and is only ever sent to{' '}
          <code>api.anthropic.com</code>. It's never uploaded anywhere else and
          never committed to the repo.
        </p>

        {loaded && savedKey && !editing ? (
          <div className={styles.keyRow}>
            <code className={styles.masked}>{mask(savedKey)}</code>
            <div className={styles.keyActions}>
              <button
                className={styles.secondary}
                onClick={() => {
                  setEditing(true)
                  setKeyNotice(null)
                }}
              >
                Change
              </button>
              <button className={styles.danger} onClick={clearKey}>
                Clear
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.keyEdit}>
            <input
              className={styles.input}
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="sk-ant-…"
              autoComplete="off"
              spellCheck={false}
            />
            <div className={styles.keyActions}>
              {savedKey && (
                <button
                  className={styles.secondary}
                  onClick={() => {
                    setEditing(false)
                    setKeyInput('')
                    setKeyNotice(null)
                  }}
                >
                  Cancel
                </button>
              )}
              <button className={styles.primary} onClick={saveKey}>
                Save key
              </button>
            </div>
          </div>
        )}

        {keyNotice && (
          <p
            className={keyNotice.kind === 'ok' ? styles.ok : styles.err}
            role="status"
          >
            {keyNotice.text}
          </p>
        )}
      </section>

      {/* ---- Backup ---- */}
      <section className={styles.section}>
        <h2 className={styles.h2}>Backup &amp; restore</h2>
        <p className={styles.note}>
          Your pantry lives only on this device. Export a JSON backup, or import
          one to move it to another browser. Importing replaces your current
          pantry.
        </p>
        <div className={styles.dataActions}>
          <button className={styles.secondary} onClick={handleExport}>
            <IconDownload size={18} />
            Export JSON
          </button>
          <button
            className={styles.secondary}
            onClick={() => fileRef.current?.click()}
          >
            <IconUpload size={18} />
            Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            hidden
          />
        </div>
        {dataNotice && (
          <p
            className={dataNotice.kind === 'ok' ? styles.ok : styles.err}
            role="status"
          >
            {dataNotice.text}
          </p>
        )}
      </section>
    </>
  )
}
