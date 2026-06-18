import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { PantryItem, Recipe } from '../types'
import { getAllItems, getAllRecipes, saveRecipes } from '../db'
import { hasApiAccess } from '../lib/anthropic'
import { generateRecipes, VIBES } from '../lib/recipes'
import type { Vibe } from '../lib/recipes'
import { expiringItems } from '../lib/expiry'
import { PageHeader } from '../components/PageHeader'
import { RecipeCard } from '../components/RecipeCard'
import { IconAdd, IconCamera, IconCook } from '../components/Icons'
import styles from './CookPage.module.css'

const SURPRISE = '__surprise__'

// Rotating status lines for the cook wait — makes the 5–10s feel like the app
// is thinking for you rather than just spinning.
const COOKING_PATTER = [
  'Rifling through your shelves…',
  'Pairing things that belong together…',
  'Balancing flavour and effort…',
  'Plating up a few ideas…',
]

/** Up to 8 hero candidates, proteins/dairy first. */
function heroCandidates(items: PantryItem[]): string[] {
  const priority = new Set(['meat_seafood', 'dairy_eggs'])
  const sorted = [...items].sort((a, b) => {
    const pa = priority.has(a.category) ? 0 : 1
    const pb = priority.has(b.category) ? 0 : 1
    return pa - pb || a.name.localeCompare(b.name)
  })
  const names: string[] = []
  for (const i of sorted) {
    if (!names.includes(i.name)) names.push(i.name)
    if (names.length >= 8) break
  }
  return names
}

export function CookPage() {
  const navigate = useNavigate()
  const location = useLocation()
  // Did we arrive via the pantry's "Cook tonight" shortcut? (captured once)
  const cookTonightRef = useRef(
    (location.state as { cookExpiring?: boolean } | null)?.cookExpiring ?? false,
  )
  const [gated, setGated] = useState<boolean | null>(null)
  const [items, setItems] = useState<PantryItem[] | null>(null)
  const [history, setHistory] = useState<Recipe[]>([])

  const [hero, setHero] = useState<string>(SURPRISE)
  const [vibe, setVibe] = useState<Vibe>('fast')
  const [macros, setMacros] = useState(false)
  const [useExpiring, setUseExpiring] = useState(
    () => (location.state as { cookExpiring?: boolean } | null)?.cookExpiring ?? false,
  )
  const [phase, setPhase] = useState<'prefs' | 'cooking' | 'options'>('prefs')
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [error, setError] = useState<string | null>(null)
  const [patterIdx, setPatterIdx] = useState(0)

  // Cycle the chef patter while cooking (index reset happens in cook()).
  useEffect(() => {
    if (phase !== 'cooking') return
    const t = setInterval(
      () => setPatterIdx((i) => (i + 1) % COOKING_PATTER.length),
      2200,
    )
    return () => clearInterval(t)
  }, [phase])

  useEffect(() => {
    void (async () => {
      const [access, all, recs] = await Promise.all([
        hasApiAccess(),
        getAllItems(),
        getAllRecipes(),
      ])
      setGated(!access)
      const confirmed = all.filter((i) => i.confirmed)
      setItems(confirmed)
      setHistory(sortHistory(recs))

      // One-tap "Cook tonight" from the pantry: auto-generate straight away,
      // biased to soon-to-expire items, with default prefs (surprise / fast).
      const soon = expiringItems(confirmed).map((s) => s.item.name)
      if (
        cookTonightRef.current &&
        access &&
        confirmed.length > 0 &&
        soon.length > 0
      ) {
        setPhase('cooking')
        try {
          const generated = await generateRecipes(confirmed, {
            hero: null,
            vibe: 'fast',
            macros: false,
            useSoon: soon,
          })
          await saveRecipes(generated)
          setRecipes(generated)
          setHistory((prev) => sortHistory([...generated, ...prev]))
          setPhase('options')
        } catch (e) {
          setError(
            e instanceof Error ? e.message : 'Something went wrong cooking.',
          )
          setPhase('prefs')
        }
      }
    })()
  }, [])

  async function cook() {
    if (!items) return
    if (!(await hasApiAccess())) {
      setGated(true)
      return
    }
    setError(null)
    setPatterIdx(0)
    setPhase('cooking')
    try {
      const soonNames = expiringItems(items).map((s) => s.item.name)
      const recs = await generateRecipes(items, {
        hero: hero === SURPRISE ? null : hero,
        vibe,
        macros,
        useSoon: useExpiring ? soonNames : undefined,
      })
      await saveRecipes(recs)
      setRecipes(recs)
      setHistory((prev) => sortHistory([...recs, ...prev]))
      setPhase('options')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong cooking.')
      setPhase('prefs')
    }
  }

  if (gated === null || items === null) {
    return <p className={styles.status}>Loading…</p>
  }

  if (gated) {
    return (
      <>
        <PageHeader title="Cook" />
        <div className={styles.gate}>
          <p className={styles.gateCopy}>
            Cooking needs your Anthropic API key. Add it in Settings — it stays
            in your browser and is only ever sent to api.anthropic.com.
          </p>
          <button className={styles.primary} onClick={() => navigate('/settings')}>
            Go to Settings
          </button>
        </div>
      </>
    )
  }

  if (items.length === 0) {
    return (
      <>
        <PageHeader title="Cook" subtitle="First, get some stock in." />
        <div className={styles.gate}>
          <p className={styles.gateCopy}>
            Your pantry is empty — add a few items and I’ll cook from them.
          </p>
          <div className={styles.gateRow}>
            <button className={styles.primary} onClick={() => navigate('/snap')}>
              <IconCamera size={18} /> Snap pantry
            </button>
            <button className={styles.secondary} onClick={() => navigate('/add')}>
              <IconAdd size={18} /> Add manually
            </button>
          </div>
        </div>
      </>
    )
  }

  if (phase === 'cooking') {
    return (
      <>
        <PageHeader title="Cooking up options" subtitle={COOKING_PATTER[patterIdx]} wide />
        <div
          className={styles.options}
          aria-busy="true"
          aria-label="Generating recipes"
        >
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.skeleton} aria-hidden>
              <div className={`${styles.sk} ${styles.skTitle}`} />
              <div className={`${styles.sk} ${styles.skLine}`} />
              <div className={`${styles.sk} ${styles.skLineShort}`} />
              <div className={styles.skMeta}>
                <div className={`${styles.sk} ${styles.skPill}`} />
                <div className={`${styles.sk} ${styles.skPill}`} />
              </div>
            </div>
          ))}
        </div>
      </>
    )
  }

  if (phase === 'options') {
    return (
      <>
        <PageHeader
          title="Pick a recipe"
          subtitle="Three ways to cook from what you’ve got."
          wide
        />
        <div className={styles.options}>
          {recipes.map((r) => (
            <RecipeCard
              key={r.id}
              recipe={r}
              onSelect={(id) => navigate(`/recipe/${id}`)}
            />
          ))}
        </div>
        <button className={styles.again} onClick={() => setPhase('prefs')}>
          ← Different preferences
        </button>
      </>
    )
  }

  const heroes = heroCandidates(items)
  const soonCount = expiringItems(items).length

  return (
    <>
      <PageHeader
        title="Cook"
        subtitle="Two taps and I’ll cook from what you’ve got."
      />

      <section className={styles.q}>
        <h2 className={styles.qTitle}>What’s the hero?</h2>
        <div className={styles.chips}>
          <button
            className={`${styles.chip} ${hero === SURPRISE ? styles.chipOn : ''}`}
            onClick={() => setHero(SURPRISE)}
          >
            ✨ Surprise me
          </button>
          {heroes.map((name) => (
            <button
              key={name}
              className={`${styles.chip} ${hero === name ? styles.chipOn : ''}`}
              onClick={() => setHero(name)}
            >
              {name}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.q}>
        <h2 className={styles.qTitle}>Vibe?</h2>
        <div className={styles.segment}>
          {VIBES.map((v) => (
            <button
              key={v.value}
              className={`${styles.seg} ${vibe === v.value ? styles.segOn : ''}`}
              onClick={() => setVibe(v.value)}
            >
              {v.label}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.q}>
        <Toggle
          label="High protein + macros"
          on={macros}
          onChange={() => setMacros((m) => !m)}
        />
        {soonCount > 0 && (
          <Toggle
            label={`Cook what’s expiring (${soonCount})`}
            on={useExpiring}
            onChange={() => setUseExpiring((u) => !u)}
          />
        )}
      </section>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <button className={styles.cook} onClick={cook}>
        <IconCook size={20} />
        Cook up options
      </button>

      {history.length > 0 && (
        <section className={styles.history}>
          <h2 className={styles.qTitle}>Recent ideas</h2>
          <ul className={styles.recentList}>
            {history.slice(0, 6).map((r) => (
              <li key={r.id}>
                <button
                  className={styles.recent}
                  onClick={() => navigate(`/recipe/${r.id}`)}
                >
                  <span className={styles.recentTitle}>{r.title}</span>
                  <span className={styles.recentMeta}>
                    {r.timeMinutes} min · serves {r.servings}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

function sortHistory(recs: Recipe[]): Recipe[] {
  return [...recs].sort((a, b) =>
    (b.createdAt ?? '').localeCompare(a.createdAt ?? ''),
  )
}

function Toggle({
  label,
  on,
  onChange,
}: {
  label: string
  on: boolean
  onChange: () => void
}) {
  return (
    <div className={styles.toggleRow}>
      <span className={styles.toggleLabel}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        className={`${styles.switch} ${on ? styles.switchOn : ''}`}
        onClick={onChange}
      >
        <span className={styles.knob} />
      </button>
    </div>
  )
}
