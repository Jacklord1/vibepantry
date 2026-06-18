import { ri } from '../reveal'
import s from './screens.module.css'

function Sparkle() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l1.7 5.1a3 3 0 0 0 1.9 1.9L21 11l-5.4 2a3 3 0 0 0-1.9 1.9L12 20l-1.7-5.1a3 3 0 0 0-1.9-1.9L3 11l5.4-2a3 3 0 0 0 1.9-1.9z" />
    </svg>
  )
}

/**
 * Panel 4 — the real Cook preferences, schematically: "What's the hero?" chips
 * (Surprise me + pantry ingredients) and the "Vibe?" Fast/Clean/Comfort segment.
 */
export function TapsScreen() {
  return (
    <>
      <div className={s.chipGroup} data-reveal>
        <span className={s.chipLabel}>What's the hero?</span>
        <div className={s.chipRow}>
          <span className={`${s.chip} ${s.chipOn}`}>
            <Sparkle />
            Surprise me
          </span>
          <span className={s.chip}>Chicken thigh</span>
          <span className={s.chip}>Cheddar</span>
        </div>
      </div>
      <div className={s.chipGroup} data-reveal style={ri(1)}>
        <span className={s.chipLabel}>Vibe?</span>
        <div className={s.segment}>
          <span className={`${s.seg} ${s.segOn}`}>Fast</span>
          <span className={s.seg}>Clean</span>
          <span className={s.seg}>Comfort</span>
        </div>
      </div>
      <button type="button" className={s.askBtn} data-reveal style={ri(2)} tabIndex={-1}>
        Suggest recipes
      </button>
    </>
  )
}
