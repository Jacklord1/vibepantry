import type { ReactNode } from 'react'
import styles from './PhoneMock.module.css'

export type NavKey = 'pantry' | 'cook' | 'add' | 'settings'

const NAV: { key: NavKey; label: string }[] = [
  { key: 'pantry', label: 'Pantry' },
  { key: 'cook', label: 'Cook' },
  { key: 'add', label: 'Add' },
  { key: 'settings', label: 'Settings' },
]

/**
 * Schematic phone frame for the landing deck — a styled bezel with a status bar,
 * a screen slot, and the app's bottom nav, so each mock reads as a full, real
 * screen rather than a floating fragment. Presentational only and deliberately
 * NOT a port of the real app shell, so the landing never needs re-syncing when
 * /app changes. The inner schematic is decorative (`role="img"` + a single
 * label); the explanatory copy lives in the panel beside it.
 */
export function PhoneMock({
  children,
  label,
  nav,
}: {
  children: ReactNode
  label: string
  nav?: NavKey
}) {
  return (
    <div className={styles.frame} role="img" aria-label={label}>
      <span className={styles.notch} aria-hidden="true" />
      <div className={styles.screen}>
        <div className={styles.statusbar} aria-hidden="true">
          <span className={styles.clock}>9:41</span>
          <span className={styles.statusIcons}>
            <span className={styles.signal} />
            <span className={styles.wifi} />
            <span className={styles.battery} />
          </span>
        </div>
        <div className={styles.content}>{children}</div>
        <div className={styles.nav} aria-hidden="true">
          {NAV.map((n) => (
            <span
              key={n.key}
              className={`${styles.navItem} ${nav === n.key ? styles.navOn : ''}`}
            >
              {n.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
