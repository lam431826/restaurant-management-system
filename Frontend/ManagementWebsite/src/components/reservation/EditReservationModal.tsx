import { useEffect, useState } from 'react'
import { updateReservation, type ReservationDto } from '../../api/reservations'
import type { TableDto } from '../../api/tables'

interface Props {
  dto: ReservationDto
  tables: TableDto[]
  reservations: ReservationDto[]
  onClose: () => void
  onSaved: () => void
}

// Mirrors ReservationModal.tsx (the create flow) — same constants, same table-validity and
// schedule-preview logic, so an edit never shows a table as valid that the server would then
// reject, and the two modals stay visually/behaviorally in sync as intended.
const ASSUMED_DURATION_MIN = 90
const OCCUPYING_STATUSES = ['PENDING', 'CONFIRMED', 'CHECKED_IN']
const CONFLICT_WINDOW_MINUTES = 180
const WALK_IN_COOLDOWN_MINUTES = 120
// BR-03: a reservation must be at least 30 minutes in advance — applies to the datetime field's
// current value here just like on create, whether or not the waiter actually touched it.
const MIN_LEAD_MINUTES = 30

const sameLocalDate = (iso: string, ymd: string) => {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` === ymd
}

const fmtTime = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

const combineDateTime = (ymd: string, hm: string): Date | null => {
  if (!ymd || !hm) return null
  const d = new Date(`${ymd}T${hm}:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

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

const EditReservationModal = ({ dto, tables, reservations, onClose, onSaved }: Props) => {
  const dt = new Date(dto.datetime)
  const pad = (n: number) => String(n).padStart(2, '0')

  const [guestName, setGuestName] = useState(dto.guestName)
  const [phone, setPhone] = useState(dto.phone)
  const [guestEmail, setGuestEmail] = useState(dto.guestEmail ?? '')
  const [guests, setGuests] = useState(String(dto.partySize))
  const [date, setDate] = useState(`${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`)
  const [time, setTime] = useState(`${pad(dt.getHours())}:${pad(dt.getMinutes())}`)
  const [note, setNote] = useState(dto.note ?? '')
  const [tableId, setTableId] = useState(dto.tableId ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // Captured instead of calling Date.now() directly in the validationMessage computation below
  // (impure during render) — refreshed periodically so a modal left open still re-validates the
  // BR-03 lead-time check as time passes.
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const nowTimer = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(nowTimer)
  }, [])

  const areas = [...new Set(tables.map(t => t.area))]
  const partySizeNum = Number(guests)
  const requestedDt = combineDateTime(date, time)
  const isToday = sameLocalDate(new Date().toISOString(), date)

  // Same two checks ReservationServiceImpl.update() runs server-side (validateTableCapacity then
  // checkTableAvailability) plus the walk-in cooldown — see ReservationModal.tsx's tableValidity()
  // for the create-flow original this mirrors. The reservation being edited is excluded from its
  // own conflict check, otherwise the current table would always look "double-booked" by itself.
  const tableValidity = (t: TableDto): { ok: boolean; reason: string | null } => {
    if (partySizeNum >= 1 && partySizeNum > t.capacity) {
      return { ok: false, reason: `không đủ chỗ, tối đa ${t.capacity}` }
    }
    if (requestedDt) {
      const conflict = reservations.some(r =>
        r.id !== dto.id &&
        r.tableId === t.id &&
        OCCUPYING_STATUSES.includes(r.status) &&
        Math.abs(new Date(r.datetime).getTime() - requestedDt.getTime()) < CONFLICT_WINDOW_MINUTES * 60000,
      )
      if (conflict) return { ok: false, reason: 'trùng khung giờ với đặt bàn khác' }
    }
    if (t.occupiedSince && requestedDt) {
      const cooldownEnd = new Date(t.occupiedSince).getTime() + WALK_IN_COOLDOWN_MINUTES * 60000
      if (requestedDt.getTime() < cooldownEnd) {
        return { ok: false, reason: `khách vãng lai vừa ngồi, chờ đến ${fmtTime(new Date(cooldownEnd))}` }
      }
    }
    return { ok: true, reason: null }
  }

  const selectedTable = tableId ? (tables.find(t => t.id === tableId) ?? null) : null

  // Existing bookings on the selected table for the selected day — same as create, minus the
  // reservation currently being edited (it would otherwise always show up as its own conflict).
  const reservationBlocks: { key: string; start: Date; end: Date | null; label: string }[] = tableId
    ? reservations
        .filter(r => r.id !== dto.id && r.tableId === tableId && OCCUPYING_STATUSES.includes(r.status) && sameLocalDate(r.datetime, date))
        .map(r => {
          const start = new Date(r.datetime)
          return { key: r.id, start, end: new Date(start.getTime() + ASSUMED_DURATION_MIN * 60000), label: `${r.guestName} (${r.partySize} người)` }
        })
    : []

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

  const tableSchedule = [...reservationBlocks, ...liveWalkInBlock].sort((a, b) => a.start.getTime() - b.start.getTime())

  // Same validation set as ReservationModal.tsx's create flow, plus the table being required
  // here (an existing reservation being edited must keep a seat assigned).
  const validationMessage = (() => {
    if (!guestName.trim()) return 'Tên khách không được để trống'
    if (!phone.trim()) return 'Vui lòng nhập số điện thoại'
    if (!/^0\d{9,10}$/.test(phone.trim())) return 'Số điện thoại không hợp lệ (bắt đầu bằng 0, 10-11 số)'
    if (guestEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())) return 'Email không hợp lệ'
    if (!guests || partySizeNum < 1 || partySizeNum > 20) return 'Số khách phải từ 1 đến 20'
    if (!requestedDt) return 'Vui lòng chọn thời gian đến'
    if (requestedDt.getTime() < now + MIN_LEAD_MINUTES * 60000) return `Vui lòng đặt bàn trước ít nhất ${MIN_LEAD_MINUTES} phút`
    if (!tableId) return 'Vui lòng chọn một bàn hợp lệ cho số khách này'
    if (!selectedTable || !tableValidity(selectedTable).ok) return 'Bàn đã chọn không còn hợp lệ, vui lòng chọn bàn khác'
    return ''
  })()
  const isValid = !validationMessage

  const handleSave = async () => {
    if (validationMessage) { setError(validationMessage); return }
    setError('')
    setSaving(true)
    try {
      await updateReservation(dto.id, {
        guestName: guestName.trim(),
        phone: phone.trim(),
        guestEmail: guestEmail.trim() || null,
        partySize: partySizeNum,
        // Bare local datetime, no toISOString() — matches how the create flow (and the rest of
        // the app) sends a zoneless LocalDateTime string. The previous version built this via
        // new Date(datetime).toISOString(), which shifted the value to UTC before sending; the
        // backend then parsed that shifted string as if it were already local wall-clock time,
        // silently saving the reservation at the wrong hour whenever the browser's timezone
        // wasn't UTC+0.
        datetime: `${date}T${time}:00`,
        note: note.trim() || null,
        tableId,
      })
      onSaved()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Không thể cập nhật thông tin')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[var(--kv-z-modal)] flex items-start justify-center p-6 overflow-y-auto" style={{ background: 'rgba(var(--kv-black-rgb), 0.45)' }} onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-[60rem] my-6 bg-card rounded-lg shadow-lg flex flex-col max-h-[calc(100vh-6rem)]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-7 h-[4.5rem] border-b border-line shrink-0">
          <h2 className="text-h2 font-bold text-ink">Chỉnh sửa đặt bàn</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-md text-ink-subtle cursor-pointer hover:bg-fill hover:text-ink" aria-label="Đóng"><CloseIcon /></button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-7 flex flex-col gap-5">
          <Row label="Khách hàng" required>
            <input className={inputCls} placeholder="Tên khách đặt" value={guestName} onChange={e => setGuestName(e.target.value)} />
          </Row>
          <div className="grid grid-cols-2 gap-4">
            <Row label="Điện thoại" required>
              <input className={inputCls} inputMode="tel" placeholder="0xxxxxxxxx" value={phone} onChange={e => setPhone(e.target.value)} />
            </Row>
            <Row label="Email khách">
              <input className={inputCls} type="email" placeholder="guest@example.com" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} />
            </Row>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 min-h-10">
              <div className="w-[10rem] shrink-0"><label className="text-md text-ink-subtle">Số khách<span className="text-danger ml-0.5">*</span></label></div>
              <input className={`${inputCls} text-right`} inputMode="numeric" placeholder="0" value={guests} onChange={e => setGuests(e.target.value.replace(/[^\d]/g, ''))} />
            </div>
            <Row label="Chọn bàn" required>
              <select className={inputCls} value={tableId} onChange={e => setTableId(e.target.value)}>
                <option value="">— Chọn bàn —</option>
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
          <span className="text-md text-danger">{error || validationMessage}</span>
          <div className="flex items-center gap-2">
            <button className="kv-btn kv-btn-outline-neutral h-10" onClick={onClose} disabled={saving}>Hủy</button>
            <button className="kv-btn kv-btn-primary h-10" onClick={handleSave} disabled={saving || !isValid}>
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditReservationModal
