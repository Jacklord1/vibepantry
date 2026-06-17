# Changelog

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
