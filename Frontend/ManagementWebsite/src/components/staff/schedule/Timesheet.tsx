import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  AttendanceSettingsDto, AttendanceSummaryRowDto, AttendanceType,
  ShiftDto, TimesheetCellDto, TimesheetStatus, ViolationTypeDto,
} from '../../../api/attendance'
import {
  ATTENDANCE_TYPE_LABEL, createSchedules, createViolationType, deleteRecord, formatTime, getSettings, getSummary,
  getTimesheet, listShifts, listViolationTypes, saveViolations,
  TIMESHEET_STATUS_COLOR, TIMESHEET_STATUS_LABEL, upsertRecord,
} from '../../../api/attendance'
import { listEmployees } from '../../../api/employees'
import { ApiError } from '../../../services/api'
import ShiftTemplateModal from './ShiftTemplateModal'

/* ─────────────────────────────────────────────────────────────────────────────
 * Bảng chấm công (Timesheet) — faithful re-creation of the KiotViet screen,
 * wired to the real UC-AT-03/04/06/07 API. "Đổi ca" (shift-swap) stayed out
 * of SRS_AT scope and was removed; bulk/merged marking remain backend-only
 * capabilities not yet exposed by this grid (single-cell marking only).
 * ──────────────────────────────────────────────────────────────────────────── */

interface EmployeeSummary { id: string; name: string; code: string }

const WEEKDAY_FULL = ['Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy', 'Chủ nhật']
const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'] // indexed by getDay()

const LEGEND: TimesheetStatus[] = ['ON_TIME', 'LATE_EARLY', 'MISSING', 'UNMARKED', 'OFF']

/* ── date helpers ──────────────────────────────────────────────────────────── */
const stripTime = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d: Date, n: number) => { const r = stripTime(d); r.setDate(r.getDate() + n); return r }
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const toYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const startOfWeek = (d: Date) => { const day = d.getDay(); return addDays(d, (day === 0 ? -6 : 1) - day) }
const weekOfMonth = (d: Date) => Math.ceil(d.getDate() / 7)
const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()

/* ── tiny icons ────────────────────────────────────────────────────────────── */
const ChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-ink-muted shrink-0">
    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const ChevronL = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
const ChevronR = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
const CheckCircle = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
    <circle cx="12" cy="12" r="10" fill={color} />
    <path d="M7.5 12.4l3 3 6-6.4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const CalIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
)
const ClockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
)
const NoteIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
)
const InfoIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted shrink-0"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
)
const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
)
const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
)

const fullDateLabel = (d: Date) => {
  const sh = WEEKDAY_SHORT[d.getDay()]
  const wd = sh === 'CN' ? 'Chủ nhật' : `Thứ ${sh.slice(1)}`
  return `${wd}, ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

type PeriodMode = 'week' | 'day' | 'month'

/* ── status → card classes ─────────────────────────────────────────────────── */
const cardStyle = (status: TimesheetStatus) => {
  switch (status) {
    case 'UNMARKED': return 'bg-warning-50 text-warning-700'
    case 'OFF': return 'bg-fill text-ink-subtle'
    case 'SCHEDULED': return 'bg-fill text-ink'
    // ON_TIME / LATE_EARLY / MISSING: a record has been saved for this cell.
    default: return 'bg-primary-25 text-ink'
  }
}

/** displayStatus collapses LEAVE_APPROVED/LEAVE_UNAPPROVED into the generic OFF status —
 * prefer the record's own type label so approved/unapproved leave reads distinctly. */
const cellStatusLabel = (c: TimesheetCellDto) =>
  c.record && c.record.type !== 'PRESENT' ? ATTENDANCE_TYPE_LABEL[c.record.type] : TIMESHEET_STATUS_LABEL[c.displayStatus]

/* ─────────────────────────────────────────────────────────────────────────────
 * Chấm công modal — opens when a shift assignment card is clicked.
 * Tabs: "Chấm công", "Lịch sử chấm công" (placeholder) and "Phạt vi phạm".
 * ──────────────────────────────────────────────────────────────────────────── */
const ModalField = ({ label, info, align = 'center', children }: { label: string; info?: boolean; align?: 'center' | 'top'; children: React.ReactNode }) => (
  <div className={`flex ${align === 'top' ? 'items-start' : 'items-center'} gap-6 py-2`}>
    <label className={`w-[8rem] shrink-0 flex items-center gap-1 text-md text-ink ${align === 'top' ? 'pt-2' : ''}`}>{label}{info && <InfoIcon />}</label>
    <div className="flex-1 min-w-0 max-w-[38rem]">{children}</div>
  </div>
)

/* 00:00 → 23:45 in 15-minute steps */
const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => `${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`)

const TimePicker = ({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    if (open && listRef.current) {
      const sel = listRef.current.querySelector('[data-selected="true"]') as HTMLElement | null
      sel?.scrollIntoView({ block: 'center' })
    }
  }, [open])

  return (
    <div ref={ref} className="relative w-[12rem]">
      <input
        type="text"
        value={value}
        disabled={disabled}
        placeholder="--:--"
        onChange={e => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        className="w-full h-10 pl-3 pr-9 bg-card border border-line-default rounded-md text-md text-ink placeholder:text-ink-muted disabled:opacity-70 disabled:cursor-not-allowed focus:border-primary outline-none"
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Chọn giờ"
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted disabled:cursor-not-allowed cursor-pointer"
      >
        <ClockIcon />
      </button>
      {open && !disabled && (
        <div ref={listRef} className="absolute left-0 top-[calc(100%+0.3rem)] w-full max-h-[15rem] overflow-y-auto bg-card border border-line-default rounded-md shadow-md z-[var(--kv-z-dropdown)] py-1">
          {TIME_OPTIONS.map(t => (
            <button key={t} type="button" data-selected={t === value} onClick={() => { onChange(t); setOpen(false) }}
              className={`block w-full text-left px-4 py-2 text-md cursor-pointer hover:bg-[var(--kv-state-hover-bg)] ${t === value ? 'text-primary font-semibold bg-primary-25' : 'text-ink'}`}>
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** 'dd/mm/yyyy'-style full weekday label, e.g. "Thứ 3, 21/07/2026" — matches the dropdown option style. */
const dateOptionLabel = (ymd: string) => {
  const d = new Date(`${ymd}T00:00:00`)
  const sh = WEEKDAY_SHORT[d.getDay()]
  const wd = sh === 'CN' ? 'Chủ nhật' : `Thứ ${sh.slice(1)}`
  return `${wd}, ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}
const nextYMD = (ymd: string) => toYMD(addDays(new Date(`${ymd}T00:00:00`), 1))

/** Pins a Vào/Ra side to the schedule's work date or the day after (overnight shifts). */
const DateSelect = ({ value, options, onChange, disabled }: { value: string; options: string[]; onChange: (v: string) => void; disabled?: boolean }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} className="relative w-[20rem]">
      <button type="button" disabled={disabled} onClick={() => !disabled && setOpen(o => !o)}
        className="flex items-center justify-between gap-2 w-full h-10 px-3 bg-card border border-line-default rounded-md text-md text-ink disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer focus:border-primary outline-none">
        <span className="truncate">{dateOptionLabel(value)}</span>
        <ChevronDown />
      </button>
      {open && !disabled && (
        <div className="absolute left-0 top-[calc(100%+0.3rem)] w-full bg-card border border-line-default rounded-md shadow-md z-[var(--kv-z-dropdown)] py-1">
          {options.map(o => (
            <button key={o} type="button" onClick={() => { onChange(o); setOpen(false) }}
              className={`flex items-center justify-between w-full text-left px-4 py-2 text-md cursor-pointer hover:bg-[var(--kv-state-hover-bg)] ${o === value ? 'text-primary font-semibold bg-primary-25' : 'text-ink'}`}>
              {dateOptionLabel(o)}
              {o === value && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0"><polyline points="20 6 9 17 4 12" /></svg>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const TimeRow = ({ label, on, setOn, time, setTime, dateNode, right }: { label: string; on: boolean; setOn: (v: boolean) => void; time: string; setTime: (v: string) => void; dateNode?: React.ReactNode; right?: React.ReactNode }) => (
  <div className="flex items-center gap-6 flex-wrap">
    <label className="w-[8rem] shrink-0 flex items-center gap-2 text-md text-ink cursor-pointer">
      <input type="checkbox" checked={on} onChange={e => setOn(e.target.checked)} className="accent-primary w-4 h-4" />
      {label}
    </label>
    <TimePicker value={time} onChange={setTime} disabled={!on} />
    {dateNode}
    {right}
  </div>
)

/* Làm thêm (OT) mini-control shown next to Vào/Ra — live-suggested (BR-AT-10), editable before saving. */
const OtField = ({ on, setOn, hours, setHours, minutes, setMinutes, disabled }: {
  on: boolean; setOn: (v: boolean) => void
  hours: number; setHours: (v: number) => void
  minutes: number; setMinutes: (v: number) => void
  disabled?: boolean
}) => (
  <label className="flex items-center gap-2 text-md text-ink cursor-pointer">
    <input type="checkbox" checked={on} disabled={disabled} onChange={e => setOn(e.target.checked)} className="accent-primary w-4 h-4" />
    Làm thêm
    <input type="text" inputMode="numeric" value={hours} disabled={!on || disabled}
      onChange={e => setHours(Math.max(0, parseInt(e.target.value.replace(/\D/g, '') || '0', 10)))}
      className="w-14 h-9 text-center bg-card border border-line-default rounded-md text-md text-ink disabled:opacity-60 disabled:bg-fill focus:border-primary outline-none" />
    <span className="text-sm text-ink-subtle">giờ</span>
    <input type="text" inputMode="numeric" value={minutes} disabled={!on || disabled}
      onChange={e => setMinutes(Math.min(59, Math.max(0, parseInt(e.target.value.replace(/\D/g, '') || '0', 10))))}
      className="w-14 h-9 text-center bg-card border border-line-default rounded-md text-md text-ink disabled:opacity-60 disabled:bg-fill focus:border-primary outline-none" />
    <span className="text-sm text-ink-subtle">phút</span>
  </label>
)

const isValidTime = (t: string) => /^\d{2}:\d{2}$/.test(t)
const timeToMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }

/** Scheduled shift end expressed in minutes since the shift's own work-date midnight (BR-AT-09/10 anchor). */
const shiftEndMinutes = (shiftStart: string, shiftEnd: string) => {
  const startMin = timeToMin(formatTime(shiftStart))
  const endMin = timeToMin(formatTime(shiftEnd))
  return endMin <= startMin ? endMin + 24 * 60 : endMin // overnight shift ends the next day
}

/**
 * Whichever of "same day as workDate" (offset 0) / "the day after" (offset 1) — the only two
 * days the Vào/Ra date picker offers — puts `time` closest to `anchorMin` (minutes since
 * workDate midnight). Used to auto-follow the date whenever the time is edited, so typing
 * "00:00" for a shift starting at 23:30 lands on the day after (30p muộn) instead of 23h30
 * "sooner" on the same day.
 */
const closestDayOffset = (time: string, anchorMin: number): 0 | 1 => {
  const raw = timeToMin(time)
  return Math.abs(raw + 24 * 60 - anchorMin) < Math.abs(raw - anchorMin) ? 1 : 0
}

/**
 * Mirrors AttendanceCalculator's OT (BR-AT-10) and late/early (BR-AT-09) math for a live
 * preview before saving. Vào can only be early (→ Làm thêm before shift) or late (→ Đi muộn),
 * never both; Ra can only be late (→ Làm thêm after shift) or early (→ Về sớm) — never both.
 * in/outDayOffset (0 = the schedule's own work date, 1 = the day after) come from the actual
 * Vào/Ra date picker, mirroring how the server anchors checkInDate/checkOutDate.
 * (BR-AT-15 half-day suppression of late/early is not mirrored here — it's a preview only,
 * the server always recomputes the authoritative values on save.)
 */
const computeOtLateEarly = (
  shiftStart: string, shiftEnd: string,
  inTime: string, inDayOffset: number, outTime: string, outDayOffset: number,
  settings: AttendanceSettingsDto,
) => {
  const shiftStartMin = timeToMin(formatTime(shiftStart))
  const shiftEndMin = shiftEndMinutes(shiftStart, shiftEnd)
  const inMin = inDayOffset * 24 * 60 + timeToMin(inTime)
  const outMin = outDayOffset * 24 * 60 + timeToMin(outTime)

  const otBeforeRaw = Math.max(0, shiftStartMin - inMin)
  const otAfterRaw = Math.max(0, outMin - shiftEndMin)
  const otBefore = settings.otBeforeEnabled && otBeforeRaw > settings.otBeforeMinMinutes ? otBeforeRaw : 0
  const otAfter = settings.otAfterEnabled && otAfterRaw > settings.otAfterMinMinutes ? otAfterRaw : 0

  const lateRaw = Math.max(0, inMin - shiftStartMin)
  const earlyRaw = Math.max(0, shiftEndMin - outMin)
  const late = settings.lateEnabled && lateRaw > settings.lateGraceMinutes ? lateRaw - settings.lateGraceMinutes : 0
  const early = settings.earlyLeaveEnabled && earlyRaw > settings.earlyLeaveGraceMinutes ? earlyRaw - settings.earlyLeaveGraceMinutes : 0

  return { otBefore, otAfter, isLate: lateRaw > 0, isEarly: earlyRaw > 0, late, early }
}

/** "15p" for minutes-only, "2h" for hours-only, "1h30" when both — matches the app's duration style. */
const fmtOtDuration = (totalMinutes: number) => {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m}p`
  if (m === 0) return `${h}h`
  return `${h}h${String(m).padStart(2, '0')}`
}

/**
 * "Làm thêm TC 15p, Làm thêm SC 2h" summary for the timesheet card. Re-derives the
 * before/after split live from the saved check-in/out vs the shift window (same formula
 * as the marking modal) since attendance_records only stores the combined total.
 */
const cardOtLabel = (c: TimesheetCellDto, settings: AttendanceSettingsDto | null): string | null => {
  if (!settings || !c.record || c.record.type !== 'PRESENT') return null
  if (!c.record.actualCheckIn || !c.record.actualCheckOut || !c.shiftStartTime || !c.shiftEndTime) return null
  const inTime = c.record.actualCheckIn.slice(11, 16)
  const outTime = c.record.actualCheckOut.slice(11, 16)
  if (!isValidTime(inTime) || !isValidTime(outTime)) return null
  const inDayOffset = c.record.actualCheckIn.slice(0, 10) === c.workDate ? 0 : 1
  const outDayOffset = c.record.actualCheckOut.slice(0, 10) === c.workDate ? 0 : 1
  const { otBefore, otAfter } = computeOtLateEarly(c.shiftStartTime, c.shiftEndTime, inTime, inDayOffset, outTime, outDayOffset, settings)
  const parts: string[] = []
  if (otBefore > 0) parts.push(`Làm thêm TC ${fmtOtDuration(otBefore)}`)
  if (otAfter > 0) parts.push(`Làm thêm SC ${fmtOtDuration(otAfter)}`)
  return parts.length ? parts.join(', ') : null
}

/** "Đi muộn 30p, Về sớm 30p" summary for the timesheet card — lateMinutes/earlyLeaveMinutes are already persisted on the record (BR-AT-09), no live recompute needed. */
const cardLateEarlyLabel = (c: TimesheetCellDto): string | null => {
  if (!c.record || c.record.type !== 'PRESENT') return null
  const parts: string[] = []
  if (c.record.lateMinutes > 0) parts.push(`Đi muộn ${fmtOtDuration(c.record.lateMinutes)}`)
  if (c.record.earlyLeaveMinutes > 0) parts.push(`Về sớm ${fmtOtDuration(c.record.earlyLeaveMinutes)}`)
  return parts.length ? parts.join(', ') : null
}

/** Read-only "Đi muộn"/"Về sớm" indicator shown in place of the OT control (BR-AT-09). */
const LateEarlyBadge = ({ label, minutes }: { label: string; minutes: number }) => (
  <span className={`inline-flex items-center h-9 px-3 rounded-md text-md font-medium ${minutes > 0 ? 'bg-danger-50 text-danger' : 'bg-fill text-ink-subtle'}`}>
    {label}{minutes > 0 ? `: ${fmtOtDuration(minutes)}` : ' (trong hạn mức)'}
  </span>
)

/* ── Phạt vi phạm ──────────────────────────────────────────────────────────── */
interface ViolationRow { id: string; typeId: string; count: number; appliedPenalty: number | null }
const uid = () => Math.random().toString(36).slice(2, 9)
/** Comma-groups a raw digit string/number for display in money inputs (e.g. "200000" -> "200,000"). */
const fmtMoney = (raw: string | number) => {
  const digits = String(raw).replace(/\D/g, '')
  return digits ? Number(digits).toLocaleString('en-US') : ''
}
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
)

/* searchable "Chọn vi phạm" dropdown used per violation row */
const ViolationSelect = ({ value, types, onSelect, onAddType }: { value: string; types: ViolationTypeDto[]; onSelect: (id: string) => void; onAddType: () => void }) => {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const selected = types.find(t => t.id === value)
  const filtered = types.filter(t => t.name.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full h-10 pl-3 pr-9 flex items-center bg-card border border-line-default rounded-md text-md text-left cursor-pointer focus:border-primary outline-none">
        <span className={selected ? 'text-ink' : 'text-ink-muted'}>{selected?.name ?? 'Chọn vi phạm'}</span>
      </button>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"><ChevronDown /></span>
      {open && (
        <div className="absolute left-0 top-[calc(100%+0.3rem)] w-full bg-card border border-line-default rounded-md shadow-md z-[var(--kv-z-dropdown)] py-1">
          <div className="px-2 pt-1 pb-2 border-b border-line">
            <div className="relative">
              <input autoFocus value={q} onChange={e => setQ(e.target.value)}
                className="w-full h-9 pl-3 pr-8 bg-card border border-line-default rounded-md text-md text-ink outline-none focus:border-primary" />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"><SearchIcon /></span>
            </div>
          </div>
          <div className="max-h-[12rem] overflow-y-auto py-1">
            {filtered.length === 0
              ? <div className="py-6 text-center text-sm text-ink-muted uppercase tracking-wide">No data found</div>
              : filtered.map(t => (
                <button key={t.id} type="button" onClick={() => { onSelect(t.id); setOpen(false) }}
                  className="block w-full text-left px-3 py-2 text-md text-ink hover:bg-[var(--kv-state-hover-bg)] cursor-pointer">{t.name}</button>
              ))}
          </div>
          <div className="border-t border-line">
            <button type="button" onClick={() => { setOpen(false); onAddType() }}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-md font-medium text-primary hover:bg-primary-25 cursor-pointer">
              <span className="text-lg leading-none">+</span> Thêm loại vi phạm
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* nested "Thêm mới vi phạm" modal */
const AddViolationTypeModal = ({ onClose, onSave }: { onClose: () => void; onSave: (name: string, amount: number) => void }) => {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/50 p-4" onMouseDown={onClose}>
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-[560px]" onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <h2 className="text-xl font-bold text-ink">Thêm mới vi phạm</h2>
          <button onClick={onClose} aria-label="Đóng" className="w-8 h-8 flex items-center justify-center rounded-full text-ink-muted hover:bg-fill hover:text-ink cursor-pointer"><CloseIcon /></button>
        </div>
        <div className="px-6 pb-2 flex flex-col gap-4">
          <div>
            <label className="block text-md text-ink mb-1.5">Tên vi phạm</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full h-10 px-3 bg-card border border-line-default rounded-md text-md text-ink focus:border-primary outline-none" />
          </div>
          <div>
            <label className="block text-md text-ink mb-1.5">Mức áp dụng</label>
            <input value={fmtMoney(amount)} inputMode="numeric" onChange={e => setAmount(e.target.value.replace(/[^\d]/g, ''))}
              className="w-full h-10 px-3 bg-card border border-line-default rounded-md text-md text-ink focus:border-primary outline-none" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4">
          <button onClick={onClose} className="kv-btn kv-btn-outline-neutral h-10 bg-card">Bỏ qua</button>
          <button disabled={!name.trim()} onClick={() => onSave(name.trim(), parseInt(amount || '0', 10))} className="kv-btn kv-btn-primary h-10 disabled:opacity-50">Lưu</button>
        </div>
      </div>
    </div>
  )
}

const AttendanceModal = ({ cell, shifts, employees, settings, vioTypes, onVioTypeAdded, onClose, onSaved }: {
  cell: TimesheetCellDto
  shifts: ShiftDto[]
  employees: EmployeeSummary[]
  settings: AttendanceSettingsDto | null
  vioTypes: ViolationTypeDto[]
  onVioTypeAdded: (t: ViolationTypeDto) => void
  onClose: () => void
  onSaved: () => void
}) => {
  const shift = shifts.find(s => s.id === cell.shiftId)
  const [tab, setTab] = useState<'attn' | 'history' | 'violation'>('attn')
  const [note, setNote] = useState(cell.record?.note ?? '')
  const [mark, setMark] = useState<'work' | 'paid' | 'unpaid'>(
    cell.record?.type === 'LEAVE_APPROVED' ? 'paid' : cell.record?.type === 'LEAVE_UNAPPROVED' ? 'unpaid' : 'work')

  const defaultTimes = () => {
    if (cell.record?.actualCheckIn || cell.record?.actualCheckOut) {
      return {
        in: cell.record.actualCheckIn ? cell.record.actualCheckIn.slice(11, 16) : '',
        out: cell.record.actualCheckOut ? cell.record.actualCheckOut.slice(11, 16) : '',
      }
    }
    if (settings?.manualDefaultTimeMode === 'ACTUAL_TIME') {
      const now = new Date()
      const t = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      return { in: t, out: t }
    }
    return { in: formatTime(shift?.startTime), out: formatTime(shift?.endTime) }
  }
  const initial = defaultTimes()
  const shiftStartTime = shift?.startTime ?? cell.shiftStartTime
  const shiftEndTime = shift?.endTime ?? cell.shiftEndTime
  // Scheduled start/end expressed in minutes since the work date's midnight (end rolls past
  // 24h for overnight shifts) — the anchors the Vào/Ra date auto-follows the typed time against.
  const shiftStartAnchorMin = shiftStartTime ? timeToMin(formatTime(shiftStartTime)) : 0
  const shiftEndAnchorMin = shiftStartTime && shiftEndTime ? shiftEndMinutes(shiftStartTime, shiftEndTime) : 0
  /** Work date, unless `time` sits closer to the day after (e.g. "00:00" for a 23:30 shift start). */
  const autoDate = (time: string, anchorMin: number) =>
    isValidTime(time) && closestDayOffset(time, anchorMin) === 1 ? nextYMD(cell.workDate) : cell.workDate

  const [inOn, setInOn] = useState(true)
  const [outOn, setOutOn] = useState(true)
  const [inTime, setInTime] = useState(initial.in)
  const [outTime, setOutTime] = useState(initial.out)
  // Which calendar day each side belongs to — an already-saved record keeps its real
  // persisted date; a fresh mark auto-follows the typed time (see autoDate above).
  const [inDate, setInDate] = useState(cell.record?.actualCheckIn?.slice(0, 10) ?? autoDate(initial.in, shiftStartAnchorMin))
  const [outDate, setOutDate] = useState(cell.record?.actualCheckOut?.slice(0, 10) ?? autoDate(initial.out, shiftEndAnchorMin))
  const dateOptions = [cell.workDate, nextYMD(cell.workDate)]
  const handleInTimeChange = (t: string) => { setInTime(t); setInDate(autoDate(t, shiftStartAnchorMin)) }
  const handleOutTimeChange = (t: string) => { setOutTime(t); setOutDate(autoDate(t, shiftEndAnchorMin)) }
  const [substitute, setSubstitute] = useState(cell.substituteEmployeeId ?? '')
  const subOptions = employees.filter(e => e.id !== cell.employeeId)

  // Làm thêm (OT) — live-suggested from check-in/out vs shift window (BR-AT-10), editable.
  const [otBeforeOn, setOtBeforeOn] = useState(false)
  const [otBeforeH, setOtBeforeH] = useState(0)
  const [otBeforeM, setOtBeforeM] = useState(0)
  const [otAfterOn, setOtAfterOn] = useState(false)
  const [otAfterH, setOtAfterH] = useState(0)
  const [otAfterM, setOtAfterM] = useState(0)
  // Đi muộn / Về sớm — read-only preview (BR-AT-09); replaces the OT control on that side
  // when the check-in is after the shift start / check-out is before the shift end.
  const [inIsLate, setInIsLate] = useState(false)
  const [outIsEarly, setOutIsEarly] = useState(false)
  const [lateMinutes, setLateMinutes] = useState(0)
  const [earlyMinutes, setEarlyMinutes] = useState(0)

  useEffect(() => {
    if (mark !== 'work' || !settings || !shiftStartTime || !shiftEndTime || !isValidTime(inTime) || !isValidTime(outTime)) return
    const inDayOffset = inDate === cell.workDate ? 0 : 1
    const outDayOffset = outDate === cell.workDate ? 0 : 1
    const { otBefore, otAfter, isLate, isEarly, late, early } =
      computeOtLateEarly(shiftStartTime, shiftEndTime, inTime, inDayOffset, outTime, outDayOffset, settings)
    setOtBeforeOn(otBefore > 0); setOtBeforeH(Math.floor(otBefore / 60)); setOtBeforeM(otBefore % 60)
    setOtAfterOn(otAfter > 0); setOtAfterH(Math.floor(otAfter / 60)); setOtAfterM(otAfter % 60)
    setInIsLate(isLate); setOutIsEarly(isEarly)
    setLateMinutes(late); setEarlyMinutes(early)
  }, [mark, inTime, outTime, inDate, outDate, shiftStartTime, shiftEndTime, settings, cell.workDate])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Phạt vi phạm state — prefilled from the cell's already-loaded violations (no extra fetch).
  const [vioRows, setVioRows] = useState<ViolationRow[]>(() =>
    (cell.violations ?? []).map(v => ({ id: uid(), typeId: v.violationTypeId, count: v.count, appliedPenalty: v.appliedPenalty })))
  const [addTypeForRow, setAddTypeForRow] = useState<string | null>(null)

  const addVioRow = () => setVioRows(rs => [...rs, { id: uid(), typeId: '', count: 1, appliedPenalty: null }])
  const removeVioRow = (id: string) => setVioRows(rs => rs.filter(r => r.id !== id))
  const setVioRow = (id: string, patch: Partial<ViolationRow>) => setVioRows(rs => rs.map(r => r.id === id ? { ...r, ...patch } : r))
  const saveVioType = async (name: string, amount: number) => {
    try {
      const res = await createViolationType(name, amount)
      onVioTypeAdded(res.data.data)
      if (addTypeForRow) setVioRow(addTypeForRow, { typeId: res.data.data.id })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể thêm loại vi phạm.')
    } finally {
      setAddTypeForRow(null)
    }
  }

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      const type: AttendanceType = mark === 'work' ? 'PRESENT' : mark === 'paid' ? 'LEAVE_APPROVED' : 'LEAVE_UNAPPROVED'
      const res = await upsertRecord(cell.scheduleId, {
        type,
        checkInDate: mark === 'work' && inOn && inTime ? inDate : null,
        checkInTime: mark === 'work' && inOn && inTime ? `${inTime}:00` : null,
        checkOutDate: mark === 'work' && outOn && outTime ? outDate : null,
        checkOutTime: mark === 'work' && outOn && outTime ? `${outTime}:00` : null,
        substituteEmployeeId: mark !== 'work' && substitute ? substitute : null,
        note: note.trim() || null,
        otBeforeMinutes: mark === 'work' ? (otBeforeOn ? otBeforeH * 60 + otBeforeM : 0) : null,
        otAfterMinutes: mark === 'work' ? (otAfterOn ? otAfterH * 60 + otAfterM : 0) : null,
      })
      await saveViolations(res.data.data.id, vioRows.filter(r => r.typeId).map(r => ({
        violationTypeId: r.typeId, count: r.count, appliedPenalty: r.appliedPenalty,
      })))
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể lưu chấm công.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!cell.record) { onClose(); return }
    setSaving(true); setError('')
    try {
      await deleteRecord(cell.record.id)
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể hủy chấm công.')
      setSaving(false)
    }
  }

  return (
    <>
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onMouseDown={onClose}>
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-[900px] flex flex-col max-h-[92vh]" onMouseDown={e => e.stopPropagation()}>
        {/* header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-3">
          <div>
            <h2 className="text-xl font-bold text-ink">Chấm công</h2>
            <div className="flex items-center gap-2 mt-2 text-md">
              <span className="text-ink">{cell.employeeName}</span>
              <span className="text-line-strong">|</span>
              <span className="text-ink-subtle">{cell.employeeCode}</span>
              <span className="ml-1 px-2 py-0.5 rounded bg-fill text-ink-subtle text-sm">{cellStatusLabel(cell)}</span>
            </div>
          </div>
          <button onClick={onClose} aria-label="Đóng" className="w-8 h-8 flex items-center justify-center rounded-full text-ink-muted hover:bg-fill hover:text-ink cursor-pointer"><CloseIcon /></button>
        </div>

        {/* body */}
        <div className="px-6">
          <ModalField label="Thời gian"><span className="text-md text-ink">{fullDateLabel(new Date(`${cell.workDate}T00:00:00`))}</span></ModalField>

          <ModalField label="Ca làm việc">
            <span className="text-md text-ink">{shift?.name ?? cell.shiftName} ({formatTime(shift?.startTime ?? cell.shiftStartTime)} - {formatTime(shift?.endTime ?? cell.shiftEndTime)})</span>
          </ModalField>

          <ModalField label="Ghi chú" align="top">
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
              className="w-full p-3 bg-card border border-line-default rounded-md text-md text-ink resize-none focus:border-primary outline-none" />
          </ModalField>

          {/* tabs */}
          <div className="flex items-center gap-7 border-b border-line mt-4">
            {([['attn', 'Chấm công'], ['history', 'Lịch sử chấm công'], ['violation', 'Phạt vi phạm']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} className={`relative pb-3 pt-2 text-md cursor-pointer ${tab === id ? 'text-primary font-semibold' : 'text-ink-subtle hover:text-ink'}`}>
                {label}
                {tab === id && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary rounded-full" />}
              </button>
            ))}
          </div>

          {tab === 'attn' && (
            <div className="py-5 flex flex-col gap-4">
              <div className="flex items-center gap-6">
                <label className="w-[8rem] shrink-0 text-md text-ink">Chấm công</label>
                <div className="flex items-center gap-6 flex-wrap">
                  {([['work', 'Đi làm', false], ['paid', 'Nghỉ có phép', true], ['unpaid', 'Nghỉ không phép', true]] as const).map(([id, label, info]) => (
                    <label key={id} className="flex items-center gap-2 cursor-pointer text-md text-ink">
                      <input type="radio" name="attn-mark" checked={mark === id} onChange={() => setMark(id)} className="accent-primary w-4 h-4" />
                      {label}{info && <InfoIcon />}
                    </label>
                  ))}
                </div>
              </div>
              {mark === 'work' && (
                <>
                  <TimeRow label="Vào" on={inOn} setOn={setInOn} time={inTime} setTime={handleInTimeChange}
                    dateNode={<DateSelect value={inDate} options={dateOptions} onChange={setInDate} disabled={!inOn} />}
                    right={!inOn ? undefined : inIsLate
                      ? <LateEarlyBadge label="Đi muộn" minutes={lateMinutes} />
                      : <OtField on={otBeforeOn} setOn={setOtBeforeOn} hours={otBeforeH} setHours={setOtBeforeH}
                          minutes={otBeforeM} setMinutes={setOtBeforeM} />} />
                  <TimeRow label="Ra" on={outOn} setOn={setOutOn} time={outTime} setTime={handleOutTimeChange}
                    dateNode={<DateSelect value={outDate} options={dateOptions} onChange={setOutDate} disabled={!outOn} />}
                    right={!outOn ? undefined : outIsEarly
                      ? <LateEarlyBadge label="Về sớm" minutes={earlyMinutes} />
                      : <OtField on={otAfterOn} setOn={setOtAfterOn} hours={otAfterH} setHours={setOtAfterH}
                          minutes={otAfterM} setMinutes={setOtAfterM} />} />
                </>
              )}
              {mark !== 'work' && (
                <div className="flex items-center gap-6">
                  <label className="w-[8rem] shrink-0 text-md text-ink">Nhân viên làm thay ca:</label>
                  <div className="relative w-[24rem] max-w-full">
                    <select value={substitute} onChange={e => setSubstitute(e.target.value)}
                      className={`w-full h-10 pl-3 pr-9 bg-card border border-line-default rounded-md text-md appearance-none cursor-pointer focus:border-primary outline-none ${substitute ? 'text-ink' : 'text-ink-muted'}`}>
                      <option value="">Không chỉ định</option>
                      {subOptions.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"><ChevronDown /></span>
                  </div>
                </div>
              )}
            </div>
          )}
          {tab === 'history' && (
            <div className="py-5">
              <div className="grid grid-cols-4 bg-fill rounded-md px-4 py-2.5 text-sm font-semibold text-ink-subtle">
                <span>Thời gian</span><span>Trạng thái</span><span>Hình thức</span><span>Nội dung</span>
              </div>
              {cell.record ? (
                <div className="grid grid-cols-4 px-4 py-3 text-md text-ink border-b border-line">
                  <span>{cell.record.actualCheckIn ? `${cell.record.actualCheckIn.slice(11, 16)} - ${cell.record.actualCheckOut?.slice(11, 16) ?? '--'}` : '-'}</span>
                  <span>{cellStatusLabel(cell)}</span>
                  <span>{ATTENDANCE_TYPE_LABEL[cell.record.type]}</span>
                  <span>{[cell.record.note, ...(cell.violations ?? []).map(v => `${v.violationTypeName} x${v.count}`)].filter(Boolean).join(', ') || '-'}</span>
                </div>
              ) : (
                <div className="py-10 text-center text-md text-ink-subtle">Không có kết quả phù hợp</div>
              )}
            </div>
          )}
          {tab === 'violation' && (
            <div className="py-5">
              <div className="grid grid-cols-[1fr_5rem_11rem_7rem_2.5rem] gap-3 items-center bg-fill rounded-md px-4 py-2.5 text-sm font-semibold text-ink-subtle">
                <span>Loại vi phạm</span>
                <span className="text-center">Số lần</span>
                <span className="text-center">Mức áp dụng</span>
                <span className="text-right">Thành tiền</span>
                <span />
              </div>
              {vioRows.map(row => {
                const type = vioTypes.find(t => t.id === row.typeId)
                const amount = row.appliedPenalty ?? type?.penaltyAmount ?? 0
                return (
                  <div key={row.id} className="grid grid-cols-[1fr_5rem_11rem_7rem_2.5rem] gap-3 items-center px-4 py-3">
                    <ViolationSelect value={row.typeId} types={vioTypes}
                      onSelect={id => setVioRow(row.id, { typeId: id, appliedPenalty: null })} onAddType={() => setAddTypeForRow(row.id)} />
                    <input type="text" inputMode="numeric" maxLength={2} value={row.count}
                      onChange={e => setVioRow(row.id, { count: Math.min(99, Math.max(1, parseInt(e.target.value.replace(/[^\d]/g, '') || '1', 10))) })}
                      className="h-10 w-full text-center bg-card border border-line-default rounded-md text-md text-ink focus:border-primary outline-none" />
                    <input type="text" inputMode="numeric" value={fmtMoney(amount)}
                      onChange={e => setVioRow(row.id, { appliedPenalty: parseInt(e.target.value.replace(/[^\d]/g, '') || '0', 10) })}
                      className="h-10 w-full text-right px-3 bg-card border border-line-default rounded-md text-md text-ink focus:border-primary outline-none" />
                    <span className="text-right text-md text-ink">{(amount * row.count).toLocaleString('vi-VN')}</span>
                    <button type="button" onClick={() => removeVioRow(row.id)} aria-label="Xóa"
                      className="w-8 h-8 flex items-center justify-center text-ink-muted hover:text-danger cursor-pointer"><TrashIcon /></button>
                  </div>
                )
              })}
              <button type="button" onClick={addVioRow} className="px-4 py-3 text-md font-medium text-primary hover:underline cursor-pointer">Thêm vi phạm</button>
            </div>
          )}
          {error && <p className="pb-3 text-md text-danger">{error}</p>}
        </div>

        {/* footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-line mt-auto">
          <button onClick={handleDelete} disabled={saving} className="flex items-center gap-1.5 text-md text-ink-subtle hover:text-danger cursor-pointer disabled:opacity-50"><TrashIcon /> Hủy</button>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="kv-btn kv-btn-outline-neutral h-10 bg-card">Bỏ qua</button>
            <button onClick={() => void handleSave()} disabled={saving} className="kv-btn kv-btn-primary h-10 disabled:opacity-60">{saving ? 'Đang lưu...' : 'Lưu'}</button>
          </div>
        </div>
      </div>
    </div>
    {addTypeForRow !== null && (
      <AddViolationTypeModal onClose={() => setAddTypeForRow(null)} onSave={(n, a) => void saveVioType(n, a)} />
    )}
    </>
  )
}

/* ── "Đặt lịch" cell popup ─────────────────────────────────────────────────── */
const ScheduleCellModal = ({ shift, date, employees, onClose, onSaved }: { shift: ShiftDto; date: Date; employees: EmployeeSummary[]; onClose: () => void; onSaved: () => void }) => {
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<EmployeeSummary | null>(null)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', onKey) }
  }, [onClose])
  const filtered = employees.filter(e => { const s = q.trim().toLowerCase(); return !s || e.name.toLowerCase().includes(s) || e.code.toLowerCase().includes(s) })

  const save = async () => {
    if (!selected) return
    setSaving(true); setError('')
    try {
      await createSchedules({
        employeeIds: [selected.id], shiftIds: [shift.id], date: toYMD(date),
        repeatWeekly: false, repeatDays: [], repeatEnd: null, workOnHolidays: false,
      })
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể đặt lịch làm việc.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-[54rem] bg-card rounded-xl shadow-2xl flex flex-col" onMouseDown={e => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-2">
          <div className="flex items-start justify-between">
            <h2 className="text-xl font-bold text-ink">{shift.name}</h2>
            <button onClick={onClose} aria-label="Đóng" className="w-8 h-8 flex items-center justify-center rounded-full text-ink-muted hover:bg-fill hover:text-ink cursor-pointer"><CloseIcon /></button>
          </div>
          <div className="text-sm text-ink-subtle mt-1">{fullDateLabel(date)}</div>
        </div>

        <div className="px-6 py-4">
          <p className="text-md text-ink mb-4">Chọn nhân viên bạn muốn đặt lịch ở ca này?</p>
          <div className="flex items-center gap-4">
            <label className="text-md font-bold text-ink w-[7rem] shrink-0">Tên nhân viên</label>
            <div ref={ref} className="relative flex-1">
              <input value={selected?.name ?? q} onChange={e => { setQ(e.target.value); setSelected(null); setOpen(true) }} onFocus={() => setOpen(true)}
                placeholder="Tìm kiếm nhân viên" className="w-full h-10 px-3 bg-card border border-line-default rounded-md text-md text-ink placeholder:text-ink-muted focus:border-primary outline-none" />
              {open && (
                <div className="absolute left-0 right-0 top-[calc(100%+0.3rem)] bg-card border border-line-default rounded-md shadow-md z-[var(--kv-z-dropdown)] max-h-[14rem] overflow-y-auto py-1">
                  {filtered.length === 0
                    ? <div className="px-3 py-2 text-md text-ink-muted">Không có nhân viên</div>
                    : filtered.map(e => (
                      <button key={e.id} type="button" onClick={() => { setSelected(e); setQ(''); setOpen(false) }} className="block w-full text-left px-3 py-2 hover:bg-[var(--kv-state-hover-bg)] cursor-pointer">
                        <div className="text-md text-ink">{e.name}</div>
                        <div className="text-sm text-ink-subtle">{e.code}</div>
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
          {error && <p className="text-md text-danger mt-3">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4">
          <button onClick={onClose} className="kv-btn kv-btn-outline-neutral h-10 bg-card">Bỏ qua</button>
          <button onClick={() => void save()} disabled={!selected || saving} className="kv-btn kv-btn-primary h-10 disabled:opacity-50">{saving ? 'Đang lưu...' : 'Đồng ý'}</button>
        </div>
      </div>
    </div>
  )
}

const Timesheet = () => {
  const today = useMemo(() => stripTime(new Date()), [])
  const [shifts, setShifts] = useState<ShiftDto[]>([])
  const [employees, setEmployees] = useState<EmployeeSummary[]>([])
  const [cells, setCells] = useState<TimesheetCellDto[]>([])
  const [summaryRows, setSummaryRows] = useState<AttendanceSummaryRowDto[]>([])
  const [settings, setSettings] = useState<AttendanceSettingsDto | null>(null)
  const [vioTypes, setVioTypes] = useState<ViolationTypeDto[]>([])
  const [loadErr, setLoadErr] = useState('')

  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState<PeriodMode>('week')
  const [cursor, setCursor] = useState<Date>(today) // reference date for the active period
  const [viewMode, setViewMode] = useState<'shift' | 'employee'>('shift')

  const [searchOpen, setSearchOpen] = useState(false)
  const [periodOpen, setPeriodOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const periodRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLDivElement>(null)

  // BR-AT-01 A1: quick-add a shift right from the timesheet header.
  const [addShiftOpen, setAddShiftOpen] = useState(false)

  // attendance ("Chấm công") modal
  const [attnCell, setAttnCell] = useState<TimesheetCellDto | null>(null)
  // "Đặt lịch" cell popup — pick an employee to schedule into a shift on a day
  const [scheduleCell, setScheduleCell] = useState<{ shift: ShiftDto; date: Date } | null>(null)
  const openSchedule = (shift: ShiftDto, date: Date) => setScheduleCell({ shift, date })

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const t = e.target as Node
      if (searchRef.current && !searchRef.current.contains(t)) setSearchOpen(false)
      if (periodRef.current && !periodRef.current.contains(t)) setPeriodOpen(false)
      if (viewRef.current && !viewRef.current.contains(t)) setViewOpen(false)
      if (moreRef.current && !moreRef.current.contains(t)) setMoreOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const loadStatic = useCallback(() => {
    listShifts({ status: 'ACTIVE' }).then(res => setShifts(res.data.data)).catch(() => {})
    listEmployees({ status: 'ACTIVE', size: 500 }).then(res =>
      setEmployees(res.data.data.map(e => ({ id: e.id, name: e.name, code: e.code })))).catch(() => {})
    getSettings().then(res => setSettings(res.data.data)).catch(() => {})
    listViolationTypes().then(res => setVioTypes(res.data.data)).catch(() => {})
  }, [])
  useEffect(() => { loadStatic() }, [loadStatic])

  const weekStart = useMemo(() => startOfWeek(cursor), [cursor])
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const monthDays = useMemo(() => {
    const n = daysInMonth(cursor.getFullYear(), cursor.getMonth())
    return Array.from({ length: n }, (_, i) => new Date(cursor.getFullYear(), cursor.getMonth(), i + 1))
  }, [cursor])

  const [rangeStart, rangeEnd] = useMemo(() => {
    if (period === 'week') return [weekStart, addDays(weekStart, 6)]
    if (period === 'day') return [cursor, cursor]
    return [monthDays[0], monthDays[monthDays.length - 1]]
  }, [period, weekStart, cursor, monthDays])

  const reload = useCallback(async () => {
    try {
      const cellRes = await getTimesheet(toYMD(rangeStart), toYMD(rangeEnd))
      setCells(cellRes.data.data)
      if (viewMode === 'employee') {
        const sumRes = await getSummary(toYMD(rangeStart), toYMD(rangeEnd))
        setSummaryRows(sumRes.data.data)
      }
    } catch (err) {
      setLoadErr(err instanceof ApiError ? err.message : 'Không tải được dữ liệu chấm công.')
    }
  }, [rangeStart, rangeEnd, viewMode])
  useEffect(() => { void reload() }, [reload])

  /* "+" in the shift column header — opens the "Thêm ca làm việc" popup directly (BR-AT-01 A1). */
  const AddShiftButton = () => (
    <button onClick={() => setAddShiftOpen(true)} aria-label="Thêm ca làm việc"
      className="w-6 h-6 flex items-center justify-center rounded-md text-primary hover:bg-primary-25 cursor-pointer text-xl leading-none">+</button>
  )

  const employeeList = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? employees.filter(e => e.name.toLowerCase().includes(q) || e.code.toLowerCase().includes(q)) : employees
  }, [employees, search])

  const cellFor = (shiftId: string, date: Date) =>
    cells.filter(c => c.shiftId === shiftId && c.workDate === toYMD(date)
      && (!search.trim() || (c.employeeName ?? '').toLowerCase().includes(search.trim().toLowerCase())))

  /* ── period navigation ──────────────────────────────────────────────────── */
  const step = (dir: -1 | 1) => {
    if (period === 'week') setCursor(c => addDays(startOfWeek(c), dir * 7))
    else if (period === 'day') setCursor(c => addDays(c, dir))
    else setCursor(c => new Date(c.getFullYear(), c.getMonth() + dir, 1))
  }

  const periodLabel = () => {
    if (period === 'week') {
      const end = addDays(weekStart, 6)
      return `Tuần ${weekOfMonth(weekStart)} - Th. ${end.getMonth() + 1} ${end.getFullYear()}`
    }
    if (period === 'day') {
      const sh = WEEKDAY_SHORT[cursor.getDay()]
      const wd = sh === 'CN' ? 'CN' : `Thứ ${sh.slice(1)}`
      return `${wd}, Ngày ${cursor.getDate()}/${String(cursor.getMonth() + 1).padStart(2, '0')}`
    }
    return `Tháng ${cursor.getMonth() + 1}, ${cursor.getFullYear()}`
  }

  const PERIOD_LABELS: Record<PeriodMode, string> = { week: 'Theo tuần', day: 'Theo ngày', month: 'Theo tháng' }

  /* ── shift label cell (left column) ─────────────────────────────────────── */
  const ShiftLabel = ({ s }: { s: ShiftDto }) => (
    <>
      <div className="text-md font-bold text-ink">{s.name}</div>
      <div className="text-sm text-ink-subtle mt-0.5">{formatTime(s.startTime)} - {formatTime(s.endTime)}</div>
    </>
  )

  /* ── employee card (week / month cell) ──────────────────────────────────── */
  const WeekCard = ({ c }: { c: TimesheetCellDto }) => {
    const otLabel = cardOtLabel(c, settings)
    const lateEarlyLabel = cardLateEarlyLabel(c)
    return (
      <button type="button" onClick={e => { e.stopPropagation(); setAttnCell(c) }}
        className={`block w-full rounded-md px-3 py-2 text-left cursor-pointer transition-shadow hover:ring-1 hover:ring-primary/50 ${cardStyle(c.displayStatus)}`}>
        <div className="text-md font-medium leading-tight">{c.employeeName}</div>
        {c.displayStatus === 'UNMARKED' && (
          <div className="text-sm mt-1">Chưa chấm công</div>
        )}
        {c.record && c.record.type !== 'PRESENT' && (
          <div className="text-sm mt-1">{ATTENDANCE_TYPE_LABEL[c.record.type]}</div>
        )}
        {c.record && c.record.type === 'PRESENT' && (c.record.actualCheckIn || c.record.actualCheckOut) && (
          <div className="text-sm mt-1 text-ink-subtle">{c.record.actualCheckIn?.slice(11, 16) ?? '--'} - {c.record.actualCheckOut?.slice(11, 16) ?? '--'}</div>
        )}
        {lateEarlyLabel && <div className="text-sm mt-0.5 text-primary font-medium">{lateEarlyLabel}</div>}
        {otLabel && <div className="text-sm mt-0.5 text-primary font-medium">{otLabel}</div>}
        {(c.violations ?? []).map(v => (
          <div key={v.id} className="text-sm mt-0.5 text-primary font-medium">{v.violationTypeName} {v.count}</div>
        ))}
      </button>
    )
  }

  /* ── employee card (day view — richer) ──────────────────────────────────── */
  const DayCard = ({ c }: { c: TimesheetCellDto }) => {
    const otLabel = cardOtLabel(c, settings)
    const lateEarlyLabel = cardLateEarlyLabel(c)
    return (
      <button type="button" onClick={e => { e.stopPropagation(); setAttnCell(c) }}
        className={`block rounded-md px-4 py-3 w-[22rem] max-w-full text-left cursor-pointer transition-shadow hover:ring-1 hover:ring-primary/50 ${cardStyle(c.displayStatus)}`}>
        <div className="text-md font-semibold text-ink mb-2">{c.employeeName}</div>
        <div className="flex items-center gap-2 text-sm mb-1"><CalIcon /> {c.record?.actualCheckIn?.slice(11, 16) ?? '--'} - {c.record?.actualCheckOut?.slice(11, 16) ?? '--'}</div>
        <div className="flex items-center gap-2 text-sm mb-1"><ClockIcon /> {c.record ? `${c.record.workedMinutes}p` : '--'}</div>
        <div className="flex items-center gap-2 text-sm"><NoteIcon /> {cellStatusLabel(c)}</div>
        {lateEarlyLabel && <div className="text-sm mt-1 text-primary font-medium">{lateEarlyLabel}</div>}
        {otLabel && <div className="text-sm mt-1 text-primary font-medium">{otLabel}</div>}
        {(c.violations ?? []).map(v => (
          <div key={v.id} className="text-sm mt-1 text-primary font-medium">{v.violationTypeName} {v.count}</div>
        ))}
      </button>
    )
  }

  const emptyShiftHint = (
    <span className="text-md text-ink-subtle">Chọn để xếp nhân viên làm việc cho ca.</span>
  )

  const handleExport = () => {
    const header = ['Mã NV', 'Tên NV', 'Số công', 'Phút đi muộn', 'Phút về sớm', 'Giờ làm thêm', 'Tổng tiền phạt']
    const rows = summaryRows.map(r => [
      r.employeeCode ?? '', r.employeeName ?? '', r.workCreditTotal, r.lateMinutesTotal,
      r.earlyLeaveMinutesTotal, (r.otMinutesTotal / 60).toFixed(1), r.penaltyTotal,
    ])
    const csv = [header, ...rows].map(line => line.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bang-cham-cong-${toYMD(rangeStart)}-${toYMD(rangeEnd)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-4 pt-4">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-h3 font-extrabold text-ink mr-2">Bảng chấm công</h1>

        {/* search */}
        <div ref={searchRef} className="relative w-[18rem]">
          <button
            onClick={() => setSearchOpen(o => !o)}
            className={`flex items-center gap-2 w-full h-10 px-3 bg-card border rounded-md cursor-pointer transition-colors ${searchOpen ? 'border-primary' : 'border-line-default hover:border-line-strong'}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted shrink-0"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <span className={`flex-1 text-left text-md truncate ${search ? 'text-ink' : 'text-ink-muted'}`}>{search || 'Tìm kiếm nhân viên'}</span>
            <ChevronDown />
          </button>
          {searchOpen && (
            <div className="absolute top-[calc(100%+0.4rem)] left-0 right-0 bg-card border border-line-default rounded-md shadow-md z-[var(--kv-z-dropdown)] py-2">
              <input autoFocus className="w-full px-3 pb-2 text-md text-ink bg-transparent border-b border-line focus:outline-none" placeholder="Nhập tên nhân viên" value={search} onChange={e => setSearch(e.target.value)} />
              <div className="max-h-[16rem] overflow-y-auto mt-1">
                {employeeList.length === 0 && <div className="px-3 py-2 text-md text-ink-subtle">Không có nhân viên phù hợp</div>}
                {employeeList.map(e => <div key={e.id} className="px-3 py-2 text-md text-ink truncate">{e.name}</div>)}
              </div>
            </div>
          )}
        </div>

        {/* period-type dropdown */}
        <div ref={periodRef} className="relative">
          <button onClick={() => setPeriodOpen(o => !o)} className="flex items-center gap-2 h-10 px-4 bg-card border border-line-default rounded-md text-md font-medium text-ink cursor-pointer hover:border-line-strong whitespace-nowrap">
            {PERIOD_LABELS[period]}
            <ChevronDown />
          </button>
          {periodOpen && (
            <div className="absolute left-0 top-[calc(100%+0.4rem)] bg-card border border-line-default rounded-md shadow-md min-w-[12rem] py-1 z-[var(--kv-z-dropdown)]">
              {(['week', 'day', 'month'] as PeriodMode[]).map(p => (
                <button key={p} className="flex items-center justify-between w-full text-left px-4 py-2 text-md text-ink cursor-pointer hover:bg-[var(--kv-state-hover-bg)]" onClick={() => { setPeriod(p); setPeriodOpen(false) }}>
                  {PERIOD_LABELS[p]}
                  {period === p && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><polyline points="20 6 9 17 4 12" /></svg>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* period navigation */}
        <div className="flex items-center gap-1">
          <button className="w-9 h-9 flex items-center justify-center border border-line-default rounded-md bg-card text-ink-subtle cursor-pointer hover:border-primary hover:text-primary" onClick={() => step(-1)} aria-label="Trước"><ChevronL /></button>
          <div className="h-10 px-4 flex items-center bg-card border border-line-default rounded-md text-md text-ink whitespace-nowrap">{periodLabel()}</div>
          <button className="w-9 h-9 flex items-center justify-center border border-line-default rounded-md bg-card text-ink-subtle cursor-pointer hover:border-primary hover:text-primary" onClick={() => step(1)} aria-label="Sau"><ChevronR /></button>
        </div>

        <button className="kv-btn kv-btn-outline-neutral h-10 bg-card" onClick={() => setCursor(today)}>Chọn</button>

        <div className="flex-1" />

        {/* view mode */}
        <div ref={viewRef} className="relative">
          <button onClick={() => setViewOpen(o => !o)} className="flex items-center gap-2 h-10 px-3 bg-card border border-line-default rounded-md text-md text-ink cursor-pointer hover:border-line-strong">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /></svg>
            {viewMode === 'shift' ? 'Xem theo ca' : 'Xem theo nhân viên'}
            <ChevronDown />
          </button>
          {viewOpen && (
            <div className="absolute right-0 top-[calc(100%+0.4rem)] bg-card border border-line-default rounded-md shadow-md min-w-[16rem] py-1 z-[var(--kv-z-dropdown)]">
              {([['shift', 'Xem theo ca'], ['employee', 'Xem theo nhân viên']] as const).map(([id, label]) => (
                <button key={id} className="flex items-center justify-between w-full text-left px-4 py-2 text-md text-ink cursor-pointer hover:bg-[var(--kv-state-hover-bg)]" onClick={() => { setViewMode(id); setViewOpen(false) }}>
                  {label}
                  {viewMode === id && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><polyline points="20 6 9 17 4 12" /></svg>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div ref={moreRef} className="relative">
          <button onClick={() => setMoreOpen(o => !o)} className="w-10 h-10 flex items-center justify-center border border-line-default rounded-md bg-card text-ink cursor-pointer hover:border-line-strong" aria-label="Thêm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>
          </button>
          {moreOpen && (
            <div className="absolute right-0 top-[calc(100%+0.4rem)] bg-card border border-line-default rounded-md shadow-md min-w-[14rem] py-1 z-[var(--kv-z-dropdown)]">
              <button className="w-full text-left px-4 py-2 text-md text-ink cursor-pointer hover:bg-[var(--kv-state-hover-bg)]" onClick={() => { handleExport(); setMoreOpen(false) }}>Xuất file</button>
              <button className="w-full text-left px-4 py-2 text-md text-ink cursor-pointer hover:bg-[var(--kv-state-hover-bg)]" onClick={() => { setMoreOpen(false); window.location.hash = '/manager/employee-settings' }}>Thiết lập chấm công</button>
            </div>
          )}
        </div>
      </div>

      {loadErr && <div className="px-4 py-2 rounded-md bg-danger-50 text-danger text-md border border-danger/30">{loadErr}</div>}

      {/* ── Grid ────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 relative flex flex-col bg-card border border-line rounded-lg overflow-auto">
        {viewMode === 'employee' && (
          <table className="w-full border-collapse min-w-[64rem]">
            <thead>
              <tr className="bg-primary-25">
                <th className="sticky top-0 z-2 bg-primary-25 text-left px-4 py-3 w-[18rem] border-b border-line text-sm font-semibold text-ink-subtle">Nhân viên</th>
                <th className="sticky top-0 z-2 bg-primary-25 text-right px-4 py-3 border-b border-line text-sm font-semibold text-ink-subtle whitespace-nowrap">Đi làm</th>
                <th className="sticky top-0 z-2 bg-primary-25 text-right px-4 py-3 border-b border-line text-sm font-semibold text-ink-subtle whitespace-nowrap">Nghỉ làm</th>
                <th className="sticky top-0 z-2 bg-primary-25 text-right px-4 py-3 border-b border-line text-sm font-semibold text-ink-subtle whitespace-nowrap">Đi muộn (phút)</th>
                <th className="sticky top-0 z-2 bg-primary-25 text-right px-4 py-3 border-b border-line text-sm font-semibold text-ink-subtle whitespace-nowrap">Về sớm (phút)</th>
                <th className="sticky top-0 z-2 bg-primary-25 text-right px-4 py-3 border-b border-line text-sm font-semibold text-ink-subtle whitespace-nowrap">Làm thêm (giờ)</th>
                <th className="sticky top-0 z-2 bg-primary-25 text-right px-4 py-3 border-b border-line text-sm font-semibold text-ink-subtle whitespace-nowrap">Tổng tiền phạt</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-md text-ink-subtle border-b border-line">Không có dữ liệu chấm công trong kỳ này</td>
                </tr>
              ) : summaryRows
                .filter(r => !search.trim() || (r.employeeName ?? '').toLowerCase().includes(search.trim().toLowerCase()))
                .map(r => (
                <tr key={r.employeeId} className="border-b border-line hover:bg-[var(--kv-state-hover-bg)]">
                  <td className="px-4 py-4 align-top">
                    <div className="text-md font-semibold text-ink leading-tight">{r.employeeName}</div>
                    <div className="text-sm text-ink-subtle mt-0.5">{r.employeeCode}</div>
                  </td>
                  <td className="px-4 py-4 align-top text-md text-ink text-right">{r.workCreditTotal}</td>
                  <td className="px-4 py-4 align-top text-md text-ink text-right">{r.leaveApprovedCount + r.leaveUnapprovedCount}</td>
                  <td className="px-4 py-4 align-top text-md text-ink text-right">{r.lateMinutesTotal}</td>
                  <td className="px-4 py-4 align-top text-md text-ink text-right">{r.earlyLeaveMinutesTotal}</td>
                  <td className="px-4 py-4 align-top text-md text-ink text-right">{(r.otMinutesTotal / 60).toFixed(1)}</td>
                  <td className="px-4 py-4 align-top text-md text-ink text-right">{r.penaltyTotal.toLocaleString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {viewMode === 'shift' && period === 'week' && (
          <table className="w-full border-collapse table-fixed min-w-[80rem]">
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-3 bg-card text-left px-4 py-4 w-[14rem] border-b border-r border-line">
                  <div className="flex items-center justify-between">
                    <span className="text-md font-bold text-ink">Ca làm việc</span>
                    <AddShiftButton />
                  </div>
                </th>
                {weekDays.map(d => (
                  <th key={toYMD(d)} className="sticky top-0 z-2 bg-card text-left px-4 py-4 border-b border-line">
                    <span className={`text-md font-semibold ${sameDay(d, today) ? 'text-primary' : 'text-ink'}`}>{WEEKDAY_FULL[(d.getDay() + 6) % 7]}</span>{' '}
                    <span className={sameDay(d, today) ? 'inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-white text-sm font-semibold ml-1' : 'text-ink-subtle ml-1'}>{String(d.getDate()).padStart(2, '0')}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shifts.map(s => {
                const hasAny = weekDays.some(d => cellFor(s.id, d).length > 0)
                return (
                  <tr key={s.id} className="border-b border-line align-top">
                    <td className="px-4 py-4 border-r border-line align-top"><ShiftLabel s={s} /></td>
                    {weekDays.map((d, i) => {
                      const cell = cellFor(s.id, d)
                      return (
                        <td key={toYMD(d)} onClick={() => openSchedule(s, d)} className={`relative px-2 py-2 align-top hover:bg-success-50/40 transition-colors cursor-pointer ${hasAny ? 'border-l border-line' : ''}`}>
                          <div className="flex flex-col gap-1.5">{cell.map(c => <WeekCard key={c.scheduleId} c={c} />)}</div>
                          {!hasAny && i === 3 && (
                            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-md text-ink-subtle pointer-events-none">Chọn để xếp nhân viên làm việc cho ca.</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {viewMode === 'shift' && period === 'day' && (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left px-4 py-4 w-[14rem] border-b border-r border-line">
                  <div className="flex items-center justify-between">
                    <span className="text-md font-bold text-ink">Ca làm việc</span>
                    <AddShiftButton />
                  </div>
                </th>
                <th className="text-left px-4 py-4 border-b border-line">
                  <span className={`text-md font-semibold ${sameDay(cursor, today) ? 'text-primary' : 'text-ink'}`}>{WEEKDAY_FULL[(cursor.getDay() + 6) % 7]}</span>{' '}
                  <span className={sameDay(cursor, today) ? 'inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-white text-sm font-semibold ml-1' : 'text-ink-subtle ml-1'}>{String(cursor.getDate()).padStart(2, '0')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shifts.map(s => {
                const cell = cellFor(s.id, cursor)
                return (
                  <tr key={s.id} className="border-b border-line align-top">
                    <td className="px-4 py-4 border-r border-line align-top"><ShiftLabel s={s} /></td>
                    <td onClick={() => openSchedule(s, cursor)} className="px-4 py-3 align-top cursor-pointer hover:bg-success-50/40 transition-colors">
                      {cell.length > 0
                        ? <div className="flex flex-col gap-2">{cell.map(c => <DayCard key={c.scheduleId} c={c} />)}</div>
                        : <div className="py-3 text-center">{emptyShiftHint}</div>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {viewMode === 'shift' && period === 'month' && (
          <table className="w-full border-collapse min-w-[110rem]">
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-3 bg-card text-left px-3 py-3 w-[11rem] border-b border-r border-line">
                  <div className="flex items-center justify-between"><span className="text-md font-bold text-ink">Ca làm việc</span><AddShiftButton /></div>
                </th>
                <th className="sticky top-0 z-2 bg-card text-left px-3 py-3 w-[10rem] border-b border-r border-line">
                  <span className="text-md font-bold text-ink">Nhân viên</span>
                </th>
                {monthDays.map(d => (
                  <th key={toYMD(d)} className="sticky top-0 z-2 bg-card text-center px-1 py-2 border-b border-l border-line w-[3.2rem]">
                    <div className={`text-sm font-medium ${sameDay(d, today) ? 'text-primary' : 'text-ink-subtle'}`}>{WEEKDAY_SHORT[d.getDay()]}</div>
                    <div className={sameDay(d, today) ? 'mx-auto mt-0.5 w-6 h-6 flex items-center justify-center rounded-full bg-primary text-white text-sm font-semibold' : 'text-sm text-ink mt-0.5'}>{String(d.getDate()).padStart(2, '0')}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shifts.map(s => {
                const shiftEmployeeIds = Array.from(new Set(cells.filter(c => c.shiftId === s.id).map(c => c.employeeId)))
                const shiftEmployees = shiftEmployeeIds
                  .map(id => employees.find(e => e.id === id))
                  .filter((e): e is EmployeeSummary => !!e)
                if (shiftEmployees.length === 0) {
                  return (
                    <tr key={s.id} className="border-b border-line align-top">
                      <td className="px-3 py-4 border-r border-line align-top"><ShiftLabel s={s} /></td>
                      <td colSpan={monthDays.length + 1} className="px-4 py-6 text-center border-l border-line">{emptyShiftHint}</td>
                    </tr>
                  )
                }
                return shiftEmployees.map((emp, idx) => (
                  <tr key={s.id + emp.id} className="border-b border-line align-top">
                    {idx === 0 && (
                      <td rowSpan={shiftEmployees.length} className="px-3 py-4 border-r border-line align-top"><ShiftLabel s={s} /></td>
                    )}
                    <td className="px-3 py-4 border-r border-line align-top"><span className="text-md text-ink">{emp.name}</span></td>
                    {monthDays.map(d => {
                      const c = cells.find(x => x.employeeId === emp.id && x.shiftId === s.id && x.workDate === toYMD(d))
                      return (
                        <td key={toYMD(d)} onClick={() => c ? setAttnCell(c) : openSchedule(s, d)}
                          className="px-0 py-3 border-l border-line text-center align-middle cursor-pointer hover:bg-success-50/40 transition-colors">
                          {c && (
                            <span className="inline-block w-2 h-2 rounded-full" style={{ background: TIMESHEET_STATUS_COLOR[c.displayStatus] }} />
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))
              })}
            </tbody>
          </table>
        )}

      </div>

      {/* ── Status legend (bottom-center, below the grid) ───────────────── */}
      {viewMode === 'shift' && (
      <div className="shrink-0 mx-auto flex items-center gap-6 bg-card border border-line rounded-full shadow-md px-6 py-3 w-fit">
        {LEGEND.map(status => (
          <span key={status} className="flex items-center gap-2 text-md text-ink whitespace-nowrap">
            <CheckCircle color={TIMESHEET_STATUS_COLOR[status]} /> {TIMESHEET_STATUS_LABEL[status]}
          </span>
        ))}
      </div>
      )}

      {/* ── Chấm công modal ─────────────────────────────────────────────────── */}
      {attnCell && (
        <AttendanceModal
          cell={attnCell} shifts={shifts} employees={employees} settings={settings} vioTypes={vioTypes}
          onVioTypeAdded={t => setVioTypes(ts => [...ts, t])}
          onClose={() => setAttnCell(null)}
          onSaved={() => { setAttnCell(null); void reload() }}
        />
      )}
      {/* ── Đặt lịch cell popup ─────────────────────────────────────────────── */}
      {scheduleCell && (
        <ScheduleCellModal
          shift={scheduleCell.shift} date={scheduleCell.date} employees={employees}
          onClose={() => setScheduleCell(null)}
          onSaved={() => { setScheduleCell(null); void reload() }}
        />
      )}
      {/* ── Thêm ca làm việc nhanh (UC-AT-01 A1) ─────────────────────────────── */}
      {addShiftOpen && (
        <ShiftTemplateModal
          shift={null}
          onClose={() => setAddShiftOpen(false)}
          onSaved={() => { setAddShiftOpen(false); loadStatic() }}
        />
      )}
    </div>
  )
}

export default Timesheet
