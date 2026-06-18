import type { CSSProperties, ReactNode } from 'react'
import styles from './LandingDeck.module.css'
import { PhoneMock } from './PhoneMock'
import type { NavKey } from './PhoneMock'
import { SnapScreen } from './screens/SnapScreen'
import { ConfirmScreen } from './screens/ConfirmScreen'
import { TapsScreen } from './screens/TapsScreen'
import { CookScreen } from './screens/CookScreen'
import { useActivePanel } from './useActivePanel'
import { ri } from './reveal'

const REPO = 'https://github.com/Jacklord1/vibepantry'

/** Labels for the progress dots — also the panel reading order. */
const PANEL_LABELS = [
  'Intro',
  'Snap your shelves',
  'Confirm in one pass',
  'One or two taps',
  'Cook & convert',
] as const

/** Sets the `--step` custom property for the hero loop motif's stagger. */
const step = (n: number): CSSProperties => ({ '--step': n }) as CSSProperties

function ChevronDown() {
  return (
    <svg className={styles.chevron} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

function IconCamera() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2L8 5h8l1.5 2h2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

function IconPot() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 11h16v4a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-4z" />
      <path d="M3 11h18" />
      <path d="M9 8c0-1.4 1.3-2 3-2s3 .6 3 2" />
    </svg>
  )
}

function IconArrow() {
  return (
    <svg className={styles.loopArrow} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h13M12 6l6 6-6 6" />
    </svg>
  )
}

/** A loop step (panels 2–5): copy beside a schematic phone mock. */
function Panel({
  index,
  registerRef,
  revealed,
  flip,
  kicker,
  title,
  body,
  caption,
  mockLabel,
  nav,
  screen,
  children,
}: {
  index: number
  registerRef: (i: number) => (el: HTMLElement | null) => void
  revealed: boolean
  flip?: boolean
  kicker: string
  title: string
  body: string
  caption: string
  mockLabel: string
  nav: NavKey
  screen: ReactNode
  children?: ReactNode
}) {
  return (
    <section
      ref={registerRef(index)}
      data-revealed={revealed ? '' : undefined}
      className={styles.panel}
      aria-label={PANEL_LABELS[index]}
    >
      <div className={`${styles.splitInner} ${flip ? styles.flip : ''}`}>
        <div className={styles.copy}>
          <p className={styles.kicker} data-reveal>
            {kicker}
          </p>
          <h2 className={styles.title} data-reveal style={ri(1)}>
            {title}
          </h2>
          <p className={styles.body} data-reveal style={ri(2)}>
            {body}
          </p>
          {children}
        </div>
        <div className={styles.mockWrap}>
          <PhoneMock label={mockLabel} nav={nav}>
            {screen}
          </PhoneMock>
          <p className={styles.caption} data-reveal style={ri(3)}>
            {caption}
          </p>
        </div>
      </div>
    </section>
  )
}

/**
 * The landing intro deck served at `/` — five full-viewport, scroll-snap panels
 * that walk the snap → confirm → tap → cook loop and convert into `/app`. Native
 * CSS scroll-snap (no JS pager): keyboard, trackpad and screen-reader order come
 * free. The deck is the demo; the final panel is the CTA.
 */
export function LandingDeck() {
  const { active, seen, registerRef, scrollTo } = useActivePanel(PANEL_LABELS.length)

  return (
    <div
      className={styles.deck}
      role="region"
      aria-label="VibePantry — how it works"
      tabIndex={0}
    >
      {/* Persistent CTA — fades in once you're past the hero. */}
      <a
        className={styles.persistCta}
        href="/app"
        data-shown={active > 0 ? '' : undefined}
        aria-hidden={active === 0 || undefined}
        tabIndex={active === 0 ? -1 : 0}
      >
        Open app <span aria-hidden="true">→</span>
      </a>

      <nav className={styles.dots} aria-label="Deck progress">
        {PANEL_LABELS.map((label, i) => (
          <button
            key={label}
            type="button"
            className={styles.dot}
            aria-label={`Go to panel ${i + 1} — ${label}`}
            aria-current={active === i ? 'true' : undefined}
            onClick={() => scrollTo(i)}
          />
        ))}
      </nav>

      {/* Panel 1 — hero */}
      <section
        ref={registerRef(0)}
        data-revealed={seen.has(0) ? '' : undefined}
        className={`${styles.panel} ${styles.hero}`}
        aria-labelledby="vp-hero-title"
      >
        <div className={styles.heroInner}>
          <h1 id="vp-hero-title" className={styles.wordmark} data-reveal>
            Vibe<span className={styles.accent}>Pantry</span>
          </h1>
          <p className={styles.promise} data-reveal style={ri(1)}>
            Snap your kitchen. Cook from what you've actually got.
          </p>
          <p className={styles.privacy} data-reveal style={ri(2)}>
            Bring your own key — nothing leaves your browser.
          </p>

          {/* The loop, in one glance. */}
          <div className={styles.loop} data-reveal style={ri(3)} aria-hidden="true">
            <span className={styles.loopStep} style={step(0)}>
              <IconCamera />
              Snap
            </span>
            <IconArrow />
            <span className={styles.loopStep} style={step(1)}>
              <IconCheck />
              Confirm
            </span>
            <IconArrow />
            <span className={styles.loopStep} style={step(2)}>
              <IconPot />
              Cook
            </span>
          </div>

          <button
            type="button"
            className={styles.walk}
            data-reveal
            style={ri(4)}
            onClick={() => scrollTo(1)}
          >
            Walk the loop
            <ChevronDown />
          </button>
        </div>
      </section>

      {/* Panel 2 */}
      <Panel
        index={1}
        registerRef={registerRef}
        revealed={seen.has(1)}
        nav="add"
        kicker="01 · Snap"
        title="Snap your shelves"
        body="Bulk-photograph everything at once — fridge, pantry, spice rack. Vision reads it all into a list. No typing."
        caption="bulk-photograph everything at once"
        mockLabel="Phone showing bulk photo capture: a take-photo button, three captured shelf photos (spice rack, pantry, fridge) and an add tile"
        screen={<SnapScreen />}
      />

      {/* Panel 3 */}
      <Panel
        index={2}
        registerRef={registerRef}
        revealed={seen.has(2)}
        flip
        nav="pantry"
        kicker="02 · Confirm"
        title="Confirm in one pass"
        body="Every item lands in one editable list — name and quantity. Fix a typo, nudge a count, done. Faster than entering them by hand."
        caption="faster than manual entry"
        mockLabel="Phone showing extracted pantry items, each a row with a name and quantity"
        screen={<ConfirmScreen />}
      />

      {/* Panel 4 */}
      <Panel
        index={3}
        registerRef={registerRef}
        revealed={seen.has(3)}
        nav="cook"
        kicker="03 · Taps"
        title="One or two taps"
        body="Pick a hero ingredient and a vibe — a tap each. No forms, no accounts, no sign-up."
        caption="no forms, no accounts"
        mockLabel="Phone showing a hero-ingredient picker and a Fast/Clean/Comfort vibe selector"
        screen={<TapsScreen />}
      />

      {/* Panel 5 — cook + convert (carries the CTA + footer) */}
      <Panel
        index={4}
        registerRef={registerRef}
        revealed={seen.has(4)}
        flip
        nav="cook"
        kicker="04 · Cook"
        title="Cook from what you've got"
        body="Two or three dishes you can actually make right now — name, time, calories. Pick one, get a clean one-page recipe card."
        caption="makeable from what's on your shelves"
        mockLabel="Phone showing recipe suggestion cards with name, blurb, time and calories"
        screen={<CookScreen />}
      >
        <a className={styles.ctaTile} href="/app" data-reveal style={ri(3)}>
          Open the app
          <span aria-hidden="true">→</span>
        </a>
        <p className={styles.ctaNote} data-reveal style={ri(4)}>
          Bring your own key — free, no account, no sign-up.
        </p>
        <p className={styles.footer} data-reveal style={ri(5)}>
          <a href={REPO} target="_blank" rel="noreferrer">
            GitHub
          </a>{' '}
          · MIT · your data never leaves your browser
        </p>
      </Panel>
    </div>
  )
}
