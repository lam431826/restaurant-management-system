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

// Mirrors the backend contract (UpdateReservationRequest @Pattern/@Min/@Max/@Email +
// Reservation entity column lengths) so the form never accepts something the API rejects.
const GUEST_NAME_MAX = 150 // Reservation.guestName column length 150
const NOTE_MAX = 500 // Reservation.note column length 500
const PARTY_SIZE_MAX = 20 // @Max(20)

const Row = ({ label, required, error, hint, children }: { label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode }) => (
  <div className="flex items-start gap-3 min-h-10">
    <div className="w-[10rem] shrink-0 pt-2">
      <label className="text-md text-ink-subtle">{label}{required && <span className="text-danger ml-0.5">*</span>}</label>
    </div>
    <div className="flex-1 min-w-0 flex flex-col gap-1">
      {children}
      <span className={`text-sm min-h-4 ${error ? 'text-danger' : 'text-ink-muted'}`}>{error || hint || ''}</span>
    </div>
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const clearFieldError = (field: string) => {
    setError('')
    setFieldErrors(current => (current[field] ? { ...current, [field]: '' } : current))
  }
  // Captured instead of calling Date.now() directly in the validate() computation below (impure
  // during render) — refreshed periodically so a modal left open still re-validates the BR-03
  // lead-time check as time passes.
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
  // here (an existing reservation being edited must keep a seat assigned) — one message per
  // field so each Row can show its own error instead of a single wall-of-text summary.
  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {}
    const trimmedName = guestName.trim()
    if (!trimmedName) next.guestName = 'Tên khách không được để trống'
    else if (trimmedName.length > GUEST_NAME_MAX) next.guestName = `Không được vượt quá ${GUEST_NAME_MAX} ký tự`

    const trimmedPhone = phone.trim()
    if (!trimmedPhone) next.phone = 'Vui lòng nhập số điện thoại'
    else if (!/^0\d{9,10}$/.test(trimmedPhone)) next.phone = 'Bắt đầu bằng 0, 10-11 số'

    if (guestEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())) next.guestEmail = 'Email không hợp lệ'

    if (!guests || partySizeNum < 1) next.guests = 'Tối thiểu 1 khách'
    else if (partySizeNum > PARTY_SIZE_MAX) next.guests = `Tối đa ${PARTY_SIZE_MAX} khách`

    if (!requestedDt) next.datetime = 'Vui lòng chọn thời gian đến'
    else if (requestedDt.getTime() < now + MIN_LEAD_MINUTES * 60000) next.datetime = `Phải đặt trước ít nhất ${MIN_LEAD_MINUTES} phút`

    if (!tableId) next.tableId = 'Vui lòng chọn một bàn hợp lệ cho số khách này'
    else if (!selectedTable || !tableValidity(selectedTable).ok) next.tableId = 'Bàn đã chọn không còn hợp lệ, vui lòng chọn bàn khác'

    if (note.trim().length > NOTE_MAX) next.note = `Không được vượt quá ${NOTE_MAX} ký tự`

    return next
  }
  const validationErrors = validate()
  const isValid = Object.keys(validationErrors).length === 0

  const handleSave = async () => {
    if (!isValid) { setFieldErrors(validationErrors); setError('Vui lòng kiểm tra lại các trường được đánh dấu'); return }
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
          <Row label="Khách hàng" required error={fieldErrors.guestName} hint={`Tối đa ${GUEST_NAME_MAX} ký tự`}>
            <input
              className={`${inputCls} ${fieldErrors.guestName ? 'border-danger' : ''}`}
              maxLength={GUEST_NAME_MAX}
              placeholder="Tên khách đặt"
              aria-invalid={!!fieldErrors.guestName}
              value={guestName}
              onChange={e => { setGuestName(e.target.value); clearFieldError('guestName') }}
            />
          </Row>
          <div className="grid grid-cols-2 gap-4">
            <Row label="Điện thoại" required error={fieldErrors.phone} hint="Bắt đầu bằng 0, 10-11 số">
              <input
                className={`${inputCls} ${fieldErrors.phone ? 'border-danger' : ''}`}
                inputMode="tel"
                placeholder="0xxxxxxxxx"
                aria-invalid={!!fieldErrors.phone}
                value={phone}
                onChange={e => { setPhone(e.target.value); clearFieldError('phone') }}
              />
            </Row>
            <Row label="Email khách" error={fieldErrors.guestEmail} hint="Không bắt buộc — dùng gửi thông báo">
              <input
                className={`${inputCls} ${fieldErrors.guestEmail ? 'border-danger' : ''}`}
                type="email"
                placeholder="guest@example.com"
                aria-invalid={!!fieldErrors.guestEmail}
                value={guestEmail}
                onChange={e => { setGuestEmail(e.target.value); clearFieldError('guestEmail') }}
              />
            </Row>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Row label="Số khách" required error={fieldErrors.guests} hint={`Từ 1 đến ${PARTY_SIZE_MAX} khách`}>
              <input
                className={`${inputCls} text-right ${fieldErrors.guests ? 'border-danger' : ''}`}
                inputMode="numeric"
                placeholder="0"
                aria-invalid={!!fieldErrors.guests}
                value={guests}
                onChange={e => { setGuests(e.target.value.replace(/[^\d]/g, '').slice(0, 2)); clearFieldError('guests') }}
              />
            </Row>
            <Row label="Chọn bàn" required error={fieldErrors.tableId}>
              <select className={`${inputCls} ${fieldErrors.tableId ? 'border-danger' : ''}`} aria-invalid={!!fieldErrors.tableId} value={tableId} onChange={e => { setTableId(e.target.value); clearFieldError('tableId') }}>
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
          <Row label="Giờ đến" required error={fieldErrors.datetime} hint={`Phải đặt trước ít nhất ${MIN_LEAD_MINUTES} phút`}>
            <div className="flex gap-2">
              <input type="date" className={`${inputCls} ${fieldErrors.datetime ? 'border-danger' : ''}`} aria-invalid={!!fieldErrors.datetime} value={date} onChange={e => { setDate(e.target.value); clearFieldError('datetime') }} />
              <input type="time" className={`${inputCls} ${fieldErrors.datetime ? 'border-danger' : ''}`} aria-invalid={!!fieldErrors.datetime} value={time} onChange={e => { setTime(e.target.value); clearFieldError('datetime') }} />
            </div>
          </Row>
          <Row label="Ghi chú" error={fieldErrors.note} hint={`${note.length}/${NOTE_MAX} ký tự`}>
            <textarea
              className={`${inputCls} h-[7rem] py-2 resize-none ${fieldErrors.note ? 'border-danger' : ''}`}
              maxLength={NOTE_MAX}
              placeholder="Nhập ghi chú"
              aria-invalid={!!fieldErrors.note}
              value={note}
              onChange={e => { setNote(e.target.value); clearFieldError('note') }}
            />
          </Row>
        </div>

        <div className="flex items-center justify-between gap-4 px-7 py-4 border-t border-line shrink-0">
          <span className="text-md text-danger">{error}</span>
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
