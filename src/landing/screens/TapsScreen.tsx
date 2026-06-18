import { ri } from '../reveal'
import s from './screens.module.css'

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
          <span className={`${s.chip} ${s.chipOn}`}>✨ Surprise me</span>
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
