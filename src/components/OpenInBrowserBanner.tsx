import { useState } from 'react'
import { copyLink, detectEnv, openInRealBrowser } from '../lib/platform'
import styles from './OpenInBrowserBanner.module.css'

/**
 * Persistent, app-wide warning when we're inside a chat-app in-app browser
 * (Instagram/Messenger/etc.) — those are memory-tight and flaky, and photo
 * scanning fails in them. Pushes the user into real Chrome/Safari or an
 * installed PWA. Renders nothing in a normal browser or an installed PWA.
 * (Mounted in Layout, so it never shows on the marketing landing page.)
 */
export function OpenInBrowserBanner() {
  const env = detectEnv()
  const [howOpen, setHowOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!env.inAppBrowser) return null

  const where = env.appName ? `${env.appName}'s in-app browser` : 'an in-app browser'
  const realBrowser = env.platform === 'ios' ? 'Safari' : 'Chrome'

  async function onCopy() {
    setCopied(await copyLink())
  }

  return (
    <div className={styles.banner} role="alert">
      <p className={styles.text}>
        <strong>⚠ You're in {where}.</strong> VibePantry's photo scanning won't
        work properly here — open it in {realBrowser}.
      </p>
      <div className={styles.actions}>
        <button className={styles.primary} onClick={() => openInRealBrowser()}>
          Open in {realBrowser}
        </button>
        <button className={styles.secondary} onClick={onCopy}>
          {copied ? 'Link copied ✓' : 'Copy link'}
        </button>
        <button
          className={styles.how}
          aria-expanded={howOpen}
          onClick={() => setHowOpen((o) => !o)}
        >
          {howOpen ? 'Hide' : 'How?'}
        </button>
      </div>
      {howOpen && (
        <ol className={styles.steps}>
          {env.platform === 'ios' ? (
            <>
              <li>
                Tap the <strong>•••</strong> or share button in{' '}
                {env.appName ?? 'this app'}.
              </li>
              <li>
                Choose <strong>Open in Safari</strong>.
              </li>
              <li>
                Then <strong>Share → Add to Home Screen</strong> so it always
                works.
              </li>
            </>
          ) : (
            <>
              <li>
                Tap the <strong>•••</strong> menu in {env.appName ?? 'this app'}.
              </li>
              <li>
                Choose <strong>Open in Chrome</strong> (or your browser).
              </li>
              <li>
                Then <strong>⋮ → Add to Home screen</strong> so it always works.
              </li>
            </>
          )}
        </ol>
      )}
    </div>
  )
}
