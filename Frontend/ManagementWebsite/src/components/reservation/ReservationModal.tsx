import { useEffect, useRef, useState } from 'react'
import { createReservation } from '../../api/reservations'

interface Props {
  onClose: () => void
  onSaved: () => void
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

const ReservationModal = ({ onClose, onSaved }: Props) => {
  const [customer, setCustomer] = useState('')
  const [phone, setPhone] = useState('')
  const [guests, setGuests] = useState('')
  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState('19:00')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const customerRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    customerRef.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey) }
  }, [onClose])

  const handleSave = async () => {
    if (!customer.trim()) { setError('Vui lòng nhập tên khách hàng'); customerRef.current?.focus(); return }
    if (!phone.trim()) { setError('Vui lòng nhập số điện thoại'); return }
    if (!/^0\d{9,10}$/.test(phone.trim())) { setError('Số điện thoại không hợp lệ (bắt đầu bằng 0, 10-11 số)'); return }
    if (!guests || Number(guests) < 1) { setError('Vui lòng nhập số khách (tối thiểu 1)'); return }
    setError('')
    setLoading(true)
    try {
      await createReservation({
        guestName: customer.trim(),
        phone: phone.trim(),
        partySize: Number(guests),
        datetime: `${date}T${time}:00`,
        note: note.trim() || null,
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
              <input className={inputCls} inputMode="tel" placeholder="0xxxxxxxxx" value={phone} onChange={e => setPhone(e.target.value)} />
            </Row>
            <div className="flex items-center gap-3 min-h-10">
              <div className="w-[7rem] shrink-0"><label className="text-md text-ink-subtle">Số khách<span className="text-danger ml-0.5">*</span></label></div>
              <input className={`${inputCls} text-right`} inputMode="numeric" placeholder="0" value={guests} onChange={e => setGuests(e.target.value.replace(/[^\d]/g, ''))} />
            </div>
          </div>
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
