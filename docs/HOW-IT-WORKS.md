# How VibePantry works

VibePantry is a static, browser-only app. There is no backend, no database server,
and no account system. Everything — your pantry, your settings, your recipe history,
and your API key — lives in your browser. The only thing that ever leaves your device
is a request to Anthropic (or to your own proxy, if you set one up).

This document explains the moving parts, honestly.

## The loop

```
  snap  →  confirm  →  cook  →  card
  📷       ✏️ grid     🍳        🖨️
```

1. **Snap.** Photograph your shelves and fridge — one item or a whole shelf per shot.
2. **Confirm.** Claude reads each photo and extracts the items into one editable grid.
   You accept, tweak, or delete in a single pass. Confirmed items become your pantry.
3. **Cook.** Tap a few preferences (hero ingredients, vibe, meal type, dietary needs)
   and ask for recipes. You get two or three dishes makeable from what you actually
   have.
4. **Card.** Each recipe opens as a clean, one-page printable card (or a full-screen,
   one-step-at-a-time cook mode that keeps the screen awake).

The pantry is a means to the recipe, never the product itself — catalogue so it can
cook for you.

## The two AI calls

Everything else runs locally. There are exactly two calls to Claude.

### 1. Vision — reading your photos

- **Model:** `claude-sonnet-4-6` (always). Extraction quality is make-or-break, so
  this one never drops to a cheaper model.
- **Input:** one downscaled photo per request.
- **Output:** a JSON array of items — `{ name, quantity, category, macros? }` — sorted
  into nine categories (produce, meat & seafood, dairy & eggs, dry pantry, spices &
  condiments, frozen, bakery, beverages, other). If a photo is a nutrition label, it
  pulls per-100g macros too.

### 2. Recipes — cooking from your pantry

- **Model:** `claude-haiku-4-5` by default. Recipes run far more often than photo
  extraction, and Haiku's recipes tested as good as Sonnet's at roughly a third of the
  cost. You can switch back to Sonnet any time in **Settings → Recipe model**.
- **Input:** your confirmed pantry plus your preference taps.
- **Output:** two or three recipes with title, blurb, ingredients, steps, per-serving
  macros, and tags.

### Cost

You pay Anthropic directly — there is no middleman and no subscription. In practice a
photo or a recipe request is a fraction of a cent to a few cents. Settings shows a
running readout of calls, tokens, and estimated spend, bucketed by call type.

## How the API key is handled

VibePantry is bring-your-own-key. You paste your Anthropic key (`sk-ant-…`) into
**Settings**, and it is written to IndexedDB on your device. From there:

- The key is **only ever sent to `api.anthropic.com`** (or your own proxy — see below).
- It is **never logged** (the app only ever displays a masked `••••••••LAST4` form),
  **never committed**, and **never uploaded** anywhere else.
- Calls go straight from your browser to Anthropic using the supported
  `anthropic-dangerous-direct-browser-access: true` header. That header name is
  Anthropic's, and it is deliberately scary — it means *you* are choosing to hold the
  key client-side. For a single-user, local-first app that is the honest trade: no
  server means no server to leak it from, but it also means the key sits in your
  browser. If that trade isn't for you, use the proxy.

### Optional: keep the key server-side (proxy)

If you'd rather not hold the key in the browser, deploy the tiny Cloudflare Worker in
[`proxy/`](../proxy/), then paste its URL into **Settings → Advanced — custom API
endpoint** and leave the key field blank. The app then POSTs to your Worker instead of
Anthropic, and the Worker injects the key from a server-side secret. The app never
depends on this — direct mode is the default.

## The photo pipeline

Phone photos are large (modern phones shoot 48 MP+, 3–12 MB), and naively decoding one
full-resolution bitmap is what crashes low-RAM phones. So the pipeline is careful
([`src/lib/image.ts`](../src/lib/image.ts)):

- **Header-only sizing.** Dimensions are read from the first 64 KB of the file
  (JPEG/PNG/WebP headers) without decoding any pixels.
- **Decode straight to target size.** Where the browser supports it, `createImageBitmap`
  decodes directly to the downscaled size, so the full-resolution buffer is never
  allocated. Safari and unsupported formats fall back to a full decode + canvas
  downscale.
- **1568 px, 85% JPEG.** Images are bounded to a 1568 px long edge at 0.85 quality —
  Anthropic downsamples past ~1568 px server-side anyway, so this is a free upload and
  token win with no quality loss.
- **Throttled batches.** When you pick several photos at once they're processed with a
  small concurrency cap, so a big batch doesn't exhaust memory.

## The magic-link key installer (optional onboarding)

For friends and family, VibePantry can accept a launch link that pre-loads a key, so
there's no copy-paste step. Only the **receiving** side lives in this repo
([`src/lib/magicLink.ts`](../src/lib/magicLink.ts)); the generator is a separate
private tool and is intentionally not published.

- **Format:** `https://<domain>/app#k=<base64-key>&t=<unix-seconds>`.
- **Fragment, not query.** The key lives in the URL fragment (`#…`), which browsers
  never send to the server — so the key never reaches Cloudflare, access logs, or
  anything upstream.
- **Stripped before render.** `main.tsx` removes the hash via `history.replaceState`
  before the app's first paint, so the key never lingers in the address bar or history.
- **base64 is obfuscation, not encryption.** Anyone with the link can decode it. It
  only stops the raw `sk-ant-…` being glanceable. The real safety comes from the key
  being per-person, spend-capped, and deletable.
- **`t` is a speed bump.** The optional timestamp drives a 24-hour staleness check so an
  old forwarded link doesn't silently auto-install. It is not security.

## Storage

All state is in IndexedDB via [`idb`](https://github.com/jakearchibald/idb)
([`src/db/index.ts`](../src/db/index.ts)) — three object stores:

- **`items`** — your pantry (indexed by category).
- **`recipes`** — generated-recipe history.
- **`settings`** — key/value pairs: your API key, optional proxy endpoint, recipe-model
  choice, usage logs, dietary defaults.

There is no migration machinery (DB version is pinned at 1). The only "sync" is manual
**export/import**: a JSON blob of your pantry items (your key and settings are *not*
included in an export, by design).

## Deployment

The build is pure static assets — `npm run build` emits a self-contained PWA into
`dist/` (app shell, service worker, self-hosted fonts, no CDN). Host it on anything:
Cloudflare Workers/Pages, Netlify, Vercel, GitHub Pages, or Docker + nginx. The only
requirement is an SPA fallback to `index.html` for deep links.

The live site (vibepantry.com) runs on Cloudflare Workers static assets with a thin
`worker.js` in front (it 301s `www` → apex and is the seam for any future server
logic). The exact setup is in [SETUP.md](../SETUP.md).

## Tech stack

| Layer | Choice |
|---|---|
| Build | Vite |
| UI | React 19 + TypeScript (strict) |
| Routing | React Router (HashRouter — refresh-safe deep links) |
| Storage | IndexedDB via `idb` |
| PWA | `vite-plugin-pwa` (Workbox) |
| Fonts | self-hosted Fraunces + Inter (no CDN) |
| AI | browser-direct `fetch` to `api.anthropic.com` |
| Hosting | any static host (Cloudflare Workers as reference) |

No server, no accounts, no tracking, no analytics.

---

_VibePantry is an independent open-source project and is not affiliated with,
endorsed by, or sponsored by Anthropic._
