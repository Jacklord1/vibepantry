import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './theme/global.css'
import { launchHash } from './lib/launchHash'
import { parseLaunchHash } from './lib/magicLink'
import { App } from './App'
import { LandingDeck } from './landing/LandingDeck'

// Path-gated bootstrap: the app lives at `/app` (HashRouter handles its
// sub-routes in the hash, e.g. `/app#/cook`), and `/` is the landing page.
// Cloudflare Pages serves index.html for any non-asset path (see public/
// _redirects), so this gate decides what to render. Read once, outside React —
// StrictMode never re-runs this module.
const path = window.location.pathname.replace(/\/+$/, '')
const isApp = path === '/app' || path.startsWith('/app/')

// Magic-link installer: if the launch hash carries an API key (`#k=…`), strip it
// from the URL NOW — before any render — so neither the encoded nor the decoded
// key ever shows in the address bar or browser history. The in-memory
// `launchHash` snapshot still holds the value for <KeyInstaller>. Guarded on a
// real `k` param so normal `#/route` hashes are untouched. Never log the hash:
// the base64 in the link is obfuscation, not security (see lib/magicLink.ts).
if (parseLaunchHash(launchHash).k !== null) {
  history.replaceState(null, '', window.location.pathname + window.location.search)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isApp ? <App /> : <LandingDeck />}</StrictMode>,
)
