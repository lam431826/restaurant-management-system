import { useMemo, useState } from 'react'
import MiniCalendar from './MiniCalendar'
import type { Reservation, ReservationStatus } from '../../data/mockData'
import { rooms, reservationAreaOrder, reservationStatusMeta } from '../../data/mockData'

interface Props {
  reservations: Reservation[]
  selectedDate: Date
  onSelectDate: (d: Date) => void
}

const HOURS = Array.from({ length: 10 }, (_, i) => 14 + i) // 14:00 → 23:00
const COL_W = 130
const LABEL_W = 280
const ROW_H = 43
const NOW = 21 + 5 / 60 // current-time marker (~21:05)

/* Timeline status filters (matches the model: Đã hủy off by default) */
const TIMELINE_STATUSES: ReservationStatus[] = ['arranged', 'received', 'overtime', 'cancelled']

const Chevron = ({ open }: { open: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={`text-ink-muted transition-transform ${open ? '' : '-rotate-90'}`}>
    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const StatusCheck = ({ status, checked, onChange }: { status: ReservationStatus; checked: boolean; onChange: () => void }) => {
  const meta = reservationStatusMeta[status]
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={onChange} className="absolute opacity-0 w-0 h-0 peer" />
      <span
        className="w-[1.7rem] h-[1.7rem] rounded-xxs border-2 flex items-center justify-center transition-colors"
        style={{ borderColor: meta.color, background: checked ? meta.color : 'transparent' }}
      >
        {checked && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        )}
      </span>
      <span className="text-md text-ink">{meta.label}</span>
    </label>
  )
}

const CalendarView = ({ reservations, selectedDate, onSelectDate }: Props) => {
  const [view, setView] = useState<'day' | 'week' | 'month'>('day')
  const [statuses, setStatuses] = useState<Set<ReservationStatus>>(new Set(['arranged', 'received', 'overtime']))
  const [openAreas, setOpenAreas] = useState<Set<string>>(new Set(reservationAreaOrder))
  const [roomsOpen, setRoomsOpen] = useState(false)
  const [waitOpen, setWaitOpen] = useState(true)
  const [waitSearch, setWaitSearch] = useState('')

  const toggleStatus = (s: ReservationStatus) =>
    setStatuses(prev => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s); else next.add(s)
      return next
    })
  const toggleArea = (a: string) =>
    setOpenAreas(prev => {
      const next = new Set(prev)
      if (next.has(a)) next.delete(a); else next.add(a)
      return next
    })

  // Group rooms by area in reception order
  const grouped = useMemo(
    () => reservationAreaOrder.map(area => ({ area, tables: rooms.filter(r => r.area === area) })),
    []
  )

  const visibleRes = reservations.filter(r => statuses.has(r.status))
  const resByTable = useMemo(() => {
    const map = new Map<string, Reservation[]>()
    for (const r of visibleRes) {
      const list = map.get(r.table) ?? []
      list.push(r)
      map.set(r.table, list)
    }
    return map
  }, [visibleRes])

  const gridWidth = LABEL_W + HOURS.length * COL_W

  return (
    <div className="flex flex-1 min-h-0">
      {/* Sidebar */}
      <aside className="w-[26rem] shrink-0 flex flex-col border-r border-line bg-card overflow-y-auto p-4 gap-4">
        <MiniCalendar selected={selectedDate} onSelect={onSelectDate} />

        <div className="border-t border-line pt-3">
          <button className="flex items-center justify-between w-full text-md font-semibold text-ink cursor-pointer" onClick={() => setRoomsOpen(o => !o)}>
            Phòng/Bàn <Chevron open={roomsOpen} />
          </button>
          {roomsOpen && (
            <div className="mt-2 flex flex-col gap-1">
              {reservationAreaOrder.map(a => (
                <label key={a} className="kv-check">
                  <input type="checkbox" defaultChecked />
                  <span className="kv-check-box" /><span className="kv-check-text">{a}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-line pt-3 flex-1 min-h-0 flex flex-col">
          <button className="flex items-center justify-between w-full text-md font-semibold text-ink cursor-pointer" onClick={() => setWaitOpen(o => !o)}>
            Chờ xếp bàn <Chevron open={waitOpen} />
          </button>
          {waitOpen && (
            <div className="mt-2 flex flex-col gap-3">
              <div className="relative flex items-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 text-ink-muted pointer-events-none">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  className="w-full h-10 pl-9 pr-3 bg-field border border-line-default rounded-md text-md text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary"
                  placeholder="Tìm theo khách đặt"
                  value={waitSearch}
                  onChange={e => setWaitSearch(e.target.value)}
                />
              </div>
              <div className="text-md text-ink-muted text-center py-4">Không có phiếu đặt nào</div>
            </div>
          )}
        </div>
      </aside>

      {/* Main timeline */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Sub-tabs */}
        <div className="flex items-center gap-6 px-5 pt-3 border-b border-line">
          {([['day', 'Ngày'], ['week', 'Tuần'], ['month', 'Tháng']] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`relative h-9 text-md font-semibold cursor-pointer transition-colors ${view === id ? 'text-primary' : 'text-ink-subtle hover:text-ink'}`}
            >
              {label}
              {view === id && <span className="absolute left-0 right-0 -bottom-px h-[0.25rem] bg-primary rounded-full" />}
            </button>
          ))}
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-6 px-5 py-3">
          {TIMELINE_STATUSES.map(s => (
            <StatusCheck key={s} status={s} checked={statuses.has(s)} onChange={() => toggleStatus(s)} />
          ))}
        </div>

        {/* Timeline grid */}
        <div className="flex-1 min-h-0 overflow-auto">
          <div style={{ width: gridWidth, minWidth: '100%' }} className="relative">
            {/* Header row */}
            <div className="flex sticky top-0 z-10 bg-card border-b border-line">
              <div className="shrink-0 flex items-center px-4 py-3 text-md font-bold text-ink-strong uppercase border-r border-line" style={{ width: LABEL_W }}>
                Phòng/Bàn
              </div>
              {HOURS.map(h => (
                <div key={h} className="shrink-0 px-3 py-3 text-md text-ink-subtle border-r border-line" style={{ width: COL_W }}>
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Now marker */}
            <div
              className="absolute top-0 bottom-0 w-px bg-danger z-20 pointer-events-none"
              style={{ left: LABEL_W + (NOW - HOURS[0]) * COL_W }}
            >
              <span className="absolute -top-0 -left-[5px] w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-danger" />
            </div>

            {/* Area groups */}
            {grouped.map(({ area, tables }) => {
              const open = openAreas.has(area)
              return (
                <div key={area}>
                  {/* Area band */}
                  <div className="flex bg-fill border-b border-line" style={{ height: ROW_H }}>
                    <button
                      className="shrink-0 flex items-center justify-between px-4 text-md font-semibold text-ink cursor-pointer border-r border-line"
                      style={{ width: LABEL_W }}
                      onClick={() => toggleArea(area)}
                    >
                      {area} <Chevron open={open} />
                    </button>
                    <div className="flex-1" />
                  </div>

                  {open && tables.map(t => (
                    <div key={t.id} className="flex border-b border-line relative hover:bg-primary-25" style={{ height: ROW_H }}>
                      <div className="shrink-0 flex items-center px-4 text-md text-ink border-r border-line" style={{ width: LABEL_W }}>
                        {t.name}
                      </div>
                      {HOURS.map(h => (
                        <div key={h} className="shrink-0 border-r border-line" style={{ width: COL_W }} />
                      ))}

                      {/* Reservation blocks */}
                      {(resByTable.get(t.name) ?? []).map(r => {
                        const meta = reservationStatusMeta[r.status]
                        return (
                          <div
                            key={r.code}
                            className="absolute top-1 bottom-1 rounded-md px-2 flex flex-col justify-center text-white text-sm overflow-hidden cursor-pointer shadow-sm"
                            style={{
                              left: LABEL_W + (r.startHour - HOURS[0]) * COL_W,
                              width: r.durationH * COL_W - 4,
                              background: meta.color,
                            }}
                            title={`${r.customer} · ${r.guests} khách · ${meta.label}`}
                          >
                            <span className="font-semibold truncate leading-tight">{r.customer}</span>
                            <span className="truncate leading-tight opacity-90">{r.guests} khách</span>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CalendarView
