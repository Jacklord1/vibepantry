# Deploying VibePantry to Cloudflare Pages

One-time setup to put VibePantry live at **vibepantry.com** with automatic
deploys on every push to `main`. The build is a plain static site (`dist/`), so
this is just connecting the repo and adding the domain.

> The app serves a **landing page at `/`** and the **app itself at `/app`**
> (e.g. `vibepantry.com/app`). This is why the build is hosted at a domain root.

## 1. Connect the repo

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git**.
2. Authorise GitHub if prompted, then select **`Jacklord1/vibepantry`**
   (a private repo is fine).
3. **Build settings:**
   - Framework preset: **Vite** (or **None** — both work).
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - Root directory: leave as `/`.
   - Node version: read automatically from **`.nvmrc`** (22). If a build ever
     uses the wrong version, set an environment variable `NODE_VERSION = 22`.
4. **Save and Deploy.** The first build runs from `main` and gives you a
   `*.pages.dev` preview URL — open it and click **Launch app** to sanity-check.

## 2. Add the domain

1. In the Pages project → **Custom domains** → **Set up a custom domain** →
   enter **`vibepantry.com`** → follow the prompt.
   Because the zone is already in this Cloudflare account, Pages creates the DNS
   record and the TLS certificate automatically — no manual records needed.
2. Add **`www.vibepantry.com`** as well, then point it at the apex with a
   **redirect** (Rules → Redirect Rules, or a bulk redirect: `www.vibepantry.com/*`
   → `https://vibepantry.com/$1`, 301). This keeps a single canonical host.
3. Wait for the cert to issue (usually a few minutes). `https://vibepantry.com`
   then serves the landing, and `https://vibepantry.com/app` serves the app.

## 3. From here on

- **Auto-deploy:** every push to `main` rebuilds and redeploys. Pull requests get
  their own preview URLs. Production branch = `main`.
- The service worker uses `autoUpdate`, so a new deploy refreshes returning
  visitors on their next load.

## Notes

- The **`proxy/`** folder is a *separate, optional* Cloudflare **Worker** (for
  users who want to keep their API key server-side). Pages does **not** deploy it
  — ignore it here. Deploy it on its own with `wrangler` only if you want it.
- Visiting the landing at `/` pre-warms the app shell (the service worker installs
  on first load), so the **Launch app** button is instant.
- No secrets live in this repo or the build — VibePantry is bring-your-own-key;
  each user pastes their own Anthropic key into the app, stored only in their
  browser.
