import { ri } from '../reveal'
import s from './screens.module.css'
import spicerack from '../assets/snap-spicerack.webp'
import pantry from '../assets/snap-pantry.webp'
import fridge from '../assets/snap-fridge.webp'

const PHOTOS = [
  { src: spicerack, i: 2 },
  { src: pantry, i: 3 },
  { src: fridge, i: 4 },
]

function CameraGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2L8 5h8l1.5 2h2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  )
}

/** Panel 2 — bulk photo capture: a "Take photo" hero, 3 captured shelf photos + add-tile. */
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
        {PHOTOS.map((p) => (
          <img
            key={p.src}
            className={s.thumb}
            src={p.src}
            alt=""
            loading="lazy"
            data-reveal
            style={ri(p.i)}
          />
        ))}
        <span className={`${s.thumb} ${s.addTile}`} data-reveal style={ri(5)}>
          +
        </span>
      </div>
    </>
  )
}
