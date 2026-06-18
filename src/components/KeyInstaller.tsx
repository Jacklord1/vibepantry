import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { launchHash } from '../lib/launchHash'
import { decodeKey, isPlausibleKey, isStale, parseLaunchHash } from '../lib/magicLink'
import { getSetting, setSetting } from '../db'
import { API_KEY_SETTING } from '../lib/anthropic'
import styles from './KeyInstaller.module.css'

/**
 * Magic-link key installer (receiving end). On first load, if the launch hash
 * carried `#k=<base64>&t=<unix>`, decode the key in memory, sanity-check it, run
 * the 24h staleness speed bump, then save it via the SAME IndexedDB write path
 * Settings uses (`setSetting(API_KEY_SETTING, …)`). The hash is already stripped
 * from the URL in main.tsx (before any render) so the key never surfaces in the
 * address bar or history.
 *
 * Security note: the base64 in the link is obfuscation, not encryption (see
 * lib/magicLink.ts). This component NEVER logs the key, the hash, the encoded
 * value, or the decoded value, and shows only generic messages on failure.
 */

type Phase =
  | 'idle' // no setup key in the link — render nothing, app proceeds normally
  | 'incomplete' // k present but undecodable / implausible
  | 'expired' // valid key but the link is older than 24h
  | 'checking' // valid + fresh — looking up any existing key
  | 'overwrite' // a key already exists — ask before replacing
  | 'installing' // writing the key
  | 'success'
  | 'error'

// Decide the starting phase ONCE, at module load, from the captured launch hash.
// Pure and in-memory; runs a single time regardless of StrictMode's double render.
const INITIAL: { phase: Phase; key: string | null } = (() => {
  const { k, t } = parseLaunchHash(launchHash)
  if (k === null) return { phase: 'idle', key: null }
  const decoded = decodeKey(k)
  if (decoded === null || !isPlausibleKey(decoded)) {
    return { phase: 'incomplete', key: null }
  }
  if (isStale(t)) return { phase: 'expired', key: null }
  return { phase: 'checking', key: decoded }
})()

export function KeyInstaller() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>(INITIAL.phase)
  // Decoded key held in a ref — in memory only, never in rendered/loggable state.
  const decodedRef = useRef<string | null>(INITIAL.key)
  // Single-shot guard so StrictMode's double-invoke can't double-write or flip a
  // fresh install into a spurious overwrite prompt.
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    if (INITIAL.phase !== 'checking') return
    void (async () => {
      try {
        const existing = await getSetting(API_KEY_SETTING)
        if (existing) {
          setPhase('overwrite')
          return
        }
        await setSetting(API_KEY_SETTING, decodedRef.current as string)
        setPhase('success')
      } catch {
        // Generic only — never surface the key/hash in an error.
        setPhase('error')
      }
    })()
  }, [])

  if (phase === 'idle') return null

  function dismiss() {
    setPhase('idle')
    navigate('/')
  }

  function goSnap() {
    setPhase('idle')
    navigate('/snap')
  }

  async function confirmOverwrite() {
    setPhase('installing')
    try {
      await setSetting(API_KEY_SETTING, decodedRef.current as string)
      setPhase('success')
    } catch {
      setPhase('error')
    }
  }

  function panelClass() {
    if (phase === 'success') return `${styles.panel} ${styles.success}`
    if (phase === 'error') return `${styles.panel} ${styles.error}`
    return styles.panel
  }

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Set up your API key"
    >
      <div className={panelClass()}>
        {phase === 'incomplete' && (
          <>
            <p className={styles.body}>
              That setup link looks incomplete — ask for a fresh one.
            </p>
            <div className={styles.actions}>
              <button className={styles.secondary} onClick={dismiss} autoFocus>
                Open the app
              </button>
            </div>
          </>
        )}

        {phase === 'expired' && (
          <>
            <p className={styles.body}>
              This setup link has expired — ask for a fresh one.
            </p>
            <div className={styles.actions}>
              <button className={styles.secondary} onClick={dismiss} autoFocus>
                Open the app
              </button>
            </div>
          </>
        )}

        {(phase === 'checking' || phase === 'installing') && (
          <p className={styles.body}>Setting up your key…</p>
        )}

        {phase === 'overwrite' && (
          <>
            <h1 className={styles.title}>Replace the existing key on this device?</h1>
            <p className={styles.body}>
              A key is already saved here. Replacing it swaps in the one from this link.
            </p>
            <div className={styles.actions}>
              <button className={styles.primary} onClick={confirmOverwrite} autoFocus>
                Replace
              </button>
              <button className={styles.secondary} onClick={() => setPhase('idle')}>
                Cancel
              </button>
            </div>
          </>
        )}

        {phase === 'success' && (
          <>
            <h1 className={styles.title}>All set</h1>
            <p className={styles.body}>
              You're all set — your key's saved on this device. Snap your pantry to
              begin.
            </p>
            <div className={styles.actions}>
              <button className={styles.primary} onClick={goSnap} autoFocus>
                Snap your pantry
              </button>
            </div>
          </>
        )}

        {phase === 'error' && (
          <>
            <h1 className={styles.title}>Something went wrong</h1>
            <p className={styles.body}>
              Something went wrong saving your key. Try the link again.
            </p>
            <div className={styles.actions}>
              <button className={styles.secondary} onClick={dismiss} autoFocus>
                Open the app
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
