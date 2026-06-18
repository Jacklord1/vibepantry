# Deploying VibePantry (Cloudflare Workers static assets)

VibePantry is live at **https://vibepantry.com** — served by a Cloudflare
**Worker** (`vibepantry`) with the static build (`dist/`) as its assets. Same
model as `stwrd-site`. Landing is at `/`, the app at `/app`.

## How it's wired

- **`wrangler.toml`** — worker `vibepantry`, `[assets] directory = "./dist"`,
  `not_found_handling = "single-page-application"` (serves `index.html` for any
  non-asset path, so `/`, `/app`, and hard-refreshed deep links all resolve to
  the path-gated bootstrap). `workers_dev = false` (canonical = the custom domain).
- **`worker.js`** — a thin script in front of the assets that 301s
  `www.vibepantry.com` → the apex, and otherwise serves the static assets
  (`env.ASSETS`). It's the seam for any future server logic.
- **Custom domain** `vibepantry.com` is attached to the worker (in the dashboard).

## Deploy

From the NUC (secrets resolved via 1Password):

```bash
cd ~/git/vibepantry
npm run build
op run --env-file=~/ai/.env.local -- npx wrangler deploy
```

`wrangler` reads `CLOUDFLARE_API_TOKEN` (the `Edit zone DNS` token — has Workers
Scripts edit) and `CLOUDFLARE_ACCOUNT_ID` from the env. Deploy takes ~5s; only
changed assets upload.

## Outstanding: bind `www` (one dashboard step)

The deploy token can edit the worker script but **not** manage Worker custom
domains, so `www.vibepantry.com` isn't bound yet. To finish the `www → apex`
redirect:

1. Cloudflare → **Workers & Pages → `vibepantry` → Settings → Domains & Routes**
   → **Add → Custom domain** → `www.vibepantry.com` → save.
2. That's it — the deployed `worker.js` already 301s `www` to the apex.

(Alternatively, add **Workers Routes: Edit** to the deploy token and the `routes`
block in `wrangler.toml` will manage both domains automatically.)

## Auto-deploy (wired)

Push-to-deploy is live via **GitHub Actions** (`.github/workflows/deploy.yml`):

- **Automatic:** every push/merge to `main` builds (`npm run build`) and runs
  `wrangler deploy` (~1 min). Branches don't deploy — merging to `main` is the
  release.
- **Manual:** GitHub → repo → **Actions → Deploy → Run workflow**, or
  `gh workflow run deploy.yml -R Jacklord1/vibepantry`.
- Repo secrets `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` are set.
  (Security follow-up: the CI token is currently the broad `Edit zone DNS` token —
  swap it for a Workers-only least-priv token when convenient.)

A direct `wrangler deploy` from the NUC (see above) still works any time.

## Notes

- The optional Anthropic proxy in `proxy/` is a **separate** Worker
  (`vibepantry-proxy`) — not deployed by this. Ignore unless you want it.
- No secrets ship in the build — VibePantry is bring-your-own-key; each user
  pastes their own Anthropic key into the app, stored only in their browser.
