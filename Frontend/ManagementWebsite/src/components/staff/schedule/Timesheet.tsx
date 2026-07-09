import { useEffect, useMemo, useRef, useState } from 'react'

/* ─────────────────────────────────────────────────────────────────────────────
 * Bảng chấm công (Timesheet) — faithful re-creation of the KiotViet screen.
 * Three period modes (Theo tuần / Theo ngày / Theo tháng) with a "Xem theo ca"
 * grid of shift-rows × day-columns holding employee attendance cards.
 * ──────────────────────────────────────────────────────────────────────────── */

type AttStatus = 'on-time' | 'late-early' | 'missing' | 'unmarked' | 'off' | 'scheduled'

interface ShiftDef { id: string; name: string; start: string; end: string }
interface Assignment {
  employee: string
  shiftId: string
  date: string // YYYY-MM-DD
  status: AttStatus
  checkIn?: string
  checkOut?: string
}

const SHIFTS: ShiftDef[] = [
  { id: 'morning', name: 'Sáng', start: '07:00', end: '11:00' },
  { id: 'afternoon', name: 'Chiều', start: '13:00', end: '17:00' },
  { id: 'night', name: 'Đêm', start: '21:00', end: '01:00' },
]

const WEEKDAY_FULL = ['Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy', 'Chủ nhật']
const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'] // indexed by getDay()

const LEGEND: { status: AttStatus; label: string; color: string }[] = [
  { status: 'on-time', label: 'Đúng giờ', color: '#0070F4' },
  { status: 'late-early', label: 'Đi muộn / Về sớm', color: '#7C4DFF' },
  { status: 'missing', label: 'Chấm công thiếu', color: '#F0483E' },
  { status: 'unmarked', label: 'Chưa chấm công', color: '#F5A623' },
  { status: 'off', label: 'Nghỉ làm', color: '#9AA5B1' },
]

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

/* ── mock attendance data (anchored to today) ─────────────────────────────── */
const buildMockData = (today: Date): Assignment[] => [
  { employee: 'Nguyen Van A', shiftId: 'morning', date: toYMD(addDays(today, 2)), status: 'scheduled' },
  { employee: 'Nguyen Van A', shiftId: 'morning', date: toYMD(addDays(today, 3)), status: 'scheduled' },
  { employee: 'Nguyen Van B', shiftId: 'night', date: toYMD(today), status: 'unmarked' },
  { employee: 'Nguyen Van B', shiftId: 'night', date: toYMD(addDays(today, 1)), status: 'scheduled' },
  { employee: 'Nguyen Van B', shiftId: 'night', date: toYMD(addDays(today, 2)), status: 'scheduled' },
]

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

type PeriodMode = 'week' | 'day' | 'month'

/* ── status → card classes ─────────────────────────────────────────────────── */
const cardStyle = (status: AttStatus) => {
  switch (status) {
    case 'unmarked': return 'bg-warning-50 text-warning-700'
    case 'off': return 'bg-fill text-ink-subtle'
    default: return 'bg-fill text-ink'
  }
}

const Timesheet = () => {
  const today = useMemo(() => stripTime(new Date()), [])
  const [assignments] = useState<Assignment[]>(() => buildMockData(today))
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

  const weekStart = useMemo(() => startOfWeek(cursor), [cursor])
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const monthDays = useMemo(() => {
    const n = daysInMonth(cursor.getFullYear(), cursor.getMonth())
    return Array.from({ length: n }, (_, i) => new Date(cursor.getFullYear(), cursor.getMonth(), i + 1))
  }, [cursor])

  const employees = useMemo(() => {
    const set = Array.from(new Set(assignments.map(a => a.employee)))
    const q = search.trim().toLowerCase()
    return q ? set.filter(e => e.toLowerCase().includes(q)) : set
  }, [assignments, search])

  const cellFor = (shiftId: string, date: Date) =>
    assignments.filter(a => a.shiftId === shiftId && a.date === toYMD(date)
      && (!search.trim() || a.employee.toLowerCase().includes(search.trim().toLowerCase())))

  const shift = (id: string) => SHIFTS.find(s => s.id === id)!

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
  const ShiftLabel = ({ s }: { s: ShiftDef }) => (
    <>
      <div className="text-md font-bold text-ink">{s.name}</div>
      <div className="text-sm text-ink-subtle mt-0.5">{s.start} - {s.end}</div>
    </>
  )

  /* ── employee card (week / month cell) ──────────────────────────────────── */
  const WeekCard = ({ a }: { a: Assignment }) => (
    <div className={`rounded-md px-3 py-2 text-left ${cardStyle(a.status)}`}>
      <div className="text-md font-medium leading-tight">{a.employee}</div>
      {a.status === 'unmarked' && (
        <>
          <div className="text-sm mt-1">{a.checkIn ?? '--'} {a.checkOut ?? '--'}</div>
          <div className="text-sm">Chưa chấm công</div>
        </>
      )}
    </div>
  )

  /* ── employee card (day view — richer) ──────────────────────────────────── */
  const DayCard = ({ a }: { a: Assignment }) => (
    <div className={`rounded-md px-4 py-3 w-[22rem] max-w-full ${cardStyle(a.status)}`}>
      <div className="text-md font-semibold text-ink mb-2">{a.employee}</div>
      <div className="flex items-center gap-2 text-sm mb-1"><CalIcon /> {a.checkIn ?? '--'} {a.checkOut ?? '--'}</div>
      <div className="flex items-center gap-2 text-sm mb-1"><ClockIcon /> --</div>
      <div className="flex items-center gap-2 text-sm"><NoteIcon /> {a.status === 'unmarked' ? 'Chưa chấm công' : 'Đã lên lịch'}</div>
    </div>
  )

  const emptyShiftHint = (
    <span className="text-md text-ink-subtle">Chọn để xếp nhân viên làm việc cho ca.</span>
  )

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
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
                {employees.length === 0 && <div className="px-3 py-2 text-md text-ink-subtle">Không có nhân viên phù hợp</div>}
                {employees.map(e => <div key={e} className="px-3 py-2 text-md text-ink truncate">{e}</div>)}
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

        <button className="kv-btn kv-btn-outline-neutral h-10 bg-card">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><polyline points="9 15 11 17 15 13" /></svg>
          Duyệt chấm công
        </button>

        <div ref={moreRef} className="relative">
          <button onClick={() => setMoreOpen(o => !o)} className="w-10 h-10 flex items-center justify-center border border-line-default rounded-md bg-card text-ink cursor-pointer hover:border-line-strong" aria-label="Thêm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>
          </button>
          {moreOpen && (
            <div className="absolute right-0 top-[calc(100%+0.4rem)] bg-card border border-line-default rounded-md shadow-md min-w-[14rem] py-1 z-[var(--kv-z-dropdown)]">
              {['Import', 'Xuất file', 'Thiết lập chấm công'].map(l => (
                <button key={l} className="w-full text-left px-4 py-2 text-md text-ink cursor-pointer hover:bg-[var(--kv-state-hover-bg)]" onClick={() => setMoreOpen(false)}>{l}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Grid ────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 relative flex flex-col bg-card border border-line rounded-lg overflow-auto">
        {period === 'week' && (
          <table className="w-full border-collapse table-fixed min-w-[80rem]">
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-3 bg-card text-left px-4 py-4 w-[14rem] border-b border-r border-line">
                  <div className="flex items-center justify-between">
                    <span className="text-md font-bold text-ink">Ca làm việc</span>
                    <span className="w-6 h-6 flex items-center justify-center rounded-md text-primary hover:bg-primary-25 cursor-pointer text-xl leading-none">+</span>
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
              {SHIFTS.map(s => {
                const hasAny = weekDays.some(d => cellFor(s.id, d).length > 0)
                return (
                  <tr key={s.id} className="border-b border-line align-top">
                    <td className="px-4 py-4 border-r border-line align-top"><ShiftLabel s={s} /></td>
                    {hasAny ? weekDays.map(d => {
                      const cell = cellFor(s.id, d)
                      return (
                        <td key={toYMD(d)} className="px-2 py-2 border-l border-line align-top hover:bg-success-50/40 transition-colors">
                          <div className="flex flex-col gap-1.5">{cell.map((a, i) => <WeekCard key={i} a={a} />)}</div>
                        </td>
                      )
                    }) : (
                      <td colSpan={7} className="px-4 py-6 text-center border-l border-line">{emptyShiftHint}</td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {period === 'day' && (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left px-4 py-4 w-[14rem] border-b border-r border-line">
                  <div className="flex items-center justify-between">
                    <span className="text-md font-bold text-ink">Ca làm việc</span>
                    <span className="w-6 h-6 flex items-center justify-center rounded-md text-primary hover:bg-primary-25 cursor-pointer text-xl leading-none">+</span>
                  </div>
                </th>
                <th className="text-left px-4 py-4 border-b border-line">
                  <span className={`text-md font-semibold ${sameDay(cursor, today) ? 'text-primary' : 'text-ink'}`}>{WEEKDAY_FULL[(cursor.getDay() + 6) % 7]}</span>{' '}
                  <span className={sameDay(cursor, today) ? 'inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-white text-sm font-semibold ml-1' : 'text-ink-subtle ml-1'}>{String(cursor.getDate()).padStart(2, '0')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {SHIFTS.map(s => {
                const cell = cellFor(s.id, cursor)
                return (
                  <tr key={s.id} className="border-b border-line align-top">
                    <td className="px-4 py-4 border-r border-line align-top"><ShiftLabel s={s} /></td>
                    <td className="px-4 py-3 align-top">
                      {cell.length > 0
                        ? <div className="flex flex-col gap-2">{cell.map((a, i) => <DayCard key={i} a={a} />)}</div>
                        : <div className="py-3 text-center">{emptyShiftHint}</div>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {period === 'month' && (
          <table className="w-full border-collapse min-w-[110rem]">
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-3 bg-card text-left px-3 py-3 w-[11rem] border-b border-r border-line">
                  <div className="flex items-center justify-between"><span className="text-md font-bold text-ink">Ca làm việc</span><span className="text-primary text-xl leading-none cursor-pointer">+</span></div>
                </th>
                <th className="sticky top-0 z-2 bg-card text-left px-3 py-3 w-[10rem] border-b border-r border-line">
                  <div className="flex items-center justify-between"><span className="text-md font-bold text-ink">Nhân viên</span><span className="text-primary text-xl leading-none cursor-pointer">+</span></div>
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
              {SHIFTS.map(s => {
                const shiftEmployees = employees.filter(e => assignments.some(a => a.employee === e && a.shiftId === s.id))
                if (shiftEmployees.length === 0) {
                  return (
                    <tr key={s.id} className="border-b border-line align-top">
                      <td className="px-3 py-4 border-r border-line align-top"><ShiftLabel s={s} /></td>
                      <td colSpan={monthDays.length + 1} className="px-4 py-6 text-center border-l border-line">{emptyShiftHint}</td>
                    </tr>
                  )
                }
                return shiftEmployees.map((emp, idx) => (
                  <tr key={s.id + emp} className="border-b border-line align-top">
                    {idx === 0 && (
                      <td rowSpan={shiftEmployees.length} className="px-3 py-4 border-r border-line align-top"><ShiftLabel s={s} /></td>
                    )}
                    <td className="px-3 py-4 border-r border-line align-top"><span className="text-md text-ink">{emp}</span></td>
                    {monthDays.map(d => {
                      const a = assignments.find(x => x.employee === emp && x.shiftId === s.id && x.date === toYMD(d))
                      return (
                        <td key={toYMD(d)} className="px-0 py-3 border-l border-line text-center align-middle">
                          {a && (a.status === 'unmarked'
                            ? <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#F5A623' }} />
                            : <span className="inline-block w-6 h-6 rounded bg-fill" />)}
                        </td>
                      )
                    })}
                  </tr>
                ))
              })}
            </tbody>
          </table>
        )}

        {/* ── Status legend (floating, bottom-center) ─────────────────────── */}
        <div className="sticky bottom-4 z-4 mx-auto flex items-center gap-6 bg-card border border-line rounded-full shadow-md px-6 py-3 w-fit">
          {LEGEND.map(l => (
            <span key={l.status} className="flex items-center gap-2 text-md text-ink whitespace-nowrap">
              <CheckCircle color={l.color} /> {l.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Floating action buttons (bottom-right) ─────────────────────────── */}
      <div className="fixed right-6 bottom-6 flex flex-col gap-3 z-[var(--kv-z-dropdown)]">
        <button className="flex items-center gap-2 h-11 px-4 rounded-full bg-primary text-white text-md font-medium shadow-md hover:bg-primary-600 cursor-pointer">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
          Khởi tạo
        </button>
        <button className="flex items-center gap-2 h-11 px-4 rounded-full bg-primary text-white text-md font-medium shadow-md hover:bg-primary-600 cursor-pointer self-end">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
          Hỗ trợ
        </button>
      </div>
    </div>
  )
}

export default Timesheet
