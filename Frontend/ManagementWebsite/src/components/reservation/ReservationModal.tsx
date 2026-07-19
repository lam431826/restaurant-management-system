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

const sameLocalDate = (iso: string, ymd: string) => {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` === ymd
}

const fmtTime = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

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

  useEffect(() => {
    customerRef.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    listTables().then(r => setTables(r.data.data)).catch(() => {})
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey) }
  }, [onClose])

  // List every table (not just AVAILABLE ones) grouped by area, so the waiter can see the whole
  // floor — including which busy tables are walk-ins vs. checked-in reservations — while picking.
  // Non-AVAILABLE tables are shown but disabled; they simply can't be assigned right now.
  const areas = [...new Set(tables.map(t => t.area))]

  const selectedTable = tableId ? (tables.find(t => t.id === tableId) ?? null) : null
  const isToday = sameLocalDate(new Date().toISOString(), date)

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
    ? [{ key: 'walk-in-now', start: new Date(), end: null as Date | null, label: 'Khách vãng lai đang ngồi (không qua đặt trước)' }]
    : []

  // Only the busy blocks are drawn; every gap between/around them is implicitly the open,
  // assignable time the waiter is looking for.
  const tableSchedule = [...reservationBlocks, ...liveWalkInBlock].sort((a, b) => a.start.getTime() - b.start.getTime())

  const handleSave = async () => {
    if (!customer.trim()) { setError('Vui lòng nhập tên khách hàng'); customerRef.current?.focus(); return }
    if (!phone.trim()) { setError('Vui lòng nhập số điện thoại'); return }
    if (!/^0\d{9,10}$/.test(phone.trim())) { setError('Số điện thoại không hợp lệ (bắt đầu bằng 0, 10-11 số)'); return }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Email không hợp lệ'); return }
    if (!guests || Number(guests) < 1) { setError('Vui lòng nhập số khách (tối thiểu 1)'); return }
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
      <div className="w-full max-w-[52rem] my-6 bg-card rounded-lg shadow-lg flex flex-col max-h-[calc(100vh-6rem)]">
        <div className="flex items-center justify-between px-6 h-16 border-b border-line shrink-0">
          <div>
            <h2 className="text-h3 font-bold text-ink">Đặt bàn</h2>
            <p className="text-[12px] text-ink-muted">Đơn do nhân viên tạo — trạng thái tự động <span className="text-[var(--kv-success)] font-semibold">Đã xác nhận</span></p>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-md text-ink-subtle cursor-pointer hover:bg-fill hover:text-ink" aria-label="Đóng"><CloseIcon /></button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col gap-4">
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
                    {tables.filter(t => t.area === area).map(t => (
                      <option key={t.id} value={t.id} disabled={t.status !== 'AVAILABLE'}>
                        {t.name} ({t.capacity} chỗ) — {tableStatusLabel(t)}
                      </option>
                    ))}
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

        <div className="flex items-center justify-between gap-4 px-6 py-3 border-t border-line shrink-0">
          <span className="text-md text-danger">{error}</span>
          <div className="flex items-center gap-2">
            <button className="kv-btn kv-btn-outline-neutral h-10" onClick={onClose} disabled={loading}>Bỏ qua</button>
            <button className="kv-btn kv-btn-primary h-10" onClick={handleSave} disabled={loading}>
              {loading ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReservationModal
