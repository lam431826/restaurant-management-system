import { useEffect, useRef, useState } from 'react'
import type { Room } from '../../data/mockData'

interface Props {
  /** undefined = create mode, a Room = edit mode */
  room?: Room
  areas: string[]
  onClose: () => void
  onSave: (room: Room, addAnother: boolean) => void
  onCreateArea: () => string | undefined
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

/** Stacked field: label on top, control below. `action` renders aligned to the right of the label. */
const Field = ({
  label, required, action, children,
}: { label: string; required?: boolean; action?: React.ReactNode; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-center justify-between min-h-5">
      <label className="text-md text-ink-subtle">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {action}
    </div>
    {children}
  </div>
)

const AreaSelect = ({
  value, options, onChange, onCreate,
}: { value: string; options: string[]; onChange: (v: string) => void; onCreate: () => void }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center justify-between w-full h-10 px-3 bg-field border rounded-md cursor-pointer transition-colors ${open ? 'border-primary' : 'border-line-default hover:border-line-strong'}`}
      >
        <span className={`text-md truncate ${value ? 'text-ink' : 'text-ink-muted'}`}>{value || 'Chọn khu vực'}</span>
        <ChevronDown />
      </button>
      {open && (
        <div className="absolute top-[calc(100%+0.4rem)] left-0 right-0 bg-card border border-line-default rounded-md shadow-md z-[var(--kv-z-dropdown)] max-h-[24rem] overflow-y-auto py-1">
          {options.map(opt => (
            <div
              key={opt}
              className={`px-3 py-2 text-md cursor-pointer transition-colors hover:bg-[var(--kv-state-hover-bg)] ${opt === value ? 'text-primary font-medium bg-[var(--kv-action-primary-faded-bg)]' : 'text-ink'}`}
              onClick={() => { onChange(opt); setOpen(false) }}
            >
              {opt}
            </div>
          ))}
          <div className="h-px bg-line my-1" />
          <div
            className="px-3 py-2 text-md text-primary font-medium cursor-pointer hover:bg-[var(--kv-state-hover-bg)]"
            onClick={() => { onCreate(); setOpen(false) }}
          >
            + Tạo khu vực mới
          </div>
        </div>
      )}
    </div>
  )
}

const RoomModal = ({ room, areas, onClose, onSave, onCreateArea }: Props) => {
  const isEdit = !!room
  const [name, setName] = useState(room?.name ?? '')
  const [area, setArea] = useState(room?.area ?? '')
  const [seats, setSeats] = useState(room ? String(room.seats) : '')
  const [order, setOrder] = useState(room ? String(room.order) : '')
  const [note, setNote] = useState(room?.note ?? '')
  const [active, setActive] = useState(room?.active ?? true)
  const [error, setError] = useState('')

  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const handleSave = (addAnother: boolean) => {
    if (!name.trim()) {
      setError('Vui lòng nhập tên phòng/bàn')
      nameRef.current?.focus()
      return
    }
    const result: Room = {
      id: room?.id ?? Date.now(),
      name: name.trim(),
      note: note.trim(),
      area: area || 'Chưa phân khu',
      seats: Number(seats || 0),
      active,
      order: Number(order || 0),
    }
    onSave(result, addAnother)
    if (addAnother && !isEdit) {
      setName(''); setSeats(''); setOrder(''); setNote(''); setActive(true); setError('')
      nameRef.current?.focus()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[var(--kv-z-modal)] flex items-start justify-center p-6 overflow-y-auto"
      style={{ background: 'rgba(var(--kv-black-rgb), 0.45)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-[56rem] my-6 bg-card rounded-lg shadow-lg flex flex-col max-h-[calc(100vh-6rem)]">
        <div className="flex items-center justify-between px-6 h-16 border-b border-line shrink-0">
          <h2 className="text-h3 font-bold text-ink">{isEdit ? 'Cập nhật phòng/bàn' : 'Thêm phòng/bàn'}</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-md text-ink-subtle cursor-pointer transition-colors hover:bg-fill hover:text-ink" aria-label="Đóng">
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col gap-4">
          <Field label="Tên phòng bàn" required>
            <input
              ref={nameRef}
              className={inputCls}
              placeholder="Bắt buộc"
              value={name}
              onChange={e => { setName(e.target.value); if (error) setError('') }}
            />
          </Field>

          <Field
            label="Khu vực"
            action={
              <button
                type="button"
                className="text-md text-primary font-medium cursor-pointer hover:underline"
                onClick={() => { const a = onCreateArea(); if (a) setArea(a) }}
              >
                Tạo mới
              </button>
            }
          >
            <AreaSelect
              value={area}
              options={areas}
              onChange={setArea}
              onCreate={() => { const a = onCreateArea(); if (a) setArea(a) }}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Số thứ tự">
              <input
                className={inputCls}
                inputMode="numeric"
                placeholder="Nhập vị trí"
                value={order}
                onChange={e => setOrder(e.target.value.replace(/[^\d]/g, ''))}
              />
            </Field>
            <Field label="Số ghế">
              <input
                className={inputCls}
                inputMode="numeric"
                placeholder="Nhập số ghế"
                value={seats}
                onChange={e => setSeats(e.target.value.replace(/[^\d]/g, ''))}
              />
            </Field>
          </div>

          <Field label="Ghi chú">
            <textarea
              className={`${inputCls} h-[8rem] py-2 resize-none`}
              placeholder="Nhập ghi chú"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </Field>

          <label className="kv-check pt-1">
            <input type="checkbox" checked={active} onChange={() => setActive(v => !v)} />
            <span className="kv-check-box" />
            <span className="kv-check-text">Đang hoạt động</span>
          </label>
        </div>

        <div className="flex items-center justify-between gap-4 px-6 py-3 border-t border-line shrink-0">
          <span className="text-md text-danger">{error}</span>
          <div className="flex items-center gap-2">
            <button className="kv-btn kv-btn-outline-neutral h-10" onClick={onClose}>Bỏ qua</button>
            {!isEdit && (
              <button className="kv-btn kv-btn-outline-primary h-10" onClick={() => handleSave(true)}>Lưu &amp; Thêm mới</button>
            )}
            <button className="kv-btn kv-btn-primary h-10" onClick={() => handleSave(false)}>Lưu</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RoomModal
