import { useEffect, useRef, useState } from 'react'
import { createReservation, type ReservationDto } from '../../api/reservations'
import { listTables, type TableDto } from '../../api/tables'

interface Props {
  reservations: ReservationDto[]
  onClose: () => void
  onSaved: () => void
}

// No explicit duration is modeled on a reservation — reuse the same 1.5h assumption
// Reservation.tsx's toDisplay()/CalendarView already use for rendering time blocks,
// so this stays visually consistent with the rest of the reservation screen.
const ASSUMED_DURATION_MIN = 90
const OCCUPYING_STATUSES = ['PENDING', 'CONFIRMED', 'CHECKED_IN']

// BR-03: a reservation must be made at least 30 minutes in advance. Mirrors the reference
// check in Frontend/PublicWebsite/src/components/ReservationSection.jsx — this is the first
// place that rule gets enforced client-side on the staff side too.
const MIN_LEAD_MINUTES = 30

// Mirrors ReservationServiceImpl's real conflict rule (checkTableAvailabilityForStatuses):
// two bookings on the same table conflict when |T1-T2| < 180min. Getting this out of sync
// with the backend would let the dropdown mark a table "valid" that the server then rejects.
const CONFLICT_WINDOW_MINUTES = 180

// Mirrors ReservationServiceImpl.validateWalkInCooldown(): a table seated with a walk-in
// (no reservation) can't be assigned to a new reservation until 90min dining + 30min cleanup
// have elapsed since it was seated.
const WALK_IN_COOLDOWN_MINUTES = 120

const sameLocalDate = (iso: string, ymd: string) => {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` === ymd
}

const fmtTime = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

// date is 'YYYY-MM-DD', time is 'HH:mm' — combined without a zone suffix so JS parses it as
// local wall-clock time, the same way `reservations[].datetime` (a zoneless LocalDateTime from
// the backend) already gets parsed elsewhere in this file.
const combineDateTime = (ymd: string, hm: string): Date | null => {
  if (!ymd || !hm) return null
  const d = new Date(`${ymd}T${hm}:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

// OCCUPIED covers both a checked-in reservation and a walk-in seated with no reservation at all
// (see the "seat via empty order" flow on the Cashier screen) — upcomingReservation (populated
// for OCCUPIED tables too, not just RESERVED ones) is what tells the two apart here.
const tableStatusLabel = (t: TableDto): string => {
  switch (t.status) {
    case 'AVAILABLE': return 'Trống'
    case 'RESERVED': return 'Đã đặt trước'
    case 'BILLING': return 'Đang thanh toán'
    case 'CLEANING': return 'Đang dọn bàn'
    case 'OCCUPIED': return t.upcomingReservation ? 'Đã check-in' : 'Khách vãng lai'
    default: return t.status
  }
}

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const inputCls =
  'w-full h-10 px-3 bg-field border border-line-default rounded-md text-md text-ink transition-colors ' +
  'placeholder:text-ink-muted hover:border-line-strong focus:outline-none focus:border-primary ' +
  'focus:shadow-[0_0_0_0.3rem_rgba(var(--kv-primary-rgb),0.12)]'

const Row = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div className="flex items-center gap-3 min-h-10">
    <div className="w-[10rem] shrink-0">
      <label className="text-md text-ink-subtle">{label}{required && <span className="text-danger ml-0.5">*</span>}</label>
    </div>
    <div className="flex-1 min-w-0">{children}</div>
  </div>
)

const defaultDate = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

const ReservationModal = ({ reservations, onClose, onSaved }: Props) => {
  const [customer, setCustomer] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [guests, setGuests] = useState('')
  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState('19:00')
  const [note, setNote] = useState('')
  const [tableId, setTableId] = useState<string>('')
  const [tables, setTables] = useState<TableDto[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const customerRef = useRef<HTMLInputElement>(null)
  // Captured instead of calling Date.now() directly in the validationMessage computation below
  // (impure during render) — refreshed periodically so a modal left open still re-validates the
  // BR-03 lead-time check as time passes, without needing every render to be Date.now()-driven.
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    customerRef.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    listTables().then(r => setTables(r.data.data)).catch(() => {})
    const nowTimer = setInterval(() => setNow(Date.now()), 30000)
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); clearInterval(nowTimer) }
  }, [onClose])

  // List every table (not just AVAILABLE ones) grouped by area, so the waiter can see the whole
  // floor — including which busy tables are walk-ins vs. checked-in reservations — while picking.
  const areas = [...new Set(tables.map(t => t.area))]

  const selectedTable = tableId ? (tables.find(t => t.id === tableId) ?? null) : null
  const isToday = sameLocalDate(new Date().toISOString(), date)
  const partySizeNum = Number(guests)
  const requestedDt = combineDateTime(date, time)

  // Mirrors the two checks ReservationServiceImpl.create() actually runs server-side
  // (validateTableCapacity then checkTableAvailability) so an invalid table is caught here,
  // not after a round-trip to the backend on submit. A table is disabled — not hidden — when
  // invalid, so the waiter still sees why (consistent with the live-status visibility above).
  const tableValidity = (t: TableDto): { ok: boolean; reason: string | null } => {
    if (partySizeNum >= 1 && partySizeNum > t.capacity) {
      return { ok: false, reason: `không đủ chỗ, tối đa ${t.capacity}` }
    }
    if (requestedDt) {
      const conflict = reservations.some(r =>
        r.tableId === t.id &&
        OCCUPYING_STATUSES.includes(r.status) &&
        Math.abs(new Date(r.datetime).getTime() - requestedDt.getTime()) < CONFLICT_WINDOW_MINUTES * 60000,
      )
      if (conflict) return { ok: false, reason: 'trùng khung giờ với đặt bàn khác' }
    }
    // Bug fix: this compared Date.now() (when the waiter happens to be looking at the picker)
    // against the cooldown window, so it blocked/allowed based on the wrong clock — a table
    // could get blocked for a reservation dated next week just because "now" fell inside the
    // window, or wrongly allowed for a same-day slot that actually falls inside it. Mirror
    // ReservationServiceImpl.validateWalkInCooldown(): compare the reservation's own requested
    // datetime instead.
    if (t.occupiedSince && requestedDt) {
      const cooldownEnd = new Date(t.occupiedSince).getTime() + WALK_IN_COOLDOWN_MINUTES * 60000
      if (requestedDt.getTime() < cooldownEnd) {
        return { ok: false, reason: `khách vãng lai vừa ngồi, chờ đến ${fmtTime(new Date(cooldownEnd))}` }
      }
    }
    return { ok: true, reason: null }
  }

  // If the waiter already picked a table and then changes party size/date/time such that it
  // no longer qualifies, drop the selection instead of silently letting a now-invalid table
  // ride through to submit (a disabled <option> doesn't automatically un-select itself).
  useEffect(() => {
    if (tableId && selectedTable && !tableValidity(selectedTable).ok) {
      setTableId('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guests, date, time])

  // Existing bookings on the selected table for the selected day, so the waiter can see at a
  // glance whether the requested time overlaps something already on the books before saving.
  const reservationBlocks: { key: string; start: Date; end: Date | null; label: string }[] = tableId
    ? reservations
        .filter(r => r.tableId === tableId && OCCUPYING_STATUSES.includes(r.status) && sameLocalDate(r.datetime, date))
        .map(r => {
          const start = new Date(r.datetime)
          return { key: r.id, start, end: new Date(start.getTime() + ASSUMED_DURATION_MIN * 60000), label: `${r.guestName} (${r.partySize} người)` }
        })
    : []

  // A walk-in seated with no reservation at all has no row in `reservations`, so it's invisible
  // to the block above — surface it separately. Only meaningful when the picked day is today:
  // "currently occupied" says nothing about a future date, and there's no stored start/end time
  // for a walk-in to show for any day other than right now.
  const liveWalkInBlock = isToday && selectedTable
    && (selectedTable.status === 'OCCUPIED' || selectedTable.status === 'BILLING')
    && !selectedTable.upcomingReservation
    ? [{
        key: 'walk-in-now',
        start: selectedTable.occupiedSince ? new Date(selectedTable.occupiedSince) : new Date(),
        end: selectedTable.occupiedSince
          ? new Date(new Date(selectedTable.occupiedSince).getTime() + WALK_IN_COOLDOWN_MINUTES * 60000)
          : null,
        label: 'Khách vãng lai đang ngồi (không qua đặt trước)',
      }]
    : []

  // Only the busy blocks are drawn; every gap between/around them is implicitly the open,
  // assignable time the waiter is looking for.
  const tableSchedule = [...reservationBlocks, ...liveWalkInBlock].sort((a, b) => a.start.getTime() - b.start.getTime())

  // Single source of truth for both the submit-button's disabled state and the on-click
  // validation — recomputed on every render (cheap: string ops + a handful of comparisons)
  // so the button reflects live field edits, not just the last submit attempt.
  const validationMessage = (() => {
    if (!customer.trim()) return 'Vui lòng nhập tên khách hàng'
    if (!phone.trim()) return 'Vui lòng nhập số điện thoại'
    if (!/^0\d{9,10}$/.test(phone.trim())) return 'Số điện thoại không hợp lệ (bắt đầu bằng 0, 10-11 số)'
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Email không hợp lệ'
    if (!guests || Number(guests) < 1) return 'Vui lòng nhập số khách (tối thiểu 1)'
    if (!requestedDt) return 'Vui lòng chọn thời gian đến'
    if (requestedDt.getTime() < now + MIN_LEAD_MINUTES * 60000) return `Vui lòng đặt bàn trước ít nhất ${MIN_LEAD_MINUTES} phút`
    return ''
  })()
  const isValid = !validationMessage
  // Only surface the live hint once the waiter has actually started filling the form —
  // otherwise a blank modal would open already showing a wall of red text.
  const isDirty = Boolean(customer.trim() || phone.trim() || guests)

  const handleSave = async () => {
    if (validationMessage) {
      setError(validationMessage)
      if (!customer.trim()) customerRef.current?.focus()
      return
    }
    setError('')
    setLoading(true)
    try {
      await createReservation({
        guestName: customer.trim(),
        phone: phone.trim(),
        partySize: Number(guests),
        datetime: `${date}T${time}:00`,
        tableId: tableId || null,
        note: note.trim() || null,
        guestEmail: email.trim() || null,
      })
      onSaved()
    } catch (err: any) {
      const msg = err.response?.data?.message
      const fieldErrors = err.response?.data?.fieldErrors
      if (fieldErrors) {
        setError(Object.values(fieldErrors).join('; '))
      } else {
        setError(msg ?? 'Có lỗi xảy ra, vui lòng thử lại.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[var(--kv-z-modal)] flex items-start justify-center p-6 overflow-y-auto" style={{ background: 'rgba(var(--kv-black-rgb), 0.45)' }} onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-[60rem] my-6 bg-card rounded-lg shadow-lg flex flex-col max-h-[calc(100vh-6rem)]">
        <div className="flex items-center justify-between px-7 h-[4.5rem] border-b border-line shrink-0">
          <div>
            <h2 className="text-h2 font-bold text-ink">Đặt bàn</h2>
            <p className="text-[12px] text-ink-muted">Đơn do nhân viên tạo — trạng thái tự động <span className="text-[var(--kv-success)] font-semibold">Đã xác nhận</span></p>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-md text-ink-subtle cursor-pointer hover:bg-fill hover:text-ink" aria-label="Đóng"><CloseIcon /></button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-7 flex flex-col gap-5">
          <Row label="Khách hàng" required>
            <input ref={customerRef} className={inputCls} placeholder="Tên khách đặt" value={customer} onChange={e => { setCustomer(e.target.value); if (error) setError('') }} />
          </Row>
          <div className="grid grid-cols-2 gap-4">
            <Row label="Điện thoại" required>
              <input className={inputCls} inputMode="tel" placeholder="0xxxxxxxxx" value={phone} onChange={e => { setPhone(e.target.value); if (error) setError('') }} />
            </Row>
            <Row label="Email khách">
              <input className={inputCls} type="email" placeholder="guest@example.com" value={email} onChange={e => { setEmail(e.target.value); if (error) setError('') }} />
            </Row>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 min-h-10">
              <div className="w-[10rem] shrink-0"><label className="text-md text-ink-subtle">Số khách<span className="text-danger ml-0.5">*</span></label></div>
              <input className={`${inputCls} text-right`} inputMode="numeric" placeholder="0" value={guests} onChange={e => setGuests(e.target.value.replace(/[^\d]/g, ''))} />
            </div>
            <Row label="Chọn bàn">
              <select
                className={inputCls}
                value={tableId}
                onChange={e => setTableId(e.target.value)}
              >
                <option value="">— Chưa xếp bàn —</option>
                {areas.map(area => (
                  <optgroup key={area} label={area}>
                    {tables.filter(t => t.area === area).map(t => {
                      const validity = tableValidity(t)
                      return (
                        <option key={t.id} value={t.id} disabled={!validity.ok}>
                          {t.name} ({t.capacity} chỗ) — {tableStatusLabel(t)}{validity.reason ? ` · ${validity.reason}` : ''}
                        </option>
                      )
                    })}
                  </optgroup>
                ))}
              </select>
            </Row>
          </div>
          {tableId && (
            <div className="ml-[calc(10rem+0.75rem)] -mt-2 text-[12px]">
              {tableSchedule.length === 0 ? (
                <span className="text-ink-muted">Bàn chưa có lịch đặt nào trong ngày {date}</span>
              ) : (
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-ink">Lịch bàn trong ngày {date}:</span>
                  {tableSchedule.map(b => (
                    <span key={b.key} className="text-ink-subtle">
                      {b.end ? `${fmtTime(b.start)}–${fmtTime(b.end)}` : `Từ ${fmtTime(b.start)}`} · {b.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          <Row label="Giờ đến" required>
            <div className="flex gap-2">
              <input type="date" className={inputCls} value={date} onChange={e => setDate(e.target.value)} />
              <input type="time" className={inputCls} value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </Row>
          <Row label="Ghi chú"><textarea className={`${inputCls} h-[7rem] py-2 resize-none`} placeholder="Nhập ghi chú" value={note} onChange={e => setNote(e.target.value)} /></Row>
        </div>

        <div className="flex items-center justify-between gap-4 px-7 py-4 border-t border-line shrink-0">
          <span className="text-md text-danger">{error || (isDirty && validationMessage ? validationMessage : '')}</span>
          <div className="flex items-center gap-2">
            <button className="kv-btn kv-btn-outline-neutral h-10" onClick={onClose} disabled={loading}>Bỏ qua</button>
            <button className="kv-btn kv-btn-primary h-10" onClick={handleSave} disabled={loading || !isValid}>
              {loading ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReservationModal
