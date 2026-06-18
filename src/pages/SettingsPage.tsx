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
import {
  getUsageLog,
  estimateUsd,
  resetUsage,
  type UsageBucket,
} from '../lib/usage'
import {
  DEFAULT_RECIPE_MODEL,
  RECIPE_MODEL_SETTING,
  RECIPE_MODELS,
} from '../lib/anthropic'
import {
  DIETARY_OPTIONS,
  DIETARY_SETTING,
  parseDietary,
  serialiseDietary,
  type Dietary,
} from '../lib/cookPrefs'
import styles from './SettingsPage.module.css'

const API_KEY = 'apiKey'
const API_ENDPOINT = 'apiEndpoint'

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
  const [savedEndpoint, setSavedEndpoint] = useState<string | null>(null)
  const [endpointInput, setEndpointInput] = useState('')
  const [endpointNotice, setEndpointNotice] = useState<Notice>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [usageBuckets, setUsageBuckets] = useState<UsageBucket[]>([])
  const [usageNotice, setUsageNotice] = useState<Notice>(null)
  const [recipeModel, setRecipeModel] = useState<string>(DEFAULT_RECIPE_MODEL)
  const [dietary, setDietary] = useState<Dietary[]>([])

  useEffect(() => {
    void (async () => {
      const [key, endpoint, usageLog, savedRecipeModel, savedDietary] =
        await Promise.all([
          getSetting(API_KEY),
          getSetting(API_ENDPOINT),
          getUsageLog(),
          getSetting(RECIPE_MODEL_SETTING),
          getSetting(DIETARY_SETTING),
        ])
      setSavedKey(key ?? null)
      setEditing(!key) // open the input when nothing is set yet
      setSavedEndpoint(endpoint ?? null)
      setEndpointInput(endpoint ?? '')
      setUsageBuckets(Object.values(usageLog.buckets))
      setRecipeModel(savedRecipeModel || DEFAULT_RECIPE_MODEL)
      setDietary(parseDietary(savedDietary))
      setLoaded(true)
    })()
  }, [])

  async function saveEndpoint() {
    const trimmed = endpointInput.trim()
    if (trimmed && !/^https?:\/\//i.test(trimmed)) {
      setEndpointNotice({ kind: 'error', text: 'Enter a full https:// URL.' })
      return
    }
    if (!trimmed) {
      await deleteSetting(API_ENDPOINT)
      setSavedEndpoint(null)
      setEndpointNotice({ kind: 'ok', text: 'Endpoint cleared — calling Anthropic directly.' })
      return
    }
    await setSetting(API_ENDPOINT, trimmed)
    setSavedEndpoint(trimmed)
    setEndpointNotice({ kind: 'ok', text: 'Endpoint saved — calls go through your proxy.' })
  }

  async function clearEndpoint() {
    await deleteSetting(API_ENDPOINT)
    setSavedEndpoint(null)
    setEndpointInput('')
    setEndpointNotice({
      kind: 'ok',
      text: 'Endpoint cleared — calling Anthropic directly.',
    })
  }

  async function resetUsageLog() {
    await resetUsage()
    setUsageBuckets([])
    setUsageNotice({ kind: 'ok', text: 'Usage history cleared.' })
  }

  async function chooseRecipeModel(id: string) {
    await setSetting(RECIPE_MODEL_SETTING, id)
    setRecipeModel(id)
  }

  // Dietary is a standing default — persist on every tap (clear the setting
  // when nothing's selected so it doesn't linger as an empty string).
  async function toggleDietary(value: Dietary) {
    const next = dietary.includes(value)
      ? dietary.filter((d) => d !== value)
      : [...dietary, value]
    setDietary(next)
    if (next.length) await setSetting(DIETARY_SETTING, serialiseDietary(next))
    else await deleteSetting(DIETARY_SETTING)
  }

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

  const sortedBuckets = [...usageBuckets].sort(
    (a, b) => a.kind.localeCompare(b.kind) || a.model.localeCompare(b.model),
  )
  const totalCalls = usageBuckets.reduce((n, b) => n + b.calls, 0)
  const totalTokens = usageBuckets.reduce(
    (n, b) => n + b.inputTokens + b.outputTokens,
    0,
  )
  const totalUsd = usageBuckets.reduce((n, b) => n + estimateUsd(b), 0)

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

      {/* ---- Recipe model ---- */}
      <section className={styles.section}>
        <h2 className={styles.h2}>Recipe model</h2>
        <p className={styles.note}>
          Which model writes your recipes. Haiku is ~3× cheaper; Sonnet is a
          little sharper. Photo scanning always uses Sonnet — quality matters
          most there.
        </p>
        <div className={styles.keyActions}>
          {RECIPE_MODELS.map((m) => (
            <button
              key={m.id}
              className={
                recipeModel === m.id ? styles.primary : styles.secondary
              }
              onClick={() => chooseRecipeModel(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </section>

      {/* ---- Dietary ---- */}
      <section className={styles.section}>
        <h2 className={styles.h2}>Dietary</h2>
        <p className={styles.note}>
          A standing preference applied to every cook. You can still override it
          per-cook on the Cook page. Leave all off for no restriction.
        </p>
        <div className={styles.chips}>
          {DIETARY_OPTIONS.map((d) => {
            const on = dietary.includes(d.value)
            return (
              <button
                key={d.value}
                className={`${styles.chip} ${on ? styles.chipOn : ''}`}
                aria-pressed={on}
                onClick={() => toggleDietary(d.value)}
              >
                {d.label}
              </button>
            )
          })}
        </div>
      </section>

      {/* ---- API usage ---- */}
      <section className={styles.section}>
        <h2 className={styles.h2}>API usage</h2>
        <p className={styles.note}>
          Counted on this device only — usage never leaves your browser.
          Estimates use Anthropic list pricing (USD); your actual bill depends
          on your plan.
        </p>

        {!loaded ? null : sortedBuckets.length === 0 ? (
          <p className={styles.note}>No calls recorded yet.</p>
        ) : (
          <>
            {sortedBuckets.map((b) => (
              <div className={styles.usageRow} key={`${b.kind}:${b.model}`}>
                <span className={styles.usageLabel}>
                  {b.kind} · {b.model}
                </span>
                <code className={styles.masked}>
                  {b.calls.toLocaleString()} calls ·{' '}
                  {(b.inputTokens + b.outputTokens).toLocaleString()} tok · ~$
                  {estimateUsd(b).toFixed(2)}
                </code>
              </div>
            ))}

            <div className={styles.usageTotal}>
              <span>Total</span>
              <span>
                {totalCalls.toLocaleString()} calls ·{' '}
                {totalTokens.toLocaleString()} tok · ~${totalUsd.toFixed(2)}
              </span>
            </div>

            <div className={styles.keyActions}>
              <button className={styles.danger} onClick={resetUsageLog}>
                Reset
              </button>
            </div>
          </>
        )}

        {usageNotice && (
          <p
            className={usageNotice.kind === 'ok' ? styles.ok : styles.err}
            role="status"
          >
            {usageNotice.text}
          </p>
        )}
      </section>

      {/* ---- Advanced: optional proxy endpoint ---- */}
      <details className={styles.section}>
        <summary className={styles.summary}>
          Advanced — custom API endpoint{savedEndpoint ? ' (active)' : ''}
        </summary>
        <p className={styles.note}>
          Running the optional <code>proxy/</code> Cloudflare Worker to keep your
          key server-side? Paste its URL here — the app POSTs there instead of{' '}
          <code>api.anthropic.com</code>, and you can leave the API key blank.
          Leave this empty to call Anthropic directly (the default).
        </p>
        <input
          className={styles.input}
          type="url"
          inputMode="url"
          value={endpointInput}
          onChange={(e) => setEndpointInput(e.target.value)}
          placeholder="https://your-worker.workers.dev"
          autoComplete="off"
          spellCheck={false}
        />
        <div className={styles.keyActions}>
          {savedEndpoint && (
            <button className={styles.danger} onClick={clearEndpoint}>
              Clear
            </button>
          )}
          <button className={styles.primary} onClick={saveEndpoint}>
            Save endpoint
          </button>
        </div>
        {endpointNotice && (
          <p
            className={endpointNotice.kind === 'ok' ? styles.ok : styles.err}
            role="status"
          >
            {endpointNotice.text}
          </p>
        )}
      </details>
    </>
  )
}
