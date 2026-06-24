import { useEffect, useRef, useState } from 'react'

interface Props {
  from: Date | null
  to: Date | null
  onChange: (from: Date | null, to: Date | null) => void
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const pad = (n: number) => String(n).padStart(2, '0')
const fmt = (d: Date | null) => (d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : '—')
const sameDay = (a: Date | null, b: Date) =>
  !!a && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const longDate = (d: Date | null) => (d ? d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : '')

const ChevLeft = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
const ChevRight = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
const CalendarIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted">
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

const MonthCalendar = ({ value, onPick }: { value: Date | null; onPick: (d: Date) => void }) => {
  const [view, setView] = useState<Date>(() => value ?? new Date())
  const year = view.getFullYear()
  const month = view.getMonth()
  const startDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: { date: Date; inMonth: boolean }[] = []
  for (let i = 0; i < 42; i++) {
    const dayNum = i - startDay + 1
    let date: Date
    let inMonth = true
    if (dayNum < 1 || dayNum > daysInMonth) { date = new Date(year, month, dayNum); inMonth = false }
    else date = new Date(year, month, dayNum)
    cells.push({ date, inMonth })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <button type="button" className="w-7 h-7 flex items-center justify-center rounded-md text-ink-subtle hover:bg-fill hover:text-primary" onClick={() => setView(new Date(year, month - 1, 1))}><ChevLeft /></button>
        <span className="text-md font-semibold text-ink">{view.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
        <button type="button" className="w-7 h-7 flex items-center justify-center rounded-md text-ink-subtle hover:bg-fill hover:text-primary" onClick={() => setView(new Date(year, month + 1, 1))}><ChevRight /></button>
      </div>
      <div className="grid grid-cols-7 text-center bg-primary-25 rounded-md">
        {WEEKDAYS.map(w => <span key={w} className="text-sm font-medium text-ink-subtle py-1">{w}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map(({ date, inMonth }, i) => {
          const selected = sameDay(value, date)
          return (
            <button
              key={i}
              type="button"
              onClick={() => { onPick(date); if (!inMonth) setView(new Date(date.getFullYear(), date.getMonth(), 1)) }}
              className={`h-8 mx-auto w-8 rounded-md text-md transition-colors ${
                selected ? 'bg-primary-100 text-primary-700 font-semibold'
                  : inMonth ? 'text-ink hover:bg-fill' : 'text-ink-disabled hover:bg-fill'
              }`}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>
      <div className="text-center text-md text-ink-subtle pt-1">{longDate(value)}</div>
    </div>
  )
}

const POP_WIDTH = 840

const DateRangeField = ({ from, to, onChange }: Props) => {
  const [open, setOpen] = useState(false)
  const [draftFrom, setDraftFrom] = useState<Date | null>(from)
  const [draftTo, setDraftTo] = useState<Date | null>(to)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!open) return
    setDraftFrom(from); setDraftTo(to)
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
  }, [open, from, to])

  const apply = () => { onChange(draftFrom, draftTo); setOpen(false) }

  const label = from || to ? `${fmt(from)} - ${fmt(to)}` : 'Chọn khoảng ngày'

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center justify-between gap-2 w-full min-h-9 px-3 py-1.5 bg-field border rounded-md cursor-pointer transition-colors text-left ${open ? 'border-primary' : 'border-line-default hover:border-line-strong'}`}
      >
        <span className={`text-md ${from || to ? 'text-ink' : 'text-ink-muted'}`}>{label}</span>
        <CalendarIcon />
      </button>

      {open && (
        <div
          ref={popRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: POP_WIDTH }}
          className="bg-card border border-line-default rounded-xl shadow-lg p-5 z-[var(--kv-z-dropdown)]"
        >
          <div className="grid grid-cols-2 gap-x-8 divide-x divide-line">
            <div className="pr-4">
              <div className="text-md font-bold text-ink mb-3">Từ ngày: <span className="text-primary">{fmt(draftFrom)}</span></div>
              <MonthCalendar value={draftFrom} onPick={setDraftFrom} />
            </div>
            <div className="pl-8">
              <div className="text-md font-bold text-ink mb-3">Đến ngày: <span className="text-primary">{fmt(draftTo)}</span></div>
              <MonthCalendar value={draftTo} onPick={setDraftTo} />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button className="kv-btn kv-btn-primary h-10" onClick={apply}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
              Tìm kiếm
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default DateRangeField
