// VibePantry edge worker. Currently does one job: 301 www.vibepantry.com → the
// apex (canonical host). Everything else is served straight from the static
// assets (single-page-application fallback handles /, /app, and deep links).
//
// This is the progressive-enhancement seam: the site is pure static today, but
// future server logic (an API route, the optional Anthropic proxy, auth) slots
// in here in front of the same assets — no platform migration.
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.hostname === 'www.vibepantry.com') {
      url.hostname = 'vibepantry.com'
      return Response.redirect(url.toString(), 301)
    }
    return env.ASSETS.fetch(request)
  },
}
