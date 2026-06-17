import styles from './PageHeader.module.css'

type Props = {
  title: string
  subtitle?: string
  /** Larger display treatment for the home wordmark. */
  wordmark?: boolean
}

export function PageHeader({ title, subtitle, wordmark = false }: Props) {
  return (
    <header className={styles.header}>
      <h1 className={wordmark ? styles.wordmark : styles.title}>{title}</h1>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </header>
  )
}
