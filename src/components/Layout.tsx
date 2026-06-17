import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import styles from './Layout.module.css'

/** App shell: a phone-first centred content column above a fixed bottom nav. */
export function Layout() {
  return (
    <div className={styles.shell}>
      <main className={styles.main}>
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
