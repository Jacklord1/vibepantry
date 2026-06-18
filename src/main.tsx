import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './theme/global.css'
import { launchHash } from './lib/launchHash'
import { App } from './App'
import { LandingDeck } from './landing/LandingDeck'

// Path-gated bootstrap: the app lives at `/app` (HashRouter handles its
// sub-routes in the hash, e.g. `/app#/cook`), and `/` is the landing page.
// Cloudflare Pages serves index.html for any non-asset path (see public/
// _redirects), so this gate decides what to render. Read once, outside React —
// StrictMode never re-runs this module.
const path = window.location.pathname.replace(/\/+$/, '')
const isApp = path === '/app' || path.startsWith('/app/')

// Phase-5 affordance: surface the captured launch hash in dev for inspection.
if (import.meta.env.DEV && launchHash) {
  console.debug('[VibePantry] launch hash captured:', launchHash)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isApp ? <App /> : <LandingDeck />}</StrictMode>,
)
