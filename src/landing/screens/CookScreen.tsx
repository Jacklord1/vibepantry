import { ri } from '../reveal'
import s from './screens.module.css'

const RECIPES = [
  { name: 'Garlic chicken & rice', time: '30 min', kcal: '540 kcal' },
  { name: 'Cheesy spinach omelette', time: '15 min', kcal: '320 kcal' },
  { name: 'Chicken fried rice', time: '25 min', kcal: '480 kcal' },
]

/** Panel 5 — recipe cards (name · time · kcal) that rise in. */
export function CookScreen() {
  return (
    <>
      <div className={s.screenTitle} data-reveal>
        Makeable right now
      </div>
      {RECIPES.map((r, i) => (
        <div className={s.recipeCard} key={r.name} data-reveal style={ri(i + 1)}>
          <span className={s.recipeName}>{r.name}</span>
          <span className={s.recipeMeta}>
            <span>{r.time}</span>
            <span className={s.sep}>·</span>
            <span>{r.kcal}</span>
          </span>
        </div>
      ))}
    </>
  )
}
