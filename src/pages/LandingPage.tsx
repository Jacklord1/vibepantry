import styles from './LandingPage.module.css'

/**
 * STUB landing page (served at `/`). Phase 4.5 ships a clean, themed holding
 * page that names the app, says what it does, makes the privacy promise, and
 * sends people into the app at `/app`. Real onboarding + marketing copy land
 * in Phase 5 — keep this honest and minimal until then.
 */
export function LandingPage() {
  return (
    <main className={styles.wrap}>
      <div className={styles.hero}>
        <h1 className={styles.wordmark}>
          Vibe<span className={styles.accent}>Pantry</span>
        </h1>

        <p className={styles.tagline}>
          Snap your kitchen. Cook from what you've actually got.
        </p>

        <p className={styles.privacy}>
          Bring your own key. Your key and your data stay in your browser —
          nothing is uploaded.
        </p>

        <a className={styles.cta} href="/app">
          Launch app <span aria-hidden="true">→</span>
        </a>

        <p className={styles.footer}>static · bring-your-own-key · MIT</p>
      </div>
    </main>
  )
}
