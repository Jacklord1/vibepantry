import type { PantryItem } from '../types'

// Expiry / use-soon helpers. Items carry an optional ISO date (`expiry`); these
// turn that into "days left" + an urgency state for the pantry's Use-soon view.

export type Urgency = 'fresh' | 'soon' | 'urgent' | 'expired'

/** Whole days from today to the ISO date (negative = already past). */
export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - today.getTime()) / 86_400_000)
}

/**
 * Urgency for the Use-soon view. Returns null for items with no expiry or
 * more than a week out (they don't need surfacing yet).
 */
export function urgencyOf(days: number | null): Urgency | null {
  if (days === null) return null
  if (days < 0) return 'expired'
  if (days <= 1) return 'urgent'
  if (days <= 3) return 'soon'
  if (days <= 7) return 'fresh'
  return null
}

export function expiryLabel(days: number): string {
  if (days < 0) return days === -1 ? 'yesterday' : `${-days} days ago`
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  return `in ${days} days`
}

export type UseSoonItem = {
  item: PantryItem
  days: number
  urgency: Urgency
}

/** Confirmed items expiring within a week (or already past), soonest first. */
export function expiringItems(items: PantryItem[]): UseSoonItem[] {
  const out: UseSoonItem[] = []
  for (const item of items) {
    const days = daysUntil(item.expiry)
    const urgency = urgencyOf(days)
    if (days === null || urgency === null) continue
    out.push({ item, days, urgency })
  }
  return out.sort((a, b) => a.days - b.days)
}

/** Items expiring within 3 days (or past) — drives the reminder banner. */
export function expiringSoonCount(items: PantryItem[]): number {
  return expiringItems(items).filter((u) => u.days <= 3).length
}
