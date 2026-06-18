// Browser-environment detection + "open in a real browser" helpers. Pure and
// UA-injectable so it's testable and reusable: the magic-link onboarding flow
// layers its key-carrying escape on top of openInRealBrowser(url). NO API-key or
// onboarding logic lives here — detection + open primitives only.

export type Platform = 'ios' | 'android' | 'other'

export type BrowserEnv = {
  platform: Platform
  /** Installed PWA (home-screen / standalone display-mode) — a real engine. */
  standalone: boolean
  /** Inside a chat-app / social in-app browser (memory-tight, flaky). */
  inAppBrowser: boolean
  /** Best-guess host app name when known (e.g. "Instagram"), for the copy. */
  appName?: string
}

// High-precision in-app-browser UA tokens -> friendly app name.
const APP_TOKENS: { re: RegExp; name: string }[] = [
  { re: /Instagram/i, name: 'Instagram' },
  { re: /Messenger/i, name: 'Messenger' },
  { re: /FBAN|FBAV|FB_IAB|FBIOS|FB4A/i, name: 'Facebook' },
  { re: /\bLine\//i, name: 'LINE' },
  { re: /Snapchat/i, name: 'Snapchat' },
  { re: /musical_ly|Bytedance|TikTok/i, name: 'TikTok' },
  { re: /Pinterest/i, name: 'Pinterest' },
  { re: /LinkedInApp/i, name: 'LinkedIn' },
  { re: /\bGSA\//i, name: 'the Google app' },
  { re: /Twitter/i, name: 'X' },
]

function platformOf(ua: string): Platform {
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'other'
}

/**
 * Detect the browser environment. Pure: pass a UA string in tests; defaults to
 * the live `navigator.userAgent`. `standalone` consults the display-mode media
 * query and iOS `navigator.standalone` (both guarded).
 */
export function detectEnv(
  ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : '',
): BrowserEnv {
  const platform = platformOf(ua)
  const standalone = isStandalone()

  let appName: string | undefined
  for (const { re, name } of APP_TOKENS) {
    if (re.test(ua)) {
      appName = name
      break
    }
  }

  // Android in-app webviews almost always carry "; wv" in the UA.
  const androidWebView = platform === 'android' && /;\s*wv\b/i.test(ua)

  // iOS in-app webviews (WKWebView) lack the "Safari"/"CriOS"/"FxiOS" tokens
  // that real Safari and real Chrome/Firefox-for-iOS carry. (SFSafariViewController
  // keeps "Safari" and is a real engine, so it's correctly NOT flagged.)
  const iosWebView =
    platform === 'ios' &&
    !standalone &&
    !/Safari/i.test(ua) &&
    !/CriOS|FxiOS|EdgiOS/i.test(ua)

  const inAppBrowser =
    !standalone && (Boolean(appName) || androidWebView || iosWebView)

  return { platform, standalone, inAppBrowser, appName }
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (window.matchMedia?.('(display-mode: standalone)').matches) return true
  } catch {
    // matchMedia unavailable — ignore.
  }
  const nav = navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true
}

/** The link to hand to a real browser (default = the current page). */
function currentUrl(): string {
  return typeof location !== 'undefined' ? location.href : ''
}

/**
 * Best-effort "escape this in-app browser into the real one", carrying `url`
 * (default = current location, so the magic-link flow can pass its key-bearing
 * link). iOS uses the `x-safari-https://` scheme to break into Safari (carries
 * the #fragment); Android fires a Chrome intent. Returns false if we couldn't
 * even attempt it — the caller should then fall back to copyLink + instructions.
 */
export function openInRealBrowser(url: string = currentUrl()): boolean {
  if (!url) return false
  const platform = platformOf(
    typeof navigator !== 'undefined' ? navigator.userAgent : '',
  )
  try {
    if (platform === 'ios') {
      // Forces Safari even when Chrome is the default; carries the #fragment.
      location.href = 'x-safari-' + url
      return true
    }
    if (platform === 'android') {
      const noScheme = url.replace(/^https?:\/\//, '')
      location.href =
        `intent://${noScheme}#Intent;scheme=https;` +
        `package=com.android.chrome;end`
      return true
    }
  } catch {
    // Navigation blocked — fall back to copy.
  }
  return false
}

/** Copy `url` (default = current location) to the clipboard. */
export async function copyLink(url: string = currentUrl()): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url)
    return true
  } catch {
    return false
  }
}
