import type { ScheduleDto } from '../../../api/attendance'

export const WEEKDAY_LABELS = ['Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy', 'Chủ nhật']
export const MONTHS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']

/** Mon-first weekday pills: { label, value } where value is ISO-8601 weekday (1=Mon..7=Sun), matching the backend. */
export const WEEKDAY_PILLS = [
  { label: 'Thứ 2', value: 1 },
  { label: 'Thứ 3', value: 2 },
  { label: 'Thứ 4', value: 3 },
  { label: 'Thứ 5', value: 4 },
  { label: 'Thứ 6', value: 5 },
  { label: 'Thứ 7', value: 6 },
  { label: 'Chủ nhật', value: 7 },
]

export const stripTime = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
export const addDays = (d: Date, n: number) => { const r = stripTime(d); r.setDate(r.getDate() + n); return r }
export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

export const toYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const parseYMD = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** ISO-8601 weekday (1=Mon..7=Sun), matching java.time.DayOfWeek#getValue() on the backend. */
export const isoWeekday = (d: Date) => (d.getDay() === 0 ? 7 : d.getDay())

/** Monday-first start of week containing `d`. */
export const startOfWeek = (d: Date) => {
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  return addDays(d, diff)
}

export const weekDays = (weekStart: Date) => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

/** 1-indexed ordinal of the week within its month, based on the day-of-month of the (Monday) week start. */
export const weekOfMonth = (weekStart: Date) => Math.ceil(weekStart.getDate() / 7)

/** Backend LocalTime serializes as 'HH:mm:ss' — trim to 'HH:mm' for display. */
export const formatTime = (t: string | null | undefined) => (t ? t.slice(0, 5) : '')

/**
 * Schedules are already materialized one row per occurrence (BR-AT-04) — no client-side
 * recurrence expansion needed, just a direct employeeId + date match.
 */
export const entriesOn = (schedules: ScheduleDto[], employeeId: string, date: Date) =>
  schedules.filter(s => s.employeeId === employeeId && s.workDate === toYMD(date))
