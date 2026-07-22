import type { DashboardGranularity } from '../../api/dashboard'
import type { TableItem } from '../../services/tableService'

// ── Shared period filter ──────────────────────────────────────────────────────

export type PeriodId = 'today' | '7d' | '30d' | 'month'

export interface PeriodOption {
  id: PeriodId
  label: string
}

export const PERIOD_OPTIONS: PeriodOption[] = [
  { id: 'today', label: 'Hôm nay' },
  { id: '7d', label: '7 ngày qua' },
  { id: '30d', label: '30 ngày qua' },
  { id: 'month', label: 'Tháng này' },
]

export interface PeriodRange {
  from: string // ISO LocalDateTime (server wall-clock), e.g. '2026-07-22T00:00:00'
  to: string
  granularity: DashboardGranularity
}

export interface ResolvedPeriod {
  id: PeriodId
  label: string
  current: PeriodRange
  /** The immediately preceding, equal-length window — for accurate trend comparison. */
  previous: PeriodRange
}

// Format a Date as a backend LocalDateTime string in LOCAL wall-clock (never UTC — toISOString()
// would shift the day boundary). Single-restaurant deployment ⇒ client and server share a zone.
const pad = (n: number) => String(n).padStart(2, '0')
const fmtLocal = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0)
const addDays = (d: Date, days: number) => {
  const r = new Date(d)
  r.setDate(r.getDate() + days)
  return r
}
// The backend's findSettledPaidBetween(from, to) is half-open on paidAt (`>= from AND < to`),
// which can carry sub-second precision. An upper bound of "23:59:59" would silently omit a
// transaction settled at, say, 23:59:59.4 — so "end of day" is always the *start of the next*
// calendar day instead: every instant of the intended day is `< to` with no truncation, and
// the boundary instant itself (exactly next midnight) correctly belongs to the next day.
const startOfNextDay = (d: Date) => addDays(startOfDay(d), 1)

/** Resolves a period id to concrete [from, to] windows (current + previous) and bucket width. */
export const resolvePeriod = (id: PeriodId, now: Date = new Date()): ResolvedPeriod => {
  const today = startOfDay(now)
  const label = PERIOD_OPTIONS.find(p => p.id === id)?.label ?? ''

  if (id === 'today') {
    const from = today
    const to = startOfNextDay(now)
    const prevFrom = addDays(today, -1)
    return {
      id,
      label,
      current: { from: fmtLocal(from), to: fmtLocal(to), granularity: 'HOUR' },
      previous: { from: fmtLocal(prevFrom), to: fmtLocal(startOfNextDay(prevFrom)), granularity: 'HOUR' },
    }
  }

  if (id === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
    const to = startOfNextDay(now)
    // "Tháng này" is month-to-date (1..today), not necessarily a full month — so the previous
    // window must be the same NUMBER of days immediately before `from`, not "the full previous
    // calendar month" (which would almost always be a different length and make the trend %
    // compare unequal spans).
    const daysElapsed = Math.round((to.getTime() - from.getTime()) / 86_400_000)
    const prevTo = from
    const prevFrom = addDays(from, -daysElapsed)
    return {
      id,
      label,
      current: { from: fmtLocal(from), to: fmtLocal(to), granularity: 'DAY' },
      previous: { from: fmtLocal(prevFrom), to: fmtLocal(prevTo), granularity: 'DAY' },
    }
  }

  // Rolling N-day windows (7d / 30d), inclusive of today.
  const days = id === '7d' ? 7 : 30
  const from = addDays(today, -(days - 1))
  const to = startOfNextDay(now)
  const prevTo = addDays(from, -1)
  const prevFrom = addDays(prevTo, -(days - 1))
  return {
    id,
    label,
    current: { from: fmtLocal(from), to: fmtLocal(to), granularity: 'DAY' },
    previous: { from: fmtLocal(startOfDay(prevFrom)), to: fmtLocal(startOfNextDay(prevTo)), granularity: 'DAY' },
  }
}

// ── Formatting ────────────────────────────────────────────────────────────────

/** Vietnamese thousands separators, no decimals. Guards NaN/Infinity/null → '0'. */
export const fmtInt = (n: number | null | undefined): string => {
  if (n == null || !Number.isFinite(n)) return '0'
  return Math.round(n).toLocaleString('vi-VN')
}

/** Currency with the ₫ symbol. */
export const fmtCurrency = (n: number | null | undefined): string => `${fmtInt(n)} ₫`

/** Safe percentage (0 decimals by default). Guards divide-by-zero and non-finite input. */
export const fmtPercent = (value: number | null | undefined, digits = 0): string => {
  if (value == null || !Number.isFinite(value)) return '0%'
  return `${value.toFixed(digits)}%`
}

/** Signed trend %, or null when the baseline is 0/absent (so we never show a fake ∞/100% jump). */
export const trendPct = (current: number, previous: number): number | null => {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return null
  return ((current - previous) / previous) * 100
}

/** Formats a revenue-series bucket for the chart axis/tooltip. */
export const fmtBucketLabel = (iso: string, granularity: DashboardGranularity): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  if (granularity === 'HOUR') return `${pad(d.getHours())}:00`
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`
}

// ── Live table occupancy (point-in-time, derived from the tables listing) ──────

export interface TableStats {
  active: number
  available: number
  occupied: number
  billing: number
  reserved: number
  /** Tables actively serving a guest (OCCUPIED or BILLING). */
  inUse: number
  occupancyPct: number
}

/**
 * Counts only ACTIVE tables — archived/disabled tables never skew occupancy.
 * BILLING/CLEANING exist as TableStatus values but no cashier flow ever sets them today
 * (paying an invoice jumps a table straight OCCUPIED -> AVAILABLE); billing is still counted
 * here (folded into inUse) for whenever that transition is wired up, but a standalone
 * "cleaning" bucket is intentionally not exposed since it would always read 0.
 */
export const computeTableStats = (tables: TableItem[]): TableStats => {
  const active = tables.filter(t => t.active)
  const count = (status: string) => active.filter(t => t.status === status).length
  const occupied = count('OCCUPIED')
  const billing = count('BILLING')
  const inUse = occupied + billing
  return {
    active: active.length,
    available: count('AVAILABLE'),
    occupied,
    billing,
    reserved: count('RESERVED'),
    inUse,
    occupancyPct: active.length > 0 ? (inUse / active.length) * 100 : 0,
  }
}
