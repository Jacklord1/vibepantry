import type { Recipe } from '../types'
import styles from './RecipeCard.module.css'

type Props = {
  recipe: Recipe
  onSelect: (id: string) => void
}

/** One generated recipe as a tappable option card. */
export function RecipeCard({ recipe, onSelect }: Props) {
  return (
    <button className={styles.card} onClick={() => onSelect(recipe.id)}>
      <h3 className={styles.title}>{recipe.title}</h3>
      {recipe.blurb && <p className={styles.blurb}>{recipe.blurb}</p>}

      <div className={styles.meta}>
        <span>{recipe.timeMinutes} min</span>
        <span aria-hidden>·</span>
        <span>serves {recipe.servings}</span>
      </div>

      {recipe.usesItems.length > 0 && (
        <p className={styles.uses}>
          <span className={styles.usesLabel}>Uses</span>{' '}
          {recipe.usesItems.join(', ')}
        </p>
      )}

      {recipe.missingItems.length > 0 && (
        <p className={styles.missing}>
          <span className={styles.missingLabel}>Need</span>{' '}
          {recipe.missingItems.join(', ')}
        </p>
      )}

      {recipe.tags.length > 0 && (
        <div className={styles.tags}>
          {recipe.tags.map((t) => (
            <span key={t} className={styles.tag}>
              {t}
            </span>
          ))}
        </div>
      )}
    </button>
  )
}
