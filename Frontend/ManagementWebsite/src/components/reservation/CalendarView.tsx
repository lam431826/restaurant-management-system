import { useEffect, useMemo, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import MiniCalendar from './MiniCalendar'
import type { Reservation, ReservationStatus } from '../../data/mockData'
import { reservationStatusMeta } from '../../data/mockData'
import type { TableDto } from '../../api/tables'
import type { UserRole } from '../../context/AuthContext'

interface Props {
  reservations: Reservation[]
  tables: TableDto[]
  selectedDate: Date
  onSelectDate: (d: Date) => void
  onAssignTable: (reservationId: string, tableId: string) => void
  onTransferTable?: (reservationId: string, tableId: string) => void
  onConfirm?: (id: string) => void
  onCheckIn?: (id: string) => void
  onCancel?: (id: string) => void
  onEdit?: (id: string) => void
  role?: UserRole
}

const HOURS = Array.from({ length: 10 }, (_, i) => 14 + i) // 14:00 → 23:00
const COL_W = 130
const LABEL_W = 280
const ROW_H = 43
const NOW = new Date().getHours() + new Date().getMinutes() / 60

const TIMELINE_STATUSES: ReservationStatus[] = ['CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'NO_SHOW', 'CANCELLED']

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

// arriveTime format: "dd/MM/yyyy HH:mm"
const getResDate = (r: Reservation): Date => {
  const [day, month, year] = r.arriveTime.split(' ')[0].split('/')
  return new Date(+year, +month - 1, +day)
}

const Chevron = ({ open }: { open: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={`text-ink-muted transition-transform ${open ? '' : '-rotate-90'}`}>
    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const StatusChip = ({ status, checked, onChange }: { status: ReservationStatus; checked: boolean; onChange: () => void }) => {
  const meta = reservationStatusMeta[status]
  return (
    <button
      onClick={onChange}
      className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[12px] font-medium transition-colors cursor-pointer select-none"
      style={checked
        ? { background: meta.color + '20', borderColor: meta.color, color: meta.color }
        : { background: 'transparent', borderColor: 'var(--kv-border-default)', color: 'var(--kv-text-muted)' }
      }
    >
      <span className="w-2 h-2 rounded-full" style={{ background: checked ? meta.color : 'var(--kv-text-muted)' }} />
      {meta.label}
    </button>
  )
}

const AssignTableDropdown = ({
  tables,
  partySize,
  onAssign,
  onClose,
}: {
  tables: TableDto[]
  partySize: number
  onAssign: (tableId: string) => void
  onClose: () => void
}) => {
  const areas = useMemo(() => [...new Set(tables.map(t => t.area))], [tables])
  const available = tables.filter(t => t.status === 'AVAILABLE' && t.capacity >= partySize)
  const anchorRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState<{ top: number; bottom: number; left: number; width: number } | null>(null)

  useEffect(() => {
    const update = () => {
      if (anchorRef.current) {
        const parent = anchorRef.current.parentElement
        if (parent) {
          const rect = parent.getBoundingClientRect()
          setCoords({
            top: rect.top,
            bottom: rect.bottom,
            left: rect.left,
            width: rect.width,
          })
        }
      }
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Element
      if (anchorRef.current && anchorRef.current.parentElement?.contains(target)) return
      if (dropdownRef.current && dropdownRef.current.contains(target)) return
      onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const preferTop = coords ? (window.innerHeight - coords.bottom < 280 && coords.top > 280) : false

  const style: React.CSSProperties = coords ? {
    position: 'fixed',
    left: `${coords.left}px`,
    zIndex: 9999,
    ...(preferTop ? {
      bottom: `${window.innerHeight - coords.top + 4}px`,
    } : {
      top: `${coords.bottom + 4}px`,
    })
  } : { visibility: 'hidden' }

  return (
    <>
      <div ref={anchorRef} className="hidden" />
      {createPortal(
        <div
          ref={dropdownRef}
          data-assign-dropdown
          className="w-64 bg-card border border-line rounded-lg shadow-lg overflow-hidden"
          style={style}
        >
          <div className="px-3 py-2 text-sm font-semibold text-ink-subtle border-b border-line">
            Chọn bàn <span className="font-normal text-ink-muted">({partySize} khách)</span>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {areas.map(area => {
              const areaAvail = available.filter(t => t.area === area)
              if (!areaAvail.length) return null
              return (
                <div key={area}>
                  <div className="px-3 py-1 text-xs font-semibold text-ink-muted bg-fill">{area}</div>
                  {areaAvail.map(t => (
                    <button
                      key={t.id}
                      onClick={() => onAssign(t.id)}
                      className="w-full flex items-center justify-between px-3 py-2 text-md text-ink hover:bg-primary-25 cursor-pointer"
                    >
                      <span>{t.name}</span>
                      <span className="text-xs text-ink-muted">{t.capacity} chỗ</span>
                    </button>
                  ))}
                </div>
              )
            })}
            {!available.length && (
              <div className="px-3 py-4 text-md text-ink-muted text-center">
                Không có bàn trống phù hợp với {partySize} khách
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

// Detail panel info row
const DItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex flex-col gap-0.5 min-w-0">
    <span className="text-xs text-ink-muted font-medium">{label}</span>
    <span className="text-md text-ink font-medium truncate">{value}</span>
  </div>
)

const CalendarView = ({
  reservations, tables, selectedDate, onSelectDate, onAssignTable, onTransferTable,
  onConfirm, onCheckIn, onCancel, onEdit, role,
}: Props) => {
  const [statuses, setStatuses] = useState<Set<ReservationStatus>>(new Set(['CONFIRMED', 'CHECKED_IN']))
  const [openAreas, setOpenAreas] = useState<Set<string>>(new Set())
  const [roomsOpen, setRoomsOpen] = useState(false)
  const [waitOpen, setWaitOpen] = useState(true)
  const [waitSearch, setWaitSearch] = useState('')
  const [assigningFor, setAssigningFor] = useState<string | null>(null)
  const [assigningInDetail, setAssigningInDetail] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTargetTableId, setDropTargetTableId] = useState<string | null>(null)
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null)

  useEffect(() => {
    if (tables.length > 0) setOpenAreas(new Set(tables.map(t => t.area)))
  }, [tables])

  // Clear selected when date changes
  useEffect(() => { setSelectedRes(null) }, [selectedDate])

  const toggleStatus = (s: ReservationStatus) =>
    setStatuses(prev => { const next = new Set(prev); if (next.has(s)) next.delete(s); else next.add(s); return next })

  const toggleArea = (a: string) =>
    setOpenAreas(prev => { const next = new Set(prev); if (next.has(a)) next.delete(a); else next.add(a); return next })

  const selectRes = (r: Reservation) =>
    setSelectedRes(prev => prev?.id === r.id ? null : r)

  const grouped = useMemo(() => {
    const areas = [...new Set(tables.map(t => t.area))]
    return areas.map(area => ({ area, tables: tables.filter(t => t.area === area) }))
  }, [tables])

  const visibleRes = useMemo(
    () => reservations.filter(r => statuses.has(r.status) && isSameDay(getResDate(r), selectedDate)),
    [reservations, statuses, selectedDate]
  )

  const resByTable = useMemo(() => {
    const map = new Map<string, Reservation[]>()
    for (const r of visibleRes) {
      if (r.table === '—') continue
      const list = map.get(r.table) ?? []
      list.push(r)
      map.set(r.table, list)
    }
    return map
  }, [visibleRes])

  const waitingRes = useMemo(
    () => reservations.filter(r =>
      r.table === '—' &&
      (r.status === 'PENDING' || r.status === 'CONFIRMED') &&
      isSameDay(getResDate(r), selectedDate)
    ),
    [reservations, selectedDate]
  )
  const filteredWaiting = waitSearch.trim()
    ? waitingRes.filter(r => r.customer.toLowerCase().includes(waitSearch.toLowerCase()))
    : waitingRes

  const gridWidth = LABEL_W + HOURS.length * COL_W

  // Detail panel helpers
  const closeDetail = () => setSelectedRes(null)
  const act = (fn?: (id: string) => void) => {
    if (fn && selectedRes) { fn(selectedRes.id); closeDetail() }
  }

  return (
    <div className="flex flex-1 min-h-0">
      {/* Sidebar */}
      <aside className="w-[26rem] shrink-0 flex flex-col border-r border-line bg-card overflow-y-auto p-4 gap-4">
        <MiniCalendar selected={selectedDate} onSelect={onSelectDate} />

        {/* Phòng/Bàn filter */}
        <div className="border-t border-line pt-3">
          <button className="flex items-center justify-between w-full text-md font-semibold text-ink cursor-pointer" onClick={() => setRoomsOpen(o => !o)}>
            Phòng/Bàn <Chevron open={roomsOpen} />
          </button>
          {roomsOpen && (
            <div className="mt-2 flex flex-col gap-1">
              {[...new Set(tables.map(t => t.area))].map(a => (
                <label key={a} className="kv-check">
                  <input type="checkbox" defaultChecked />
                  <span className="kv-check-box" /><span className="kv-check-text">{a}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Chờ xếp bàn */}
        <div className="border-t border-line pt-3 flex-1 min-h-0 flex flex-col">
          <button className="flex items-center justify-between w-full text-md font-semibold text-ink cursor-pointer" onClick={() => setWaitOpen(o => !o)}>
            <span>Chờ xếp bàn {waitingRes.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-warning/20 text-warning text-xs font-bold rounded-full">{waitingRes.length}</span>}</span>
            <Chevron open={waitOpen} />
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

              {filteredWaiting.length === 0 ? (
                <div className="text-md text-ink-muted text-center py-4">Không có phiếu đặt nào</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {filteredWaiting.map(r => {
                    const meta = reservationStatusMeta[r.status]
                    const isSelected = selectedRes?.id === r.id
                    return (
                      <div
                        key={r.id}
                        onClick={() => selectRes(r)}
                        className={`border rounded-lg p-3 flex flex-col gap-1 transition-colors cursor-pointer ${isSelected ? 'border-primary bg-primary-25' : 'border-line hover:border-primary'}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-md font-semibold text-ink">{r.customer}</span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: meta.color, background: `${meta.color}22` }}>{meta.label}</span>
                        </div>
                        <div className="text-sm text-ink-muted">{r.arriveTime} · {r.guests} khách</div>
                        {r.note && <div className="text-sm text-ink-subtle truncate">{r.note}</div>}

                        {r.status === 'CONFIRMED' ? (
                          <div className="relative mt-1" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setAssigningFor(assigningFor === r.id ? null : r.id)}
                              className="kv-btn kv-btn-outline-primary h-8 text-sm w-full"
                            >
                              Xếp bàn
                            </button>
                            {assigningFor === r.id && (
                              <AssignTableDropdown
                                tables={tables}
                                partySize={r.guests}
                                onAssign={tableId => { onAssignTable(r.id, tableId); setAssigningFor(null) }}
                                onClose={() => setAssigningFor(null)}
                              />
                            )}
                          </div>
                        ) : (
                          <div className="mt-1 text-xs text-ink-muted italic">Xác nhận đặt bàn trước khi xếp bàn</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main timeline */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* View label */}
        <div className="flex items-center gap-6 px-5 pt-3 border-b border-line shrink-0">
          <span className="relative h-9 text-md font-semibold text-primary">
            Ngày
            <span className="absolute left-0 right-0 -bottom-px h-[0.25rem] bg-primary rounded-full" />
          </span>
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-2 px-5 py-2.5 border-b border-line flex-wrap bg-card shrink-0">
          <span className="text-[12px] text-ink-muted font-medium mr-1">Trạng thái:</span>
          {TIMELINE_STATUSES.map(s => (
            <StatusChip key={s} status={s} checked={statuses.has(s)} onChange={() => toggleStatus(s)} />
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
            {NOW >= HOURS[0] && NOW <= HOURS[HOURS.length - 1] + 1 && (
              <div
                className="absolute top-0 bottom-0 w-px bg-danger z-20 pointer-events-none"
                style={{ left: LABEL_W + (NOW - HOURS[0]) * COL_W }}
              >
                <span className="absolute -top-0 -left-[5px] w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-danger" />
              </div>
            )}

            {/* Area groups */}
            {grouped.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-md text-ink-muted">Đang tải dữ liệu bàn...</div>
            ) : (
              grouped.map(({ area, tables: areaTables }) => {
                const open = openAreas.has(area)
                return (
                  <div key={area}>
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

                    {open && areaTables.map(t => {
                      const isDropTarget = dropTargetTableId === t.id
                      return (
                        <div
                          key={t.id}
                          className={`flex border-b border-line relative transition-colors ${isDropTarget ? 'bg-primary-25' : 'hover:bg-primary-25'}`}
                          style={{
                            height: ROW_H,
                            outline: isDropTarget ? '2px solid var(--kv-primary)' : undefined,
                            outlineOffset: '-2px',
                          }}
                          onDragOver={e => { if (draggingId) { e.preventDefault(); setDropTargetTableId(t.id) } }}
                          onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropTargetTableId(null) }}
                          onDrop={e => {
                            e.preventDefault()
                            if (draggingId) {
                              const dragRes = reservations.find(r => r.id === draggingId)
                              if (dragRes && dragRes.table !== t.name) {
                                if (dragRes.status === 'CHECKED_IN') onTransferTable?.(draggingId, t.id)
                                else onAssignTable(draggingId, t.id)
                              }
                            }
                            setDraggingId(null)
                            setDropTargetTableId(null)
                          }}
                        >
                          <div className="shrink-0 flex items-center px-4 border-r border-line gap-2" style={{ width: LABEL_W }}>
                            <span className="text-md text-ink">{t.name}</span>
                            <span className="text-xs text-ink-muted">{t.capacity} chỗ</span>
                          </div>
                          {HOURS.map(h => (
                            <div key={h} className="shrink-0 border-r border-line" style={{ width: COL_W }} />
                          ))}

                          {/* Reservation blocks */}
                          {(resByTable.get(t.name) ?? []).map(r => {
                            const meta = reservationStatusMeta[r.status]
                            const isSelected = selectedRes?.id === r.id
                            const isDraggable = r.status === 'PENDING' || r.status === 'CONFIRMED' || r.status === 'CHECKED_IN'
                            const isDragging = draggingId === r.id
                            return (
                              <div
                                key={r.code}
                                draggable={isDraggable}
                                onDragStart={e => { setDraggingId(r.id); e.dataTransfer.effectAllowed = 'move'; e.stopPropagation() }}
                                onDragEnd={() => { setDraggingId(null); setDropTargetTableId(null) }}
                                onClick={() => !isDragging && selectRes(r)}
                                className="absolute top-1 bottom-1 rounded-md px-2 flex flex-col justify-center text-white text-sm overflow-hidden shadow-sm transition-all select-none"
                                style={{
                                  left: LABEL_W + (r.startHour - HOURS[0]) * COL_W,
                                  width: r.durationH * COL_W - 4,
                                  background: meta.color,
                                  outline: isSelected ? '2px solid white' : undefined,
                                  boxShadow: isSelected ? `0 0 0 3px ${meta.color}` : undefined,
                                  opacity: isDragging ? 0.4 : 1,
                                  cursor: isDraggable ? 'grab' : 'pointer',
                                }}
                                title={`${r.customer} · ${r.guests} khách · ${meta.label}${isDraggable ? ' · Kéo để đổi bàn' : ''}`}
                              >
                                <span className="font-semibold truncate leading-tight">{r.customer}</span>
                                <span className="truncate leading-tight opacity-90">{r.guests} khách</span>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── Reservation detail panel — mở rộng xuống dưới ─────────────────── */}
        {selectedRes && (() => {
          const meta = reservationStatusMeta[selectedRes.status]
          const s = selectedRes.status
          const canAct = s === 'PENDING' || s === 'CONFIRMED'
          const isCheckedIn = s === 'CHECKED_IN'
          return (
            <div className="shrink-0 border-t-[3px] bg-card" style={{ borderColor: meta.color }}>
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-line">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <span className="text-md font-bold text-ink truncate">{selectedRes.customer}</span>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
                    style={{ color: meta.color, background: `${meta.color}22` }}
                  >{meta.label}</span>
                  <span className="text-md text-ink-muted shrink-0">{selectedRes.phone}</span>
                </div>
                <button
                  onClick={closeDetail}
                  className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-ink-muted hover:bg-fill cursor-pointer"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="flex items-start gap-8 px-5 py-3">
                {/* Info grid */}
                <div className="grid grid-cols-4 gap-x-8 gap-y-3 flex-1 min-w-0">
                  <DItem label="Giờ đến" value={selectedRes.arriveTime} />
                  <DItem label="Số khách" value={`${selectedRes.guests} người`} />

                  {/* Bàn — inline editable for active / checked-in reservations */}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-xs text-ink-muted font-medium">Bàn</span>
                    <div className="relative" data-assign-dropdown>
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-md text-ink font-medium truncate">
                          {selectedRes.table !== '—'
                            ? selectedRes.table
                            : <span className="text-ink-muted font-normal">Chưa xếp</span>
                          }
                        </span>
                        {(canAct || isCheckedIn) && (
                          <button
                            onClick={() => setAssigningInDetail(v => !v)}
                            className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-ink-muted hover:text-primary hover:bg-primary-25 cursor-pointer"
                            title={isCheckedIn ? 'Chuyển bàn' : 'Đổi bàn'}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                        )}
                      </div>
                      {assigningInDetail && (
                        <AssignTableDropdown
                          tables={tables}
                          partySize={selectedRes.guests}
                          onAssign={tableId => {
                            if (isCheckedIn) onTransferTable?.(selectedRes.id, tableId)
                            else onAssignTable(selectedRes.id, tableId)
                            setAssigningInDetail(false)
                            closeDetail()
                          }}
                          onClose={() => setAssigningInDetail(false)}
                        />
                      )}
                    </div>
                  </div>

                  {selectedRes.area
                    ? <DItem label="Khu vực" value={selectedRes.area} />
                    : <div />
                  }
                  {/* Email — always show so staff can see if notification will be sent */}
                  <div className="col-span-2 flex flex-col gap-0.5 min-w-0">
                    <span className="text-xs text-ink-muted font-medium">Email thông báo</span>
                    <span className={`text-sm truncate ${selectedRes.guestEmail ? 'text-ink' : 'text-ink-muted italic'}`}>
                      {selectedRes.guestEmail ?? 'Chưa có email'}
                    </span>
                  </div>
                  <div className="col-span-2" />
                  {selectedRes.note && (
                    <div className="col-span-4 flex flex-col gap-0.5">
                      <span className="text-xs text-ink-muted font-medium">Ghi chú</span>
                      <span className="text-md text-ink">{selectedRes.note}</span>
                    </div>
                  )}
                </div>

                {/* Action buttons — Waiter confirms/edits/cancels, Cashier checks guests in */}
                <div className="flex flex-col gap-2 shrink-0">
                  {canAct && role === 'WAITER' && (
                    <button onClick={() => { onEdit?.(selectedRes.id); closeDetail() }}
                      className="kv-btn kv-btn-outline-neutral h-9 text-sm min-w-[7rem]">
                      Chỉnh sửa
                    </button>
                  )}
                  {canAct && s === 'PENDING' && role === 'WAITER' && (
                    <button onClick={() => act(onConfirm)} className="kv-btn kv-btn-primary h-9 text-sm min-w-[7rem]">
                      Xác nhận
                    </button>
                  )}
                  {canAct && s === 'CONFIRMED' && role === 'CASHIER' && (
                    <button onClick={() => act(onCheckIn)} className="kv-btn kv-btn-primary h-9 text-sm min-w-[7rem]">
                      Check-in
                    </button>
                  )}
                  {canAct && role === 'WAITER' && (
                    <button
                      onClick={() => act(onCancel)}
                      className="kv-btn h-9 text-sm min-w-[7rem]"
                      style={{ borderColor: 'var(--kv-danger)', color: 'var(--kv-danger)' }}
                    >
                      Hủy đặt bàn
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}

export default CalendarView
