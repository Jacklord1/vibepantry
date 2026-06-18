# Changelog

## [feature/mobile-gui-polish] - 2026-06-18
- Mobile-first GUI polish pass. Sweats the phone (the primary surface) without regressing the desktop layer or the locked Cookbook theme. E2E + build stay green.
  - **Tooling**: stood up Playwright (390×844 + 360 viewports) — a deterministic smoke suite (the green gate) plus an IndexedDB-seeding screenshot rig for before/after audits.
  - **Snap**: "Take photo" is now a full-width hero with "Choose photos" beneath; the dashed drop-zone + "or drop images here" are gated behind (hover: hover)/(pointer: fine) since phones can't drop files; thumbnail remove (×) target 24→32px.
  - **Cook**: hero chips lifted to a ≥44px tap target; chip/segment hover backgrounds gated to pointer devices so they don't stick after a tap.
  - **Bottom nav**: clearer active tab — accent top bar + semibold label, not colour alone.
  - **Review grid**: category select gains a dropdown chevron (was a bare box); per-row delete 38→44px.
  - **Pantry**: always-visible card edit/delete grown 38→44px.
  - **Tap feedback**: :active press states across every primary CTA (snap, cook, pantry, review, recipe, settings, form) — taps now respond on touch where :hover is a no-op. Honour prefers-reduced-motion via the global reset.
  - Branch: `feature/mobile-gui-polish`

## [feature/responsive-desktop-layout] - 2026-06-17
- Fix: item card top/bottom-right corners going square on hover — clip the card to its border-radius on desktop so the absolutely-positioned action scrim can't overpaint the rounded corners.

## [feature/responsive-desktop-layout] - 2026-06-17
- Frosted the desktop sticky header to match the bottom nav (semi-transparent `bg-elev` + `blur(10px)`), so the grid blurs softly underneath and the top/bottom bars read as a matched pair.
- Branch: `feature/responsive-desktop-layout`

## [feature/responsive-desktop-layout] - 2026-06-17
- Polish pass. Item and recipe cards lift on hover (desktop pointer devices only) for tactile feedback. The home wordmark renders "Vibe" with an amber "Pantry" (PageHeader's title now accepts rich content). The pantry header (wordmark + Cook/Snap actions) sticks to the top on desktop so the brand and actions stay reachable down a long grid; mobile stays static.
- Branch: `feature/responsive-desktop-layout`

## [feature/responsive-desktop-layout] - 2026-06-17
- Live search/filter for the pantry. A search box live-filters items by name or quantity; empty categories drop out and per-category counts reflect matches. Includes a clear (×) button, a "no matches" state, and hides the Use Soon banner/list while a search is active for a focused find mode. Desktop caps the field at 420px (left-aligned); mobile is full-width.
- Branch: `feature/responsive-desktop-layout`

## [feature/responsive-desktop-layout] - 2026-06-17
- Desktop design pass. Pantry items flow into a responsive multi-column grid; grid pages (Pantry, Cook options) use a wider 1040px canvas while flow pages keep the narrow reading lane. Pantry top becomes a desktop header row (wordmark left, Cook/Snap actions right) and stays stacked full-width on mobile. Item names wrap to two lines instead of clipping; edit/delete icons hover-reveal on desktop pointer devices for full-width names. Cook recipe options show 3-up. Bottom-nav tabs stay centred instead of flinging to the screen edges. Mobile is unchanged — every rule sits behind a `min-width:700px` breakpoint or a `:has()` marker.
- Branch: `feature/responsive-desktop-layout`
