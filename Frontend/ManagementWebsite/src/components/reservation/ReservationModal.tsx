import { useEffect, useRef, useState } from 'react'
import type { Reservation, ReservationStatus } from '../../data/mockData'
import { rooms, reservationStatusMeta } from '../../data/mockData'

interface Props {
  nextCode: string
  onClose: () => void
  onSave: (r: Reservation) => void
}

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
const ChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-ink-muted shrink-0">
    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
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

const Picker = ({ value, options, placeholder, onChange }: { value: string; options: string[]; placeholder: string; onChange: (v: string) => void }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} className={`flex items-center justify-between w-full h-10 px-3 bg-field border rounded-md cursor-pointer transition-colors ${open ? 'border-primary' : 'border-line-default hover:border-line-strong'}`}>
        <span className={`text-md truncate ${value ? 'text-ink' : 'text-ink-muted'}`}>{value || placeholder}</span>
        <ChevronDown />
      </button>
      {open && (
        <div className="absolute top-[calc(100%+0.4rem)] left-0 right-0 bg-card border border-line-default rounded-md shadow-md z-[var(--kv-z-dropdown)] max-h-[22rem] overflow-y-auto py-1">
          {options.map(opt => (
            <div key={opt} className={`px-3 py-2 text-md cursor-pointer hover:bg-[var(--kv-state-hover-bg)] ${opt === value ? 'text-primary font-medium bg-[var(--kv-action-primary-faded-bg)]' : 'text-ink'}`} onClick={() => { onChange(opt); setOpen(false) }}>
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const STATUS_OPTS: ReservationStatus[] = ['waiting', 'arranged', 'received']

const ReservationModal = ({ nextCode, onClose, onSave }: Props) => {
  const [customer, setCustomer] = useState('')
  const [phone, setPhone] = useState('')
  const [guests, setGuests] = useState('')
  const [date, setDate] = useState('2026-06-17')
  const [time, setTime] = useState('19:00')
  const [table, setTable] = useState('')
  const [status, setStatus] = useState<ReservationStatus>('waiting')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const customerRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    customerRef.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey) }
  }, [onClose])

  const tableOptions = rooms.map(r => r.name)

  const handleSave = () => {
    if (!customer.trim()) { setError('Vui lòng nhập tên khách hàng'); customerRef.current?.focus(); return }
    const [y, m, d] = date.split('-')
    const area = rooms.find(r => r.name === table)?.area ?? ''
    const hourNum = Number(time.split(':')[0]) + Number(time.split(':')[1]) / 60
    onSave({
      code: nextCode,
      arriveTime: `${d}/${m}/${y} ${time}`,
      customer: customer.trim(),
      phone: phone.trim(),
      guests: Number(guests || 0),
      table: table || '—',
      area,
      status,
      note: note.trim(),
      startHour: hourNum,
      durationH: 1.5,
    })
  }

  return (
    <div className="fixed inset-0 z-[var(--kv-z-modal)] flex items-start justify-center p-6 overflow-y-auto" style={{ background: 'rgba(var(--kv-black-rgb), 0.45)' }} onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-[56rem] my-6 bg-card rounded-lg shadow-lg flex flex-col max-h-[calc(100vh-6rem)]">
        <div className="flex items-center justify-between px-6 h-16 border-b border-line shrink-0">
          <h2 className="text-h3 font-bold text-ink">Đặt bàn</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-md text-ink-subtle cursor-pointer hover:bg-fill hover:text-ink" aria-label="Đóng"><CloseIcon /></button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col gap-4">
          <Row label="Khách hàng" required>
            <input ref={customerRef} className={inputCls} placeholder="Tên khách đặt" value={customer} onChange={e => { setCustomer(e.target.value); if (error) setError('') }} />
          </Row>
          <div className="grid grid-cols-2 gap-4">
            <Row label="Điện thoại"><input className={inputCls} inputMode="tel" placeholder="Số điện thoại" value={phone} onChange={e => setPhone(e.target.value)} /></Row>
            <div className="flex items-center gap-3 min-h-10">
              <div className="w-[7rem] shrink-0"><label className="text-md text-ink-subtle">Số khách</label></div>
              <input className={`${inputCls} text-right`} inputMode="numeric" placeholder="0" value={guests} onChange={e => setGuests(e.target.value.replace(/[^\d]/g, ''))} />
            </div>
          </div>
          <Row label="Giờ đến">
            <div className="flex gap-2">
              <input type="date" className={inputCls} value={date} onChange={e => setDate(e.target.value)} />
              <input type="time" className={inputCls} value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </Row>
          <Row label="Phòng/bàn"><Picker value={table} options={tableOptions} placeholder="Chọn phòng/bàn" onChange={setTable} /></Row>
          <Row label="Trạng thái">
            <div className="flex gap-4">
              {STATUS_OPTS.map(s => (
                <label key={s} className="kv-radio">
                  <input type="radio" name="res-modal-status" checked={status === s} onChange={() => setStatus(s)} />
                  <span className="kv-radio-dot" /><span className="kv-radio-text">{reservationStatusMeta[s].label}</span>
                </label>
              ))}
            </div>
          </Row>
          <Row label="Ghi chú"><textarea className={`${inputCls} h-[7rem] py-2 resize-none`} placeholder="Nhập ghi chú" value={note} onChange={e => setNote(e.target.value)} /></Row>
        </div>

        <div className="flex items-center justify-between gap-4 px-6 py-3 border-t border-line shrink-0">
          <span className="text-md text-danger">{error}</span>
          <div className="flex items-center gap-2">
            <button className="kv-btn kv-btn-outline-neutral h-10" onClick={onClose}>Bỏ qua</button>
            <button className="kv-btn kv-btn-primary h-10" onClick={handleSave}>Lưu</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReservationModal
