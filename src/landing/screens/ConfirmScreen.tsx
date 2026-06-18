import { ri } from '../reveal'
import s from './screens.module.css'

const ITEMS = [
  { name: 'Eggs', qty: '×6' },
  { name: 'Cheddar', qty: '200 g' },
  { name: 'Baby spinach', qty: '1 bag' },
  { name: 'Chicken thigh', qty: '500 g' },
  { name: 'Garlic', qty: '×4' },
]

function PencilGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
    </svg>
  )
}

function TrashGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
    </svg>
  )
}

/** Panel 3 — extracted item rows (name over quantity) that cascade in,
    echoing the real ItemCard: ghost edit/delete on the right. */
export function ConfirmScreen() {
  return (
    <>
      <div className={s.screenTitle} data-reveal>
        Pantry · {ITEMS.length} items
      </div>
      {ITEMS.map((item, i) => (
        <div className={s.itemRow} key={item.name} data-reveal style={ri(i + 1)}>
          <span className={s.itemMain}>
            <span className={s.itemName}>{item.name}</span>
            <span className={s.itemQty}>{item.qty}</span>
          </span>
          <span className={s.itemActions} aria-hidden="true">
            <PencilGlyph />
            <TrashGlyph />
          </span>
        </div>
      ))}
    </>
  )
}
