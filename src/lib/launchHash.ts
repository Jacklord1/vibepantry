/**
 * The URL hash captured once, at module load, before React or HashRouter mount.
 *
 * Magic links arrive as `/app#k=<base64>&t=<unix>` (LOCKED format). HashRouter
 * treats that hash as a route, fails to match it, and redirects to `/` —
 * clobbering the value before any component can read it. Capturing it here keeps
 * the original launch hash recoverable for the installer.
 *
 * Consumed by `main.tsx` (strips the hash from the URL before render) and
 * `KeyInstaller` (parses/decodes/installs the key). Importing it in `main.tsx`
 * before the app renders is what makes the capture happen at the right moment.
 */
export const launchHash = window.location.hash
