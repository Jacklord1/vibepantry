import { NavLink } from 'react-router-dom'
import { IconAdd, IconCook, IconPantry, IconSettings } from './Icons'
import styles from './BottomNav.module.css'

const links = [
  { to: '/', label: 'Pantry', Icon: IconPantry, end: true },
  { to: '/cook', label: 'Cook', Icon: IconCook, end: false },
  { to: '/add', label: 'Add', Icon: IconAdd, end: false },
  { to: '/settings', label: 'Settings', Icon: IconSettings, end: false },
]

export function BottomNav() {
  return (
    <nav className={styles.nav} aria-label="Primary">
      <div className={styles.inner}>
        {links.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              isActive ? `${styles.link} ${styles.active}` : styles.link
            }
          >
            <Icon />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
