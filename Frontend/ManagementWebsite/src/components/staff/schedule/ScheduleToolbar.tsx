import { useEffect, useRef, useState } from 'react'
import type { StaffSummary } from './Schedule'
import { addDays, sameDay, startOfWeek, weekOfMonth } from './scheduleUtils'
import WeekPicker from './WeekPicker'

interface Props {
  employees: StaffSummary[]
  search: string
  onSearch: (v: string) => void
  weekStart: Date
  onWeekChange: (weekStart: Date) => void
  viewMode: 'employee' | 'shift'
  onViewMode: (v: 'employee' | 'shift') => void
  onImport: () => void
  onExport: () => void
}

const ChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-ink-muted shrink-0">
    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const ScheduleToolbar = ({ employees, search, onSearch, weekStart, onWeekChange, viewMode, onViewMode, onImport, onExport }: Props) => {
  const [searchOpen, setSearchOpen] = useState(false)
  const [weekOpen, setWeekOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const weekRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const t = e.target as Node
      if (searchRef.current && !searchRef.current.contains(t)) setSearchOpen(false)
      if (weekRef.current && !weekRef.current.contains(t)) setWeekOpen(false)
      if (viewRef.current && !viewRef.current.contains(t)) setViewOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const weekEnd = addDays(weekStart, 6)
  const isCurrentWeek = sameDay(weekStart, startOfWeek(new Date()))
  const filteredEmployees = employees.filter(e => e.fullName.toLowerCase().includes(search.trim().toLowerCase()))

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <h1 className="text-h3 font-extrabold text-ink mr-2">Lịch làm việc</h1>

      <div ref={searchRef} className="relative w-[18rem]">
        <button
          onClick={() => setSearchOpen(o => !o)}
          className={`flex items-center gap-2 w-full h-10 px-3 bg-card border rounded-md cursor-pointer transition-colors ${searchOpen ? 'border-primary' : 'border-line-default hover:border-line-strong'}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted shrink-0">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className={`flex-1 text-left text-md truncate ${search ? 'text-ink' : 'text-ink-muted'}`}>{search || 'Tìm kiếm nhân viên'}</span>
          <ChevronDown />
        </button>
        {searchOpen && (
          <div className="absolute top-[calc(100%+0.4rem)] left-0 right-0 bg-card border border-line-default rounded-md shadow-md z-[var(--kv-z-dropdown)] py-2">
            <input
              autoFocus
              className="w-full px-3 pb-2 text-md text-ink bg-transparent border-b border-line focus:outline-none"
              placeholder="Nhập tên nhân viên"
              value={search}
              onChange={e => onSearch(e.target.value)}
            />
            <div className="max-h-[16rem] overflow-y-auto mt-1">
              {filteredEmployees.length === 0 && <div className="px-3 py-2 text-md text-ink-subtle">Không có nhân viên phù hợp</div>}
              {filteredEmployees.map(e => (
                <div key={e.id} className="px-3 py-2 text-md text-ink truncate">{e.fullName}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          className="w-9 h-9 flex items-center justify-center border border-line-default rounded-md bg-card text-ink-subtle cursor-pointer hover:border-primary hover:text-primary"
          onClick={() => onWeekChange(addDays(weekStart, -7))}
          aria-label="Tuần trước"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>

        <div ref={weekRef} className="relative">
          <button
            onClick={() => setWeekOpen(o => !o)}
            className="h-10 px-4 bg-card border border-line-default rounded-md text-md text-ink cursor-pointer hover:border-line-strong whitespace-nowrap"
          >
            Tuần {weekOfMonth(weekStart)} - Th. {weekEnd.getMonth() + 1} {weekEnd.getFullYear()}
          </button>
          {weekOpen && (
            <div className="absolute top-[calc(100%+0.4rem)] left-0 z-[var(--kv-z-dropdown)]">
              <WeekPicker weekStart={weekStart} onSelectWeek={d => { onWeekChange(d); setWeekOpen(false) }} />
            </div>
          )}
        </div>

        <button
          className="w-9 h-9 flex items-center justify-center border border-line-default rounded-md bg-card text-ink-subtle cursor-pointer hover:border-primary hover:text-primary"
          onClick={() => onWeekChange(addDays(weekStart, 7))}
          aria-label="Tuần sau"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>

        <button
          disabled={isCurrentWeek}
          className="kv-btn kv-btn-outline-neutral h-10 bg-card disabled:opacity-50"
          onClick={() => onWeekChange(startOfWeek(new Date()))}
        >
          Tuần này
        </button>
      </div>

      <div className="flex-1" />

      <div ref={viewRef} className="relative">
        <button
          onClick={() => setViewOpen(o => !o)}
          className="flex items-center gap-2 h-10 px-3 bg-card border border-line-default rounded-md text-md text-ink cursor-pointer hover:border-line-strong"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
          {viewMode === 'employee' ? 'Xem theo nhân viên' : 'Xem theo ca'}
          <ChevronDown />
        </button>
        {viewOpen && (
          <div className="absolute right-0 top-[calc(100%+0.4rem)] bg-card border border-line-default rounded-md shadow-md min-w-[16rem] py-1 z-[var(--kv-z-dropdown)]">
            {([['employee', 'Xem theo nhân viên'], ['shift', 'Xem theo ca']] as const).map(([id, label]) => (
              <button
                key={id}
                className="flex items-center justify-between w-full text-left px-4 py-2 text-md text-ink cursor-pointer hover:bg-[var(--kv-state-hover-bg)]"
                onClick={() => { onViewMode(id); setViewOpen(false) }}
              >
                {label}
                {viewMode === id && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><polyline points="20 6 9 17 4 12" /></svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <button className="kv-btn kv-btn-outline-neutral h-10 bg-card" onClick={onImport}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Import
      </button>
      <button className="kv-btn kv-btn-outline-neutral h-10 bg-card" onClick={onExport}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        Xuất file
      </button>
    </div>
  )
}

export default ScheduleToolbar
