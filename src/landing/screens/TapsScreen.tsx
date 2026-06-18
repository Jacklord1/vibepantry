import { ri } from '../reveal'
import s from './screens.module.css'

/** Panel 4 — preference chips: diet + time, one preset active in each row. */
export function TapsScreen() {
  return (
    <>
      <div className={s.chipGroup} data-reveal>
        <span className={s.chipLabel}>Diet</span>
        <div className={s.chipRow}>
          <span className={s.chip}>Any</span>
          <span className={`${s.chip} ${s.chipOn}`}>High-protein</span>
          <span className={s.chip}>Veggie</span>
        </div>
      </div>
      <div className={s.chipGroup} data-reveal style={ri(1)}>
        <span className={s.chipLabel}>Time</span>
        <div className={s.chipRow}>
          <span className={s.chip}>15 min</span>
          <span className={`${s.chip} ${s.chipOn}`}>30 min</span>
          <span className={s.chip}>Slow</span>
        </div>
      </div>
      <button type="button" className={s.askBtn} data-reveal style={ri(2)} tabIndex={-1}>
        Suggest recipes
      </button>
    </>
  )
}
