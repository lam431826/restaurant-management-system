import { useEffect, useRef, useState } from 'react'

interface Props {
  from: string // YYYY-MM-DD | ''
  to: string // YYYY-MM-DD | ''
  onChange: (from: string, to: string) => void
}

const WEEKDAYS_VI = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

const pad = (n: number) => String(n).padStart(2, '0')
const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const parseYMD = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
const fmtDMY = (d: Date | null) => (d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : '...')
const sameDay = (a: Date | null, b: Date) =>
  !!a && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const stripTime = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

const CalendarIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted">
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)
const ChevLeft = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
const ChevRight = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
)

const MonthGrid = ({ monthDate, from, to, onPick, onNav }: {
  monthDate: Date; from: Date | null; to: Date | null; onPick: (d: Date) => void; onNav: (dir: -1 | 1) => void
}) => {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7 // Monday-first: 0=Mon..6=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (Date | null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))

  return (
    <div className="flex flex-col gap-2 w-[16rem]">
      <div className="flex items-center justify-between px-1">
        <button type="button" className="w-7 h-7 flex items-center justify-center rounded-md text-ink-subtle hover:bg-fill hover:text-primary cursor-pointer" onClick={() => onNav(-1)}><ChevLeft /></button>
        <span className="text-md font-semibold text-ink">Tháng {month + 1} {year}</span>
        <button type="button" className="w-7 h-7 flex items-center justify-center rounded-md text-ink-subtle hover:bg-fill hover:text-primary cursor-pointer" onClick={() => onNav(1)}><ChevRight /></button>
      </div>
      <div className="grid grid-cols-7 text-center">
        {WEEKDAYS_VI.map(w => <span key={w} className="text-sm font-medium text-ink-subtle py-1">{w}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((date, i) => {
          if (!date) return <span key={i} />
          const col = i % 7
          const isFrom = sameDay(from, date)
          const isTo = sameDay(to, date)
          const within = !!from && !!to && date > from && date < to
          const inBand = isFrom || isTo || within
          const roundedL = isFrom || col === 0
          const roundedR = isTo || col === 6
          return (
            <div key={i} className={`h-8 flex items-center justify-center ${inBand ? 'bg-primary-50' : ''} ${roundedL ? 'rounded-l-md' : ''} ${roundedR ? 'rounded-r-md' : ''}`}>
              <button
                type="button"
                onClick={() => onPick(date)}
                className={`w-8 h-8 rounded-full text-md transition-colors cursor-pointer ${
                  isFrom || isTo ? 'bg-primary text-white font-semibold' : 'text-ink hover:bg-fill'
                }`}
              >
                {date.getDate()}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const POP_WIDTH = 620

/** "Từ ngày ... Đến ngày ..." dual-month range picker, cloned from a saved KiotViet reference. */
const EndOfDayDateRangePicker = ({ from, to, onChange }: Props) => {
  const [open, setOpen] = useState(false)
  const [draftFrom, setDraftFrom] = useState<Date | null>(from ? parseYMD(from) : null)
  const [draftTo, setDraftTo] = useState<Date | null>(to ? parseYMD(to) : null)
  const [leftMonth, setLeftMonth] = useState(() => stripTime(from ? parseYMD(from) : new Date()))
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!open) return
    const update = () => {
      const r = btnRef.current?.getBoundingClientRect()
      if (!r) return
      const left = Math.min(r.right + 8, window.innerWidth - POP_WIDTH - 8)
      const top = Math.min(r.top, window.innerHeight - 460)
      setPos({ top: Math.max(8, top), left: Math.max(8, left) })
    }
    update()
    const onDoc = (e: MouseEvent) => {
      if (popRef.current?.contains(e.target as Node)) return
      if (btnRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const rightMonth = new Date(leftMonth.getFullYear(), leftMonth.getMonth() + 1, 1)
  // Both calendars share one cursor a month apart, so either's prev/next shifts them together.
  const navMonths = (dir: -1 | 1) => setLeftMonth(m => new Date(m.getFullYear(), m.getMonth() + dir, 1))

  const pick = (d: Date) => {
    if (!draftFrom || (draftFrom && draftTo)) { setDraftFrom(d); setDraftTo(null); return }
    if (d < draftFrom) { setDraftFrom(d); setDraftTo(draftFrom); return }
    setDraftTo(d)
  }

  const pickToday = () => { const t = stripTime(new Date()); setDraftFrom(t); setDraftTo(t); setLeftMonth(t) }

  const apply = () => { onChange(draftFrom ? toYMD(draftFrom) : '', draftTo ? toYMD(draftTo) : ''); setOpen(false) }

  const label = from || to ? `${fmtDMY(from ? parseYMD(from) : null)} - ${fmtDMY(to ? parseYMD(to) : null)}` : 'Chọn khoảng ngày'

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => {
          if (!open) {
            setDraftFrom(from ? parseYMD(from) : null)
            setDraftTo(to ? parseYMD(to) : null)
            setLeftMonth(stripTime(from ? parseYMD(from) : new Date()))
          }
          setOpen(o => !o)
        }}
        className={`flex items-center justify-between gap-2 w-full h-10 px-3 bg-field border rounded-md cursor-pointer transition-colors text-left ${open ? 'border-primary' : 'border-line-default hover:border-line-strong'}`}
      >
        <span className={`text-md truncate ${from || to ? 'text-ink' : 'text-ink-muted'}`}>{label}</span>
        <CalendarIcon />
      </button>

      {open && (
        <div
          ref={popRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: POP_WIDTH }}
          className="bg-card border border-line-default rounded-xl shadow-lg p-5 z-[var(--kv-z-dropdown)]"
        >
          <div className="flex items-center gap-2 text-md font-bold text-ink mb-4">
            <span>Từ <span className="text-primary">{fmtDMY(draftFrom)}</span></span>
            <span className="text-ink-subtle font-normal">·</span>
            <span>Đến <span className="text-primary">{fmtDMY(draftTo)}</span></span>
          </div>
          <div className="grid grid-cols-2 gap-x-8 divide-x divide-line">
            <div className="pr-4">
              <MonthGrid monthDate={leftMonth} from={draftFrom} to={draftTo} onPick={pick} onNav={navMonths} />
            </div>
            <div className="pl-8">
              <MonthGrid monthDate={rightMonth} from={draftFrom} to={draftTo} onPick={pick} onNav={navMonths} />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <button type="button" className="text-md font-medium text-primary hover:underline cursor-pointer" onClick={pickToday}>Hôm nay</button>
            <div className="flex items-center gap-2">
              <button type="button" className="kv-btn kv-btn-outline-neutral h-10" onClick={() => setOpen(false)}>Bỏ qua</button>
              <button type="button" className="kv-btn kv-btn-primary h-10" onClick={apply}>Áp dụng</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default EndOfDayDateRangePicker
