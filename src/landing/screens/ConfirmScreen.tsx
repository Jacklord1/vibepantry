import { ri } from '../reveal'
import s from './screens.module.css'

const ITEMS = [
  { name: 'Eggs', qty: '×6' },
  { name: 'Cheddar', qty: '200 g' },
  { name: 'Baby spinach', qty: '1 bag' },
  { name: 'Chicken thigh', qty: '500 g' },
  { name: 'Garlic', qty: '×4' },
]

/** Panel 3 — extracted item rows (name + qty) that cascade in. */
export function ConfirmScreen() {
  return (
    <>
      <div className={s.screenTitle} data-reveal>
        Pantry · {ITEMS.length} items
      </div>
      {ITEMS.map((item, i) => (
        <div className={s.itemRow} key={item.name} data-reveal style={ri(i + 1)}>
          <span className={s.itemDot} aria-hidden="true" />
          <span className={s.itemName}>{item.name}</span>
          <span className={s.itemQty}>{item.qty}</span>
        </div>
      ))}
    </>
  )
}
