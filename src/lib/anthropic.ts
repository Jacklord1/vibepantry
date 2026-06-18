import { getSetting } from '../db'
import { recordUsage, type UsageKind } from './usage'

// Browser-direct Anthropic client. The user's key is read from IndexedDB and
// sent only to api.anthropic.com, using Anthropic's supported in-browser flag.
// Proven in Phase 2 Step 0: this round-trips 200 (no CORS wall).

export const MODEL = 'claude-sonnet-4-6'

/** Recipe-model selection (Settings toggle). Vision always uses MODEL. */
export const HAIKU_MODEL = 'claude-haiku-4-5'
export const RECIPE_MODEL_SETTING = 'recipeModel'
export const RECIPE_MODELS = [
  { id: MODEL, label: 'Sonnet (quality)' },
  { id: HAIKU_MODEL, label: 'Haiku (cheap)' },
] as const
export const DEFAULT_RECIPE_MODEL = HAIKU_MODEL
const ENDPOINT = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
export const API_KEY_SETTING = 'apiKey'
/** Optional custom endpoint (the proxy Worker URL). When set, the app POSTs
 *  here instead of api.anthropic.com and the key may be left blank. */
export const API_BASE_SETTING = 'apiEndpoint'

/** True if the app can make calls: a key OR a custom (proxy) endpoint is set. */
export async function hasApiAccess(): Promise<boolean> {
  const [key, base] = await Promise.all([
    getSetting(API_KEY_SETTING),
    getSetting(API_BASE_SETTING),
  ])
  return !!(key || base)
}

export type TextBlock = { type: 'text'; text: string }
export type ImageBlock = {
  type: 'image'
  source: { type: 'base64'; media_type: string; data: string }
}
export type ContentBlock = TextBlock | ImageBlock
export type AnthropicMessage = {
  role: 'user' | 'assistant'
  content: string | ContentBlock[]
}

/** No key saved — caller should route the user to Settings. */
export class MissingApiKeyError extends Error {
  constructor() {
    super('No API key set')
    this.name = 'MissingApiKeyError'
  }
}

/** An API or network failure, with a message already phrased for the UI. */
export class AnthropicError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'AnthropicError'
    this.status = status
  }
}

function friendlyError(status: number, apiMessage?: string): string {
  switch (status) {
    case 401:
      return 'Your API key looks wrong — check it in Settings.'
    case 403:
      return "That key doesn't have access to this model — check it in Settings."
    case 429:
      return 'Anthropic is rate-limiting right now — wait a moment and try again.'
    case 400:
      return apiMessage
        ? `Anthropic rejected the request: ${apiMessage}`
        : 'Anthropic rejected the request.'
    case 529:
    case 500:
    case 503:
      return 'Anthropic had a problem on their end — try again in a moment.'
    default:
      return apiMessage
        ? `Anthropic error (${status}): ${apiMessage}`
        : `Anthropic error (${status}).`
  }
}

type CallArgs = {
  system: string
  messages: AnthropicMessage[]
  maxTokens?: number
  /** Which call this is — used to bucket token usage. */
  kind: UsageKind
  /** Model override; defaults to MODEL (Sonnet). Vision omits it. */
  model?: string
}

/**
 * Call /v1/messages and return the concatenated text of the response.
 * Throws MissingApiKeyError if no key is set, or AnthropicError on failure
 * (message already UI-ready).
 */
export async function callMessages({
  system,
  messages,
  maxTokens = 3000,
  kind,
  model = MODEL,
}: CallArgs): Promise<string> {
  const [apiKey, apiBase] = await Promise.all([
    getSetting(API_KEY_SETTING),
    getSetting(API_BASE_SETTING),
  ])
  if (!apiKey && !apiBase) throw new MissingApiKeyError()

  // Direct to Anthropic by default; to the proxy endpoint when one is set.
  const endpoint = apiBase || ENDPOINT
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'anthropic-version': ANTHROPIC_VERSION,
    'anthropic-dangerous-direct-browser-access': 'true',
  }
  // Omit the key in proxy mode — the Worker injects it server-side.
  if (apiKey) headers['x-api-key'] = apiKey

  let res: Response
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages,
      }),
    })
  } catch {
    // Network failure or (unexpectedly) a CORS wall.
    throw new AnthropicError(
      "Couldn't reach Anthropic. Check your connection and try again.",
    )
  }

  if (!res.ok) {
    let apiMessage: string | undefined
    try {
      const body = await res.json()
      apiMessage = body?.error?.message
    } catch {
      // ignore — fall back to a status-only message
    }
    throw new AnthropicError(friendlyError(res.status, apiMessage), res.status)
  }

  const body = await res.json()

  // Record token usage (bucketed kind:model). Best-effort — proxy/local
  // endpoints may omit `usage`, so skip silently when it's absent.
  const u = body?.usage
  if (u && typeof u.input_tokens === 'number' && typeof u.output_tokens === 'number') {
    void recordUsage({
      kind,
      model,
      inputTokens: u.input_tokens,
      outputTokens: u.output_tokens,
    })
  }

  const text: string = (body?.content ?? [])
    .filter((b: { type?: string }) => b?.type === 'text')
    .map((b: { text?: string }) => b.text ?? '')
    .join('')
    .trim()
  return text
}
