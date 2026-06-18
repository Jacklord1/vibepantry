/**
 * Magic-link parsing for the F&F API-key installer (receiving end only).
 *
 * Link format (LOCKED — must match the generator exactly):
 *   https://<domain>/app#k=<BASE64_KEY>&t=<UNIX_SECONDS>
 *
 *   k  the Anthropic key, base64-encoded with standard btoa/atob. This is
 *      OBFUSCATION, NOT encryption — it is fully reversible by anyone holding
 *      the link. It only stops the raw `sk-ant-…` being glanceable in the link
 *      text. Do not mistake it for security. The key's real safety comes from
 *      being per-person, spend-capped, and deletable.
 *   t  optional unix-SECONDS timestamp. Used only for a 24h staleness check —
 *      a UX speed bump so an old forwarded link doesn't silently auto-install.
 *      It does NOT protect the key in the link text; it's not security.
 *
 * The fragment (#…) is deliberate: fragments never leave the browser, so the
 * key never reaches the server / Cloudflare / access logs. Never move k/t to a
 * query string (?…).
 *
 * Nothing in this module logs k, t, the encoded value, or the decoded key.
 */

/** Raw, undecoded params pulled from a launch hash. */
export type MagicParams = { k: string | null; t: string | null }

/**
 * Parse a launch hash by hand.
 *
 * Deliberately NOT URLSearchParams: standard base64 contains `+`, and
 * URLSearchParams (x-www-form-urlencoded semantics) maps `+` to a space, which
 * silently corrupts the key. Also NOT decodeURIComponent: the value isn't
 * percent-encoded, and a bare `+`/`%` would mislead or throw.
 *
 * Strip a single leading `#`, split on `&`, and for the first `k=`/`t=` segment
 * take everything after the prefix (so base64 `=` padding inside the value
 * survives). Empty value -> null. Missing/malformed -> nulls.
 */
export function parseLaunchHash(hash: string): MagicParams {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  let k: string | null = null
  let t: string | null = null
  for (const seg of raw.split('&')) {
    if (k === null && seg.startsWith('k=')) {
      const v = seg.slice(2)
      if (v) k = v
    } else if (t === null && seg.startsWith('t=')) {
      const v = seg.slice(2)
      if (v) t = v
    }
  }
  return { k, t }
}

/**
 * Reverse the btoa obfuscation. Returns the decoded string, or null if atob
 * throws (malformed base64). Never throws; never logs.
 *
 * Note: atob yields a Latin1 string. Anthropic keys are ASCII, so this is fine;
 * any non-decodable input is swallowed and treated as an incomplete link.
 */
export function decodeKey(encoded: string): string | null {
  try {
    return atob(encoded)
  } catch {
    return null
  }
}

/**
 * Lenient plausibility check — just enough to reject decode garbage, not a real
 * format validator. Per the spec the checkpoint installs base64 of a value like
 * "TESTKEY123", so we must NOT require an `sk-ant-` prefix. Accept any string of
 * length >= 8 made of printable, non-space ASCII (0x21–0x7E).
 */
export function isPlausibleKey(value: string): boolean {
  return value.length >= 8 && /^[\x21-\x7E]+$/.test(value)
}

/** Twenty-four hours, in seconds. */
export const STALE_AFTER_SECONDS = 24 * 60 * 60

/**
 * Staleness check (speed bump, not security). Stale only when `t` is present,
 * numeric, and older than 24h. Missing / blank / non-numeric `t` is treated as
 * NOT stale, because `t` is optional. `nowSeconds` is injectable for tests.
 */
export function isStale(
  t: string | null,
  nowSeconds: number = Date.now() / 1000,
): boolean {
  if (t === null) return false
  const ts = Number(t)
  if (!Number.isFinite(ts)) return false
  return nowSeconds - ts > STALE_AFTER_SECONDS
}
