import { ri } from '../reveal'
import s from './screens.module.css'

const RECIPES = [
  {
    name: 'Garlic chicken & rice',
    blurb: 'One-pan, weeknight-fast.',
    time: '30 min',
    kcal: '540 kcal',
    tag: 'high-protein',
  },
  {
    name: 'Cheesy spinach omelette',
    blurb: 'Five-minute breakfast.',
    time: '15 min',
    kcal: '320 kcal',
    tag: null,
  },
  {
    name: 'Chicken fried rice',
    blurb: 'Uses up the leftover rice.',
    time: '25 min',
    kcal: '480 kcal',
    tag: null,
  },
]

/** Panel 5 — recipe cards (name · blurb · time · kcal) that rise in. */
export function CookScreen() {
  return (
    <>
      <div className={s.screenTitle} data-reveal>
        Makeable right now
      </div>
      {RECIPES.map((r, i) => (
        <div className={s.recipeCard} key={r.name} data-reveal style={ri(i + 1)}>
          <span className={s.recipeName}>{r.name}</span>
          <span className={s.recipeBlurb}>{r.blurb}</span>
          <span className={s.recipeMeta}>
            <span>{r.time}</span>
            <span className={s.sep}>·</span>
            <span>{r.kcal}</span>
          </span>
          {r.tag && <span className={s.recipeTag}>{r.tag}</span>}
        </div>
      ))}
    </>
  )
}
