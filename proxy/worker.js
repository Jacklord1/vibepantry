// VibePantry proxy — an optional Cloudflare Worker that forwards browser
// requests to the Anthropic Messages API, injecting your API key from a Worker
// secret so the key never lives in the browser.
//
// The VibePantry app does NOT depend on this. Use it only if you'd rather keep
// your key server-side. Deploy steps are in ./README.md.

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

function corsHeaders(request, env) {
  const origin = request.headers.get('origin')
  // Lock to ALLOWED_ORIGIN if you set it; otherwise reflect the caller's origin.
  const allow = env.ALLOWED_ORIGIN || origin || '*'
  return {
    'access-control-allow-origin': allow,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers':
      'content-type, anthropic-version, x-api-key, anthropic-dangerous-direct-browser-access',
    'access-control-max-age': '86400',
    vary: 'origin',
  }
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: cors })
    }
    if (!env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({
          error: { message: 'Proxy is missing the ANTHROPIC_API_KEY secret.' },
        }),
        { status: 500, headers: { 'content-type': 'application/json', ...cors } },
      )
    }

    const upstream = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'anthropic-version':
          request.headers.get('anthropic-version') || ANTHROPIC_VERSION,
        'x-api-key': env.ANTHROPIC_API_KEY, // injected server-side
      },
      body: await request.text(),
    })

    const headers = new Headers(upstream.headers)
    for (const [k, v] of Object.entries(cors)) headers.set(k, v)
    return new Response(upstream.body, { status: upstream.status, headers })
  },
}
