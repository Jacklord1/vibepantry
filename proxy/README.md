# VibePantry proxy (optional)

A tiny [Cloudflare Worker](https://workers.cloudflare.com/) that forwards
VibePantry's requests to the Anthropic Messages API, **injecting your API key
from a Worker secret** so the key never lives in the browser.

**The app does not need this.** By default VibePantry calls `api.anthropic.com`
directly with the key you paste into Settings (it stays in your browser). Use
this proxy only if you'd rather keep the key server-side.

## Deploy

```bash
npm install -g wrangler
cd proxy
wrangler login
wrangler deploy
wrangler secret put ANTHROPIC_API_KEY   # paste your sk-ant-… key when prompted
```

`wrangler deploy` prints your Worker URL, e.g.
`https://vibepantry-proxy.<you>.workers.dev`.

## Point the app at it

In VibePantry → **Settings → Advanced — custom API endpoint**, paste the Worker
URL. The app will POST there instead of `api.anthropic.com`, and you can **leave
the API key field blank** (the Worker supplies it). Clear the endpoint to go
back to calling Anthropic directly.

## Lock it down (recommended)

Anyone who knows your Worker URL could otherwise spend your key. Restrict it to
your app's origin by uncommenting `ALLOWED_ORIGIN` in `wrangler.toml` (set it to
the URL VibePantry is served from) and redeploying. The Worker only returns CORS
access to that origin.

## How it works

The browser sends the same JSON body it would send to Anthropic. The Worker adds
`x-api-key` (from the secret) + `anthropic-version`, forwards to
`https://api.anthropic.com/v1/messages`, and streams the response back with CORS
headers. It also answers the CORS preflight (`OPTIONS`). ~40 lines — read
`worker.js`.
