/**
 * The URL hash captured once, at module load, before React or HashRouter mount.
 *
 * Phase-5 affordance: magic links will arrive as `/app#setup=KEY`. HashRouter
 * treats a bare `#setup=KEY` as a route, fails to match it, and redirects to
 * `/` — clobbering the value before any component can read it. Capturing it
 * here keeps the original launch hash recoverable for the Phase-5 installer.
 *
 * Nothing consumes this yet (that's Phase 5). Importing it in `main.tsx` before
 * the app renders is what makes the capture happen at the right moment.
 */
export const launchHash = window.location.hash
