import type { ReactNode } from 'react'
import styles from './PhoneMock.module.css'

/**
 * Schematic phone frame for the landing deck — a styled bezel plus a screen
 * slot. Presentational only and deliberately NOT a port of the real app shell,
 * so the landing never needs re-syncing when /app changes. The inner schematic
 * is decorative (`role="img"` + a single label); the explanatory copy lives in
 * the panel beside it.
 */
export function PhoneMock({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  return (
    <div className={styles.frame} role="img" aria-label={label}>
      <span className={styles.notch} aria-hidden="true" />
      <div className={styles.screen}>{children}</div>
    </div>
  )
}
