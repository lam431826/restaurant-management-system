import { useState } from 'react'
import { MONTHS, addDays, sameDay, startOfWeek } from './scheduleUtils'

interface Props {
  weekStart: Date
  onSelectWeek: (weekStart: Date) => void
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

/** Build a 6×7 grid of dates (Mon-first) covering the month of `view`. */
const buildGrid = (view: Date): Date[] => {
  const first = new Date(view.getFullYear(), view.getMonth(), 1)
  const offset = (first.getDay() + 6) % 7
  const start = new Date(first)
  start.setDate(1 - offset)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

const WeekPicker = ({ weekStart, onSelectWeek }: Props) => {
  const [view, setView] = useState(new Date(weekStart.getFullYear(), weekStart.getMonth(), 1))
  const today = new Date()
  const weekEnd = addDays(weekStart, 6)

  const grid = buildGrid(view)
  const move = (delta: number) => setView(v => new Date(v.getFullYear(), v.getMonth() + delta, 1))

  return (
    <div className="bg-card border border-line-default rounded-lg shadow-md p-4 w-[20rem]">
      <div className="flex items-center justify-between mb-2">
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
          const inSelectedWeek = d >= weekStart && d <= weekEnd
          const isEdge = sameDay(d, weekStart) || sameDay(d, weekEnd)
          const isToday = sameDay(d, today)
          return (
            <button
              key={i}
              onClick={() => onSelectWeek(startOfWeek(d))}
              className={[
                'h-8 w-8 mx-auto flex items-center justify-center text-md cursor-pointer transition-colors',
                isEdge ? 'rounded-full bg-primary text-white font-semibold'
                  : inSelectedWeek ? `bg-primary-100 ${isToday ? 'text-primary font-semibold' : 'text-ink'}`
                  : isToday ? 'rounded-full text-primary font-semibold ring-1 ring-primary'
                  : inMonth ? 'rounded-full text-ink' : 'rounded-full text-ink-disabled',
              ].join(' ')}
            >
              {d.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default WeekPicker
