import type { Recipe } from '../types'
import styles from './RecipeSheet.module.css'

/** The printable one-page recipe card (clean under @media print). */
export function RecipeSheet({ recipe }: { recipe: Recipe }) {
  return (
    <article className={styles.sheet}>
      <header className={styles.head}>
        <h1 className={styles.title}>{recipe.title}</h1>
        {recipe.blurb && <p className={styles.blurb}>{recipe.blurb}</p>}
        <div className={styles.meta}>
          <span>Serves {recipe.servings}</span>
          <span aria-hidden>·</span>
          <span>{recipe.timeMinutes} min</span>
          {recipe.tags.length > 0 && (
            <>
              <span aria-hidden>·</span>
              <span>{recipe.tags.join(', ')}</span>
            </>
          )}
        </div>
      </header>

      {recipe.usesItems.length > 0 && (
        <p className={styles.uses}>
          From your pantry: {recipe.usesItems.join(', ')}.
        </p>
      )}
      {recipe.missingItems.length > 0 && (
        <p className={styles.missing}>
          You may need: {recipe.missingItems.join(', ')}.
        </p>
      )}

      {recipe.ingredients.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.h2}>Ingredients</h2>
          <ul className={styles.ingredients}>
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className={styles.ingredient}>
                <span className={styles.ingName}>{ing.name}</span>
                {ing.amount && (
                  <span className={styles.ingAmount}>{ing.amount}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {recipe.steps.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.h2}>Method</h2>
          <ol className={styles.steps}>
            {recipe.steps.map((step, i) => (
              <li key={i} className={styles.step}>
                {step}
              </li>
            ))}
          </ol>
        </section>
      )}

      <footer className={styles.footer}>VibePantry</footer>
    </article>
  )
}
