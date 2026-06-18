import { ri } from '../reveal'
import s from './screens.module.css'

function CameraGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2L8 5h8l1.5 2h2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  )
}

/** Panel 2 — bulk photo capture: a "Take photo" hero, 3 thumbnails + add-tile. */
export function SnapScreen() {
  return (
    <>
      <div className={s.statusRow} data-reveal>
        <span className={s.statusDot} aria-hidden="true" />
        Snap your shelves
      </div>
      <button type="button" className={s.snapHero} data-reveal style={ri(1)} tabIndex={-1}>
        <CameraGlyph />
        Take photo
      </button>
      <div className={s.thumbGrid}>
        <span className={s.thumb} data-reveal style={ri(2)} />
        <span className={s.thumb} data-reveal style={ri(3)} />
        <span className={s.thumb} data-reveal style={ri(4)} />
        <span className={`${s.thumb} ${s.addTile}`} data-reveal style={ri(5)}>
          +
        </span>
      </div>
    </>
  )
}
