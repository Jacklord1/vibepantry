import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Drives the scroll-snap deck from a single IntersectionObserver over every
 * panel element.
 *
 * - `active` — index of the panel currently filling the viewport (≥50%). Feeds
 *   the progress dots.
 * - `seen` — sticky set of panels that have entered view at least once. Feeds the
 *   entrance reveals: reveal once, then stay revealed (scrolling back doesn't
 *   replay). Panel 0 (hero) starts revealed so it paints immediately on load.
 *
 * Register each panel with `registerRef(i)`; jump to one with `scrollTo(i)`.
 */
export function useActivePanel(count: number) {
  const refs = useRef<(HTMLElement | null)[]>([])
  const [active, setActive] = useState(0)
  const [seen, setSeen] = useState<Set<number>>(() => new Set([0]))

  const registerRef = useCallback(
    (i: number) => (el: HTMLElement | null) => {
      refs.current[i] = el
    },
    [],
  )

  const scrollTo = useCallback((i: number) => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    refs.current[i]?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' })
  }, [])

  useEffect(() => {
    const els = refs.current
      .slice(0, count)
      .filter((el): el is HTMLElement => el != null)
    if (els.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const i = refs.current.indexOf(entry.target as HTMLElement)
          if (i === -1) continue
          setActive(i)
          setSeen((prev) => (prev.has(i) ? prev : new Set(prev).add(i)))
        }
      },
      { threshold: 0.5 },
    )

    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [count])

  return { active, seen, registerRef, scrollTo }
}
