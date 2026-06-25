import { useEffect, useRef, useState } from 'react'
import type { Employee } from '../../data/mockData'
import { employeeBranches } from '../../data/mockData'

interface Props {
  nextCode: string
  departments: string[]
  positions: string[]
  onClose: () => void
  onSave: (emp: Employee, addAnother: boolean) => void
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
      <label className="text-md text-ink-subtle">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
    </div>
    <div className="flex-1 min-w-0">{children}</div>
  </div>
)

const Picker = ({
  value, options, placeholder, onChange,
}: { value: string; options: string[]; placeholder: string; onChange: (v: string) => void }) => {
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
        <span className={`text-md truncate ${value ? 'text-ink' : 'text-ink-muted'}`}>{value || placeholder}</span>
        <ChevronDown />
      </button>
      {open && (
        <div className="absolute top-[calc(100%+0.4rem)] left-0 right-0 bg-card border border-line-default rounded-md shadow-md z-[var(--kv-z-dropdown)] max-h-[22rem] overflow-y-auto py-1">
          {options.map(opt => (
            <div
              key={opt}
              className={`px-3 py-2 text-md cursor-pointer transition-colors hover:bg-[var(--kv-state-hover-bg)] ${opt === value ? 'text-primary font-medium bg-[var(--kv-action-primary-faded-bg)]' : 'text-ink'}`}
              onClick={() => { onChange(opt); setOpen(false) }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const EmployeeModal = ({ nextCode, departments, positions, onClose, onSave }: Props) => {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [timekeepCode, setTimekeepCode] = useState('')
  const [phone, setPhone] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [department, setDepartment] = useState('')
  const [position, setPosition] = useState('')
  const [debt, setDebt] = useState('')
  const [note, setNote] = useState('')
  const [active, setActive] = useState(true)
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
      setError('Vui lòng nhập tên nhân viên')
      nameRef.current?.focus()
      return
    }
    const result: Employee = {
      id: Date.now(),
      code: code.trim() || nextCode,
      timekeepCode: timekeepCode.trim(),
      name: name.trim(),
      phone: phone.trim(),
      phoneVerified: false,
      idNumber: idNumber.trim(),
      debt: Number(debt || 0),
      note: note.trim(),
      department: department || 'Chưa phân phòng',
      position: position || 'Nhân viên',
      active,
      branchPay: employeeBranches[0],
      branchWork: employeeBranches[0],
      birthday: '',
      gender: '',
      address: '',
      email: '',
      facebook: '',
      startDate: '',
      account: '',
      mobileDevice: '',
    }
    onSave(result, addAnother)
    if (addAnother) {
      setName(''); setCode(''); setTimekeepCode(''); setPhone(''); setIdNumber('')
      setDebt(''); setNote(''); setError('')
      nameRef.current?.focus()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[var(--kv-z-modal)] flex items-start justify-center p-6 overflow-y-auto"
      style={{ background: 'rgba(var(--kv-black-rgb), 0.45)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-[64rem] my-6 bg-card rounded-lg shadow-lg flex flex-col max-h-[calc(100vh-6rem)]">
        <div className="flex items-center justify-between px-6 h-16 border-b border-line shrink-0">
          <h2 className="text-h3 font-bold text-ink">Thêm nhân viên</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-md text-ink-subtle cursor-pointer transition-colors hover:bg-fill hover:text-ink" aria-label="Đóng">
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 grid grid-cols-2 gap-x-8 gap-y-4">
          <Row label="Mã nhân viên">
            <input className={inputCls} placeholder={nextCode + ' (tự động)'} value={code} onChange={e => setCode(e.target.value)} />
          </Row>
          <Row label="Mã chấm công">
            <input className={inputCls} placeholder="Nhập mã chấm công" value={timekeepCode} onChange={e => setTimekeepCode(e.target.value)} />
          </Row>
          <Row label="Tên nhân viên" required>
            <input ref={nameRef} className={inputCls} placeholder="Nhập tên nhân viên" value={name} onChange={e => { setName(e.target.value); if (error) setError('') }} />
          </Row>
          <Row label="Số điện thoại">
            <input className={inputCls} inputMode="tel" placeholder="Nhập số điện thoại" value={phone} onChange={e => setPhone(e.target.value)} />
          </Row>
          <Row label="Số CMND/CCCD">
            <input className={inputCls} inputMode="numeric" placeholder="Nhập số CMND/CCCD" value={idNumber} onChange={e => setIdNumber(e.target.value)} />
          </Row>
          <Row label="Nợ và tạm ứng">
            <input
              className={`${inputCls} text-right`}
              inputMode="numeric"
              placeholder="0"
              value={debt === '' ? '' : Number(debt).toLocaleString('vi-VN')}
              onChange={e => setDebt(e.target.value.replace(/[^\d]/g, ''))}
            />
          </Row>
          <Row label="Phòng ban">
            <Picker value={department} options={departments} placeholder="Chọn phòng ban" onChange={setDepartment} />
          </Row>
          <Row label="Chức danh">
            <Picker value={position} options={positions} placeholder="Chọn chức danh" onChange={setPosition} />
          </Row>
          <div className="col-span-2">
            <Row label="Ghi chú">
              <textarea className={`${inputCls} h-[7rem] py-2 resize-none`} placeholder="Nhập ghi chú" value={note} onChange={e => setNote(e.target.value)} />
            </Row>
          </div>
          <div className="col-span-2">
            <label className="kv-check">
              <input type="checkbox" checked={active} onChange={() => setActive(v => !v)} />
              <span className="kv-check-box" />
              <span className="kv-check-text">Đang làm việc</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 px-6 py-3 border-t border-line shrink-0">
          <span className="text-md text-danger">{error}</span>
          <div className="flex items-center gap-2">
            <button className="kv-btn kv-btn-outline-neutral h-10" onClick={onClose}>Bỏ qua</button>
            <button className="kv-btn kv-btn-outline-primary h-10" onClick={() => handleSave(true)}>Lưu &amp; Thêm mới</button>
            <button className="kv-btn kv-btn-primary h-10" onClick={() => handleSave(false)}>Lưu</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmployeeModal
