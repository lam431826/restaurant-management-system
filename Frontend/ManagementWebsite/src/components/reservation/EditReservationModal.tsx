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

const fieldCls = 'w-full h-10 px-3 bg-field border border-line-default rounded-md text-md text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary disabled:opacity-50'
const labelCls = 'block text-sm font-medium text-ink-subtle mb-1'

const OCCUPYING_STATUSES = ['PENDING', 'CONFIRMED', 'CHECKED_IN']
// Mirrors ReservationServiceImpl's real conflict rule (checkTableAvailabilityForStatuses) and
// validateWalkInCooldown() — kept in sync with the identical constants in ReservationModal.tsx
// (the create flow) so the dropdown never marks a table "valid" that the server then rejects.
const CONFLICT_WINDOW_MINUTES = 180
const WALK_IN_COOLDOWN_MINUTES = 120

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

const EditReservationModal = ({ dto, tables, reservations, onClose, onSaved }: Props) => {
  const dt = new Date(dto.datetime)
  const toLocalDatetimeStr = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const [guestName, setGuestName] = useState(dto.guestName)
  const [phone, setPhone] = useState(dto.phone)
  const [guestEmail, setGuestEmail] = useState(dto.guestEmail ?? '')
  const [partySize, setPartySize] = useState(String(dto.partySize))
  const [datetime, setDatetime] = useState(toLocalDatetimeStr(dt))
  const [note, setNote] = useState(dto.note ?? '')
  const [tableId, setTableId] = useState(dto.tableId ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const areas = [...new Set(tables.map(t => t.area))]
  const partySizeNum = Number(partySize)
  const requestedDt = datetime ? new Date(datetime) : null

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
        return { ok: false, reason: 'khách vãng lai vừa ngồi, chưa hết thời gian chờ' }
      }
    }
    return { ok: true, reason: null }
  }

  const selectedTable = tableId ? (tables.find(t => t.id === tableId) ?? null) : null

  // If the current selection stops qualifying (e.g. waiter bumps party size past its capacity),
  // drop it instead of letting a now-invalid table ride through to submit — a disabled <option>
  // doesn't un-select itself.
  useEffect(() => {
    if (tableId && selectedTable && !tableValidity(selectedTable).ok) {
      setTableId('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partySize, datetime])

  const handleSave = async () => {
    if (!guestName.trim()) { setError('Tên khách không được để trống'); return }
    if (!phone.trim() || !/^0\d{9,10}$/.test(phone.trim())) { setError('Số điện thoại không hợp lệ (phải bắt đầu bằng 0, 10-11 chữ số)'); return }
    if (!datetime) { setError('Vui lòng chọn thời gian'); return }
    if (new Date(datetime) <= new Date()) { setError('Thời gian đặt bàn phải ở tương lai'); return }
    const p = parseInt(partySize, 10)
    if (!p || p < 1 || p > 20) { setError('Số khách phải từ 1 đến 20'); return }
    if (!tableId) { setError('Vui lòng chọn một bàn hợp lệ cho số khách này'); return }
    if (!selectedTable || !tableValidity(selectedTable).ok) { setError('Bàn đã chọn không còn hợp lệ, vui lòng chọn bàn khác'); return }

    setSaving(true)
    setError(null)
    try {
      await updateReservation(dto.id, {
        guestName: guestName.trim(),
        phone: phone.trim(),
        guestEmail: guestEmail.trim() || null,
        partySize: p,
        datetime: new Date(datetime).toISOString().slice(0, 19),
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-card rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h2 className="text-lg font-bold text-ink">Chỉnh sửa đặt bàn</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-md text-ink-muted hover:bg-fill cursor-pointer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">
          {error && (
            <div className="px-3 py-2 rounded-md bg-danger/10 text-danger text-sm">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Tên khách *</label>
              <input className={fieldCls} value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Nguyễn Văn A" />
            </div>
            <div>
              <label className={labelCls}>Điện thoại *</label>
              <input className={fieldCls} value={phone} onChange={e => setPhone(e.target.value)} placeholder="0912345678" />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input className={fieldCls} type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="email@gmail.com" />
            </div>
            <div>
              <label className={labelCls}>Số khách *</label>
              <input className={fieldCls} type="number" min={1} max={20} value={partySize} onChange={e => setPartySize(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Thời gian đến *</label>
              <input className={fieldCls} type="datetime-local" value={datetime} onChange={e => setDatetime(e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Chọn bàn *</label>
              <select className={fieldCls} value={tableId} onChange={e => setTableId(e.target.value)}>
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
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Ghi chú</label>
              <textarea
                className="w-full px-3 py-2 bg-field border border-line-default rounded-md text-md text-ink placeholder:text-ink-muted focus:outline-none focus:border-primary resize-none"
                rows={3}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Yêu cầu đặc biệt..."
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-line">
          <button onClick={onClose} className="kv-btn kv-btn-outline-neutral h-10 min-w-[6rem]" disabled={saving}>Hủy</button>
          <button onClick={handleSave} className="kv-btn kv-btn-primary h-10 min-w-[8rem]" disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default EditReservationModal
