import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export type EmpStatus = 'active' | 'inactive'

interface Props {
  status: EmpStatus
  department: string
  position: string
  departments: string[]
  positions: string[]
  onStatus: (v: EmpStatus) => void
  onDepartment: (v: string) => void
  onPosition: (v: string) => void
  onCreateDepartment: () => void
  onCreatePosition: () => void
}

const ChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-ink-muted shrink-0">
    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const PickerSelect = ({
  value, options, placeholder, onChange, onClear,
}: {
  value: string
  options: string[]
  placeholder: string
  onChange: (v: string) => void
  onClear: () => void
}) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState<{ top: number; bottom: number; left: number; width: number } | null>(null)

  useEffect(() => {
    if (!open) return
    const update = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect()
        setCoords({
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          width: rect.width,
        })
      }
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open])

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const target = e.target as Node
      if (ref.current && ref.current.contains(target)) return
      if (dropdownRef.current && dropdownRef.current.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const preferTop = coords ? (window.innerHeight - coords.bottom < 250 && coords.top > 250) : false

  const dropdownStyle: React.CSSProperties = coords ? {
    position: 'fixed',
    left: `${coords.left}px`,
    width: `${coords.width}px`,
    zIndex: 9999,
    ...(preferTop ? {
      bottom: `${window.innerHeight - coords.top + 4}px`,
    } : {
      top: `${coords.bottom + 4}px`,
    })
  } : { visibility: 'hidden' }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center justify-between w-full h-10 px-3 bg-field border rounded-md cursor-pointer transition-colors ${open ? 'border-primary' : 'border-line-default hover:border-line-strong'}`}
      >
        <span className={`text-md truncate ${value ? 'text-ink' : 'text-ink-muted'}`}>{value || placeholder}</span>
        <span className="flex items-center gap-1">
          {value && (
            <span
              role="button"
              className="text-ink-muted hover:text-danger"
              onClick={e => { e.stopPropagation(); onClear() }}
              aria-label="Xóa lựa chọn"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </span>
          )}
          <ChevronDown />
        </span>
      </button>
      {open && createPortal(
        <div
          ref={dropdownRef}
          className="bg-card border border-line-default rounded-md shadow-md max-h-[24rem] overflow-y-auto py-1"
          style={dropdownStyle}
        >
          {options.map(opt => (
            <div
              key={opt}
              className={`px-3 py-2 text-md cursor-pointer transition-colors hover:bg-[var(--kv-state-hover-bg)] ${opt === value ? 'text-primary font-medium bg-[var(--kv-action-primary-faded-bg)]' : 'text-ink'}`}
              onClick={() => { onChange(opt); setOpen(false) }}
            >
              {opt}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

const EmployeeFilters = ({
  status, department, position, departments, positions,
  onStatus, onDepartment, onPosition, onCreateDepartment, onCreatePosition,
}: Props) => (
  <div className="flex flex-col gap-6">
    {/* Trạng thái */}
    <div className="flex flex-col gap-2">
      <div className="text-md font-semibold text-ink">Trạng thái</div>
      <div className="flex flex-col gap-1.5 mt-1">
        {([['active', 'Đang làm việc'], ['inactive', 'Đã nghỉ']] as const).map(([id, label]) => (
          <label key={id} className="kv-radio">
            <input type="radio" name="emp-status" checked={status === id} onChange={() => onStatus(id)} />
            <span className="kv-radio-dot" />
            <span className="kv-radio-text">{label}</span>
          </label>
        ))}
      </div>
    </div>

    {/* Phòng ban */}
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-md font-semibold text-ink">
        <span>Phòng ban</span>
        <button className="text-sm font-medium text-primary cursor-pointer hover:underline" onClick={onCreateDepartment}>Tạo mới</button>
      </div>
      <PickerSelect value={department} options={departments} placeholder="Chọn phòng ban" onChange={onDepartment} onClear={() => onDepartment('')} />
    </div>

    {/* Chức danh */}
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-md font-semibold text-ink">
        <span>Chức danh</span>
        <button className="text-sm font-medium text-primary cursor-pointer hover:underline" onClick={onCreatePosition}>Tạo mới</button>
      </div>
      <PickerSelect value={position} options={positions} placeholder="Chọn chức danh" onChange={onPosition} onClear={() => onPosition('')} />
    </div>
  </div>
)

export default EmployeeFilters
