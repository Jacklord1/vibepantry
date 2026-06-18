import type { CSSProperties } from 'react'

/**
 * Stagger index for entrance reveals. Sets the `--reveal-i` custom property the
 * `[data-reveal]` rules in LandingDeck.module.css read for `transition-delay`.
 * Drives the cascade order of elements within a panel.
 */
export const ri = (i: number): CSSProperties => ({ '--reveal-i': i }) as CSSProperties
