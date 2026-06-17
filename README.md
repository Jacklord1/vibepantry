# VibePantry

> Snap your pantry, cook from what you have.

A static, browser-only PWA. Photograph your shelves and fridge; AI vision
extracts the items into one editable grid you confirm in a single pass; then
ask for a recipe and get dishes makeable from what you actually have —
finishing in a one-page printable card.

**Bring your own Anthropic API key. Your data never leaves your browser.**

- 🗄️ Local-first — everything lives in IndexedDB on your device.
- 🔑 Your API key is stored only in your browser and only ever sent to
  `api.anthropic.com`.
- 🧱 Pure static build — no backend required. Clone, build, serve `dist/`.

> **Status:** early build. Phase 1 (pantry CRUD + theme + settings) is in.
> Vision extraction, the recipe loop, and printable cards land in later phases.
> This README is a stub — full setup, self-host and proxy docs come in Phase 4.

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
```

## Build & self-host

```bash
npm run build    # outputs static files to dist/
# serve dist/ on any static host (Netlify, GitHub Pages, Cloudflare Pages)
```

### Docker (nginx)

```bash
docker build -t vibepantry .
docker run -p 8080:80 vibepantry   # http://localhost:8080
```

## Tech

Vite · React · TypeScript · IndexedDB (`idb`) · React Router. No server,
no accounts, no tracking.

## Roadmap (out of scope for v1)

Accounts, multi-user, cloud sync, barcode scanning, shopping-list checkout,
mobile app-store builds.

## License

MIT — see [LICENSE](./LICENSE).
