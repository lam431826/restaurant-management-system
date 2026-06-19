import { useState } from 'react'

interface Props {
  selected: Date
  onSelect: (d: Date) => void
}

const MONTHS = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']
const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const FULL_WEEKDAYS = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/** Build a 6×7 grid of dates (Mon-first) covering the month of `view`. */
const buildGrid = (view: Date): Date[] => {
  const first = new Date(view.getFullYear(), view.getMonth(), 1)
  // JS: 0=Sun..6=Sat → shift to Mon-first (Mon=0..Sun=6)
  const offset = (first.getDay() + 6) % 7
  const start = new Date(first)
  start.setDate(1 - offset)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

const MiniCalendar = ({ selected, onSelect }: Props) => {
  const [view, setView] = useState(new Date(selected.getFullYear(), selected.getMonth(), 1))
  const today = new Date(2026, 5, 17) // matches the app's "today" (17/06/2026)

  const grid = buildGrid(view)
  const move = (delta: number) => setView(v => new Date(v.getFullYear(), v.getMonth() + delta, 1))

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-md font-bold text-ink">{MONTHS[view.getMonth()]}, {view.getFullYear()}</span>
        <div className="flex items-center gap-1">
          <button className="w-7 h-7 flex items-center justify-center rounded-md text-ink-subtle cursor-pointer hover:bg-fill" onClick={() => move(-1)} aria-label="Tháng trước">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button className="w-7 h-7 flex items-center justify-center rounded-md text-ink-subtle cursor-pointer hover:bg-fill" onClick={() => move(1)} aria-label="Tháng sau">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map(w => (
          <div key={w} className="text-sm font-medium text-ink-muted py-1">{w}</div>
        ))}
        {grid.map((d, i) => {
          const inMonth = d.getMonth() === view.getMonth()
          const isSelected = sameDay(d, selected)
          const isToday = sameDay(d, today)
          return (
            <button
              key={i}
              onClick={() => onSelect(new Date(d))}
              className={[
                'h-8 w-8 mx-auto flex items-center justify-center rounded-full text-md cursor-pointer transition-colors',
                isSelected ? 'bg-primary text-white font-semibold'
                  : isToday ? 'text-primary font-semibold ring-1 ring-primary'
                  : inMonth ? 'text-ink hover:bg-fill' : 'text-ink-disabled hover:bg-fill',
              ].join(' ')}
            >
              {d.getDate()}
            </button>
          )
        })}
      </div>

      <div className="text-sm text-ink-subtle mt-1">
        Hôm nay <button className="text-primary font-medium hover:underline" onClick={() => { setView(new Date(today.getFullYear(), today.getMonth(), 1)); onSelect(new Date(today)) }}>
          {FULL_WEEKDAYS[today.getDay()]}, {today.getDate()} {MONTHS[today.getMonth()]}, {today.getFullYear()}
        </button>
      </div>
    </div>
  )
}

export default MiniCalendar
