import { useEffect, useRef, useState } from 'react'
import { createTable, updateTable } from '../../services/tableService'
import type { TableItem, TableInput } from '../../services/tableService'
import { ApiError } from '../../services/api'

interface Props {
  /** undefined = create mode, a TableItem = edit mode */
  table?: TableItem
  areas: string[]
  onClose: () => void
  onSaved: () => void
  onCreateArea: () => void
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

// Mirrors the backend contract (CreateTableRequest/UpdateTableRequest @Size + RestaurantTable
// entity column length) so the form never accepts something the API rejects.
const NAME_MAX = 20 // @Size(max = 20) + column length 20
const NOTE_MAX = 255 // RestaurantTable.note column length 255
const CAPACITY_MAX = 99 // business rule — a single table/room cannot exceed 99 seats

/** Stacked field: label on top, control below, error/hint reserved below so validating a field
 * never shifts the form's layout. `action` renders aligned to the right of the label. */
const Field = ({
  label, required, action, error, hint, children,
}: { label: string; required?: boolean; action?: React.ReactNode; error?: string; hint?: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <div className="flex items-center justify-between min-h-5">
      <label className="text-md text-ink-subtle">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {action}
    </div>
    {children}
    <span className={`text-sm min-h-4 ${error ? 'text-danger' : 'text-ink-muted'}`}>
      {error || hint || ''}
    </span>
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

const RoomModal = ({ table, areas, onClose, onSaved, onCreateArea }: Props) => {
  const isEdit = !!table
  const [name, setName] = useState(table?.name ?? '')
  const [area, setArea] = useState(table?.area ?? '')
  const [seats, setSeats] = useState(table ? String(table.seats) : '')
  const [note, setNote] = useState(table?.note ?? '')
  const [active, setActive] = useState(table?.active ?? true)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const nameRef = useRef<HTMLInputElement>(null)

  const clearFieldError = (field: string) => {
    setError('')
    setFieldErrors(current => (current[field] ? { ...current, [field]: '' } : current))
  }

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

  /** Returns a message per invalid field; an empty object means the form is valid. */
  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {}
    const trimmedName = name.trim()
    if (!trimmedName) next.name = 'Vui lòng nhập tên phòng/bàn'
    else if (trimmedName.length > NAME_MAX) next.name = `Tên không được vượt quá ${NAME_MAX} ký tự`

    if (note.trim().length > NOTE_MAX) next.note = `Ghi chú không được vượt quá ${NOTE_MAX} ký tự`

    if (seats.trim()) {
      const n = Number(seats)
      if (!Number.isInteger(n) || n < 0) next.seats = 'Số ghế phải là số nguyên không âm'
      else if (n > CAPACITY_MAX) next.seats = `Số ghế không được vượt quá ${CAPACITY_MAX}`
    }

    return next
  }

  const handleSave = async () => {
    const validationErrors = validate()
    setFieldErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      setError('Vui lòng kiểm tra lại các trường được đánh dấu')
      if (validationErrors.name) nameRef.current?.focus()
      return
    }
    setSaving(true)
    setError('')
    const input: TableInput = {
      name: name.trim(),
      note: note.trim() || undefined,
      area: area || undefined,
      seats: Number(seats || 0),
      active,
    }
    try {
      if (isEdit && table) await updateTable(table.id, input)
      else await createTable(input)
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Lưu phòng/bàn thất bại.')
    } finally {
      setSaving(false)
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
          <Field
            label="Tên phòng bàn"
            required
            error={fieldErrors.name}
            hint={`${name.trim().length}/${NAME_MAX} ký tự`}
          >
            <input
              ref={nameRef}
              className={`${inputCls} ${fieldErrors.name ? 'border-danger' : ''}`}
              maxLength={NAME_MAX}
              placeholder="Bắt buộc"
              aria-invalid={!!fieldErrors.name}
              value={name}
              onChange={e => { setName(e.target.value); clearFieldError('name') }}
            />
          </Field>

          <Field
            label="Khu vực"
            action={
              <button
                type="button"
                className="text-md text-primary font-medium cursor-pointer hover:underline"
                onClick={onCreateArea}
              >
                Tạo mới
              </button>
            }
          >
            <AreaSelect
              value={area}
              options={areas}
              onChange={setArea}
              onCreate={onCreateArea}
            />
          </Field>

          <Field
            label="Số ghế"
            error={fieldErrors.seats}
            hint={`Tối đa ${CAPACITY_MAX} chỗ`}
          >
            <input
              className={`${inputCls} ${fieldErrors.seats ? 'border-danger' : ''}`}
              inputMode="numeric"
              maxLength={2}
              placeholder="Nhập số ghế"
              aria-invalid={!!fieldErrors.seats}
              value={seats}
              onChange={e => { setSeats(e.target.value.replace(/[^\d]/g, '').slice(0, 2)); clearFieldError('seats') }}
            />
          </Field>

          <Field
            label="Ghi chú"
            error={fieldErrors.note}
            hint={`${note.length}/${NOTE_MAX} ký tự`}
          >
            <textarea
              className={`${inputCls} h-[8rem] py-2 resize-none ${fieldErrors.note ? 'border-danger' : ''}`}
              maxLength={NOTE_MAX}
              placeholder="Nhập ghi chú"
              aria-invalid={!!fieldErrors.note}
              value={note}
              onChange={e => { setNote(e.target.value); clearFieldError('note') }}
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
            <button className="kv-btn kv-btn-outline-neutral h-10" disabled={saving} onClick={onClose}>Bỏ qua</button>
            <button className="kv-btn kv-btn-primary h-10" disabled={saving} onClick={handleSave}>{saving ? 'Đang lưu…' : 'Lưu'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RoomModal
