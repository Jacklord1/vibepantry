import { getSetting, setSetting, deleteSetting } from '../db'

// Per-call token-usage logging. Captures what each Anthropic call costs, split by
// call type + model, so vision (Sonnet) vs recipe cost can be compared — the one
// breakdown the Anthropic Console can't give, since both calls hit the same model
// on the same endpoint. Purely local: rides the existing `settings` store, never
// leaves the browser, and can never break an API call.

export type UsageKind = 'vision' | 'recipe'

/** All calls of one kind made against one model. */
export type UsageBucket = {
  kind: UsageKind
  model: string
  calls: number
  inputTokens: number
  outputTokens: number
}

/** Persisted under settings['usage']. Buckets keyed by `${kind}:${model}`. */
export type UsageLog = {
  version: 1
  buckets: Record<string, UsageBucket>
}

const USAGE_SETTING = 'usage'

/** USD per million tokens (list pricing). Haiku pre-loaded for a future switch. */
export const PRICING: Record<string, { inPerM: number; outPerM: number }> = {
  'claude-sonnet-4-6': { inPerM: 3, outPerM: 15 },
  'claude-haiku-4-5': { inPerM: 1, outPerM: 5 },
}

/** Estimated USD for a bucket. 0 for an unpriced model (e.g. a proxy's own id). */
export function estimateUsd(b: UsageBucket): number {
  const p = PRICING[b.model]
  if (!p) return 0
  return (b.inputTokens / 1e6) * p.inPerM + (b.outputTokens / 1e6) * p.outPerM
}

function emptyLog(): UsageLog {
  return { version: 1, buckets: {} }
}

/** Read the usage blob. Returns an empty log on missing or corrupt data. */
export async function getUsageLog(): Promise<UsageLog> {
  const raw = await getSetting(USAGE_SETTING)
  if (!raw) return emptyLog()
  try {
    const parsed = JSON.parse(raw) as UsageLog
    if (parsed?.version === 1 && parsed.buckets) return parsed
  } catch {
    // corrupt blob — fall through to empty
  }
  return emptyLog()
}

/**
 * Record one call's token usage, bucketed by kind:model. Best-effort and fully
 * swallowed — usage logging must NEVER throw into the API call path.
 */
export async function recordUsage(entry: {
  kind: UsageKind
  model: string
  inputTokens: number
  outputTokens: number
}): Promise<void> {
  try {
    const log = await getUsageLog()
    const key = `${entry.kind}:${entry.model}`
    const b = log.buckets[key] ?? {
      kind: entry.kind,
      model: entry.model,
      calls: 0,
      inputTokens: 0,
      outputTokens: 0,
    }
    b.calls += 1
    b.inputTokens += entry.inputTokens
    b.outputTokens += entry.outputTokens
    log.buckets[key] = b
    await setSetting(USAGE_SETTING, JSON.stringify(log))
  } catch {
    // ignore — never break a real call over a usage write
  }
}

/** Clear all recorded usage. */
export async function resetUsage(): Promise<void> {
  await deleteSetting(USAGE_SETTING)
}
