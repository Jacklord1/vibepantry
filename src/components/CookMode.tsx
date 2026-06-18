import { useEffect, useRef, useState } from 'react'
import type { Recipe } from '../types'
import { IconChevronLeft, IconClose } from './Icons'
import styles from './CookMode.module.css'

type Props = {
  recipe: Recipe
  onClose: () => void
}

/**
 * Full-screen, one-step-at-a-time cooking view. Big type, thumb-reachable Next,
 * progress dots, swipe + arrow-key nav, and a screen Wake Lock so the phone
 * doesn't sleep mid-cook. Esc / the ✕ exits.
 */
export function CookMode({ recipe, onClose }: Props) {
  const [step, setStep] = useState(0)
  const total = recipe.steps.length
  const touchX = useRef<number | null>(null)

  const atLast = step >= total - 1
  const goNext = () => (atLast ? onClose() : setStep((s) => Math.min(s + 1, total - 1)))
  const goPrev = () => setStep((s) => Math.max(s - 1, 0))

  // Keep the screen awake while cooking; re-acquire if the tab is backgrounded
  // and returns. Feature-detected — a no-op where Wake Lock isn't supported.
  useEffect(() => {
    const wakeLock = (
      navigator as {
        wakeLock?: { request: (t: 'screen') => Promise<{ release: () => void }> }
      }
    ).wakeLock
    if (!wakeLock) return
    let sentinel: { release: () => void } | null = null
    let cancelled = false
    const acquire = async () => {
      try {
        const s = await wakeLock.request('screen')
        if (cancelled) s.release()
        else sentinel = s
      } catch {
        /* denied or unsupported — fine */
      }
    }
    void acquire()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void acquire()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      sentinel?.release()
    }
  }, [])

  // Keyboard: Esc exits, arrows step (desktop convenience).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') setStep((s) => Math.min(s + 1, total - 1))
      else if (e.key === 'ArrowLeft') setStep((s) => Math.max(s - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, total])

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={`Cook mode: ${recipe.title}`}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX
      }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return
        const dx = e.changedTouches[0].clientX - touchX.current
        touchX.current = null
        if (dx < -40) setStep((s) => Math.min(s + 1, total - 1))
        else if (dx > 40) goPrev()
      }}
    >
      <header className={styles.head}>
        <span className={styles.title}>{recipe.title}</span>
        <button
          className={styles.close}
          onClick={onClose}
          aria-label="Exit cook mode"
        >
          <IconClose size={22} />
        </button>
      </header>

      <div className={styles.dots} aria-hidden>
        {recipe.steps.map((_, i) => (
          <span
            key={i}
            className={`${styles.dot} ${i === step ? styles.dotOn : ''} ${
              i < step ? styles.dotDone : ''
            }`}
          />
        ))}
      </div>

      <div className={styles.body}>
        <span className={styles.counter}>
          Step {step + 1} of {total}
        </span>
        <p className={styles.step}>{recipe.steps[step]}</p>
      </div>

      <footer className={styles.foot}>
        <button className={styles.prev} onClick={goPrev} disabled={step === 0}>
          <IconChevronLeft size={20} />
          Back
        </button>
        <button className={styles.next} onClick={goNext}>
          {atLast ? 'Done' : 'Next'}
        </button>
      </footer>
    </div>
  )
}
