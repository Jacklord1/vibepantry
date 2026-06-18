import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Recipe } from '../types'
import { getRecipe } from '../db'
import { RecipeSheet } from '../components/RecipeSheet'
import { CookMode } from '../components/CookMode'
import { IconChevronLeft, IconCook, IconPrint } from '../components/Icons'
import styles from './RecipePage.module.css'

export function RecipePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  // undefined = loading, null = not found
  const [recipe, setRecipe] = useState<Recipe | null | undefined>(undefined)
  const [cooking, setCooking] = useState(false)

  useEffect(() => {
    if (!id) return
    let active = true
    void (async () => {
      const r = await getRecipe(id)
      if (active) setRecipe(r ?? null)
    })()
    return () => {
      active = false
    }
  }, [id])

  if (recipe === undefined) {
    return <p className={styles.status}>Loading…</p>
  }
  if (recipe === null) {
    return (
      <>
        <p className={styles.status}>That recipe isn’t here anymore.</p>
        <button className={styles.back} onClick={() => navigate('/cook')}>
          Back to Cook
        </button>
      </>
    )
  }

  return (
    <>
      <div className={styles.bar}>
        <button
          className={styles.barBtn}
          onClick={() => navigate(-1)}
          aria-label="Back"
        >
          <IconChevronLeft size={18} />
          Back
        </button>
        <div className={styles.barActions}>
          {recipe.steps.length > 0 && (
            <button className={styles.cookMode} onClick={() => setCooking(true)}>
              <IconCook size={18} />
              Cook Mode
            </button>
          )}
          <button
            className={styles.print}
            onClick={() => window.print()}
            aria-label="Print or save as PDF"
          >
            <IconPrint size={18} />
          </button>
        </div>
      </div>

      <RecipeSheet recipe={recipe} />

      {cooking && (
        <CookMode recipe={recipe} onClose={() => setCooking(false)} />
      )}
    </>
  )
}
