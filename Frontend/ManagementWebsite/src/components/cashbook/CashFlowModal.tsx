import { useCallback, useEffect, useRef, useState } from 'react'
import { Field, Picker, SectionCard, inputCls } from '../staff/EmployeeModal'
import { listEmployees } from '../../api/employees'
import type { EmployeeDto } from '../../api/employees'
import { useAuth } from '../../context/AuthContext'
import {
  METHOD_LABEL, CASH_FLOW_METHODS, nextVoucherCode,
} from '../../data/cashBookMockData'
import type {
  CashFlowCategory, CashFlowMethod, CashFlowType, CashFlowVoucher, PartnerGroup,
} from '../../data/cashBookMockData'

interface Props {
  type: CashFlowType
  defaultMethod?: CashFlowMethod
  categories: CashFlowCategory[]
  vouchers: CashFlowVoucher[]
  onClose: () => void
  onSave: (voucher: CashFlowVoucher) => void
  onAddCategory: (name: string, type: CashFlowType) => CashFlowCategory
}

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
const InfoIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted shrink-0">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
)
const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted shrink-0">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)
const ChevronDown = ({ className = '' }: { className?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

const partnerGroupLabel: Record<PartnerGroup, string> = { EMPLOYEE: 'Nhân viên', OTHER: 'Khác' }
const methodLabels = CASH_FLOW_METHODS.map(m => METHOD_LABEL[m])
const labelToMethod = (label: string): CashFlowMethod =>
  CASH_FLOW_METHODS.find(m => METHOD_LABEL[m] === label) ?? 'CASH'

const toDatetimeLocal = (isoValue: string) => {
  const d = new Date(isoValue)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const fromDatetimeLocal = (value: string) => new Date(value).toISOString()
const formatAmount = (raw: string) => {
  const digits = raw.replace(/\D/g, '')
  if (digits === '') return ''
  const n = Math.min(parseInt(digits, 10), 999_999_999_999)
  return n.toLocaleString('en-US')
}

// ── Inline "+ add category" popover next to the Loại thu/chi picker ────────
const CategoryAdd = ({ onAdd }: { onAdd: (name: string) => void }) => {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const submit = () => {
    if (!name.trim()) return
    onAdd(name.trim())
    setName(''); setOpen(false)
  }
  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title="Thêm loại thu/chi"
        className="w-11 h-11 flex items-center justify-center rounded-md border border-line-default text-primary text-xl leading-none cursor-pointer hover:bg-primary-50"
      >
        +
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+0.4rem)] z-[var(--kv-z-dropdown)] w-72 bg-card border border-line-default rounded-lg shadow-lg p-3">
          <input
            autoFocus
            className={inputCls}
            placeholder="Tên loại thu/chi"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit() }}
          />
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" className="kv-btn kv-btn-outline-neutral h-8 bg-card" onClick={() => setOpen(false)}>Bỏ qua</button>
            <button type="button" className="kv-btn kv-btn-primary h-8" onClick={submit}>Thêm</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Employee search picker (partnerGroup === 'EMPLOYEE') ───────────────────
const EmployeePicker = ({
  value, employees, loading, onChange,
}: { value: string; employees: EmployeeDto[]; loading: boolean; onChange: (id: string, name: string) => void }) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const filtered = employees.filter(e =>
    !query.trim() || `${e.code} ${e.name}`.toLowerCase().includes(query.trim().toLowerCase()))
  const selected = employees.find(e => e.id === value)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center justify-between w-full h-11 px-3 bg-field border rounded-md cursor-pointer transition-colors ${open ? 'border-primary' : 'border-line-default hover:border-line-strong'}`}
      >
        <span className={`text-md truncate ${value ? 'text-ink' : 'text-ink-muted'}`}>
          {selected ? `${selected.code} - ${selected.name}` : 'Chọn nhân viên'}
        </span>
        <ChevronDown className={`text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-[calc(100%+0.4rem)] left-0 right-0 bg-card border border-line-default rounded-md shadow-md z-[var(--kv-z-dropdown)] flex flex-col max-h-[20rem]">
          <div className="p-2 shrink-0">
            <div className="flex items-center gap-2 h-10 px-3 bg-field border border-line-default rounded-md">
              <SearchIcon />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Tìm nhân viên"
                className="flex-1 min-w-0 bg-transparent text-md text-ink placeholder:text-ink-muted focus:outline-none"
              />
            </div>
          </div>
          <div className="overflow-y-auto py-1">
            {loading && <div className="px-3 py-2 text-md text-ink-muted">Đang tải...</div>}
            {!loading && filtered.length === 0 && <div className="px-3 py-2 text-md text-ink-muted">Không có dữ liệu</div>}
            {!loading && filtered.map(e => (
              <div
                key={e.id}
                className={`px-3 py-2.5 cursor-pointer transition-colors hover:bg-[var(--kv-state-hover-bg)] ${e.id === value ? 'bg-[var(--kv-action-primary-faded-bg)]' : ''}`}
                onClick={() => { onChange(e.id, e.name); setOpen(false); setQuery('') }}
              >
                <div className="text-md font-bold text-ink">{e.code}</div>
                <div className="text-sm text-ink-subtle">{e.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const CashFlowModal = ({ type, defaultMethod, categories, vouchers, onClose, onSave, onAddCategory }: Props) => {
  const { user } = useAuth()

  const [dateTimeLocal, setDateTimeLocal] = useState(() => toDatetimeLocal(new Date().toISOString()))
  const [categoryName, setCategoryName] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [method, setMethod] = useState<CashFlowMethod>(defaultMethod ?? 'CASH')
  const [partnerGroup, setPartnerGroup] = useState<PartnerGroup>('OTHER')
  const [partnerName, setPartnerName] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [employeeName, setEmployeeName] = useState('')
  const [accountingToIncome, setAccountingToIncome] = useState(true)
  const [error, setError] = useState('')
  // categories prop is stable for the lifetime of this modal instance (it only
  // changes via handleAddCategory below, which updates this state directly).
  const [localCategories, setLocalCategories] = useState(categories)

  const [employees, setEmployees] = useState<EmployeeDto[]>([])
  const [employeesLoading, setEmployeesLoading] = useState(false)

  const fetchEmployees = useCallback(async () => {
    setEmployeesLoading(true)
    try {
      const res = await listEmployees({ size: 200, status: 'ACTIVE' })
      setEmployees(res.data.data)
    } catch {
      setEmployees([])
    } finally {
      setEmployeesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (partnerGroup !== 'EMPLOYEE' || employees.length > 0) return
    const t = setTimeout(() => { void fetchEmployees() }, 0)
    return () => clearTimeout(t)
  }, [partnerGroup, employees.length, fetchEmployees])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const code = nextVoucherCode(vouchers, type)
  const title = type === 'RECEIPT' ? 'Thêm phiếu thu' : 'Thêm phiếu chi'

  const categoryOptions = localCategories.filter(c => c.type === type).map(c => c.name)

  const handleAddCategory = (name: string) => {
    const created = onAddCategory(name, type)
    setLocalCategories(list => [...list, created])
    setCategoryName(created.name)
  }

  const handleSave = () => {
    if (!categoryName) { setError('Vui lòng chọn loại thu/chi'); return }
    const amountValue = parseInt(amount.replace(/\D/g, '') || '0', 10)
    if (amountValue <= 0) { setError('Vui lòng nhập giá trị lớn hơn 0'); return }
    if (partnerGroup === 'OTHER' && !partnerName.trim()) { setError('Vui lòng nhập tên người nộp/nhận'); return }
    if (partnerGroup === 'EMPLOYEE' && !employeeId) { setError('Vui lòng chọn nhân viên'); return }

    const chosenCategory = localCategories.find(c => c.name === categoryName && c.type === type)
    if (!chosenCategory) { setError('Loại thu/chi không hợp lệ'); return }

    const payload: CashFlowVoucher = {
      id: crypto.randomUUID(),
      code,
      type,
      createdAt: fromDatetimeLocal(dateTimeLocal),
      categoryId: chosenCategory.id,
      method,
      partnerGroup,
      partnerId: partnerGroup === 'EMPLOYEE' ? employeeId : null,
      partnerName: partnerGroup === 'EMPLOYEE' ? employeeName : partnerName.trim(),
      amount: amountValue,
      note: note.trim(),
      accountingToIncome,
      createdBy: user?.fullName ?? user?.username ?? 'manager',
      voided: false,
    }
    onSave(payload)
  }

  return (
    <div
      className="fixed inset-0 z-[var(--kv-z-modal)] flex items-start justify-center p-4 sm:p-6 overflow-y-auto"
      style={{ background: 'rgba(var(--kv-black-rgb), 0.45)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-[64rem] my-[6vh] bg-surface rounded-lg shadow-lg flex flex-col">
        <div className="flex items-center justify-between px-6 h-16 bg-card rounded-t-lg border-b border-line shrink-0">
          <h2 className="text-h3 font-bold text-ink">{title}</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-md text-ink-subtle cursor-pointer transition-colors hover:bg-fill hover:text-ink" aria-label="Đóng">
            <CloseIcon />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <SectionCard>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <Field label="Mã phiếu">
                <input className={`${inputCls} text-ink-muted`} value={code} disabled />
              </Field>
              <Field label="Thời gian">
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={dateTimeLocal}
                  onChange={e => setDateTimeLocal(e.target.value)}
                />
              </Field>

              <Field label={type === 'RECEIPT' ? 'Loại thu' : 'Loại chi'}>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <Picker
                      value={categoryName}
                      options={categoryOptions}
                      placeholder={type === 'RECEIPT' ? 'Chọn loại thu' : 'Chọn loại chi'}
                      onChange={v => { setCategoryName(v); if (error) setError('') }}
                    />
                  </div>
                  <CategoryAdd onAdd={handleAddCategory} />
                </div>
              </Field>
              <Field label="Giá trị">
                <input
                  inputMode="numeric"
                  className={`${inputCls} text-right`}
                  placeholder="0"
                  value={amount}
                  onChange={e => { setAmount(formatAmount(e.target.value)); if (error) setError('') }}
                />
              </Field>

              <Field label="Nhóm người nộp/nhận">
                <Picker
                  value={partnerGroupLabel[partnerGroup]}
                  options={Object.values(partnerGroupLabel)}
                  placeholder="Chọn nhóm"
                  onChange={v => {
                    const next = (Object.entries(partnerGroupLabel).find(([, label]) => label === v)?.[0] ?? 'OTHER') as PartnerGroup
                    setPartnerGroup(next)
                    if (error) setError('')
                  }}
                />
              </Field>
              <Field label="Tên người nộp/nhận">
                {partnerGroup === 'EMPLOYEE' ? (
                  <EmployeePicker
                    value={employeeId}
                    employees={employees}
                    loading={employeesLoading}
                    onChange={(id, name) => { setEmployeeId(id); setEmployeeName(name); if (error) setError('') }}
                  />
                ) : (
                  <input
                    className={inputCls}
                    placeholder="Nhập tên"
                    value={partnerName}
                    onChange={e => { setPartnerName(e.target.value); if (error) setError('') }}
                  />
                )}
              </Field>

              <Field label="Phương thức">
                <Picker
                  value={METHOD_LABEL[method]}
                  options={methodLabels}
                  placeholder="Chọn phương thức"
                  onChange={v => setMethod(labelToMethod(v))}
                />
              </Field>
              <Field label="Ghi chú">
                <textarea
                  className={`${inputCls} h-11 py-2 resize-none`}
                  placeholder="Ghi chú"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </Field>
            </div>

            <label className="flex items-center gap-2 mt-4 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={accountingToIncome}
                onChange={e => setAccountingToIncome(e.target.checked)}
                className="w-4 h-4 accent-[var(--kv-primary)] cursor-pointer"
              />
              <span className="text-md text-ink">Hạch toán vào kết quả hoạt động kinh doanh</span>
              <span title="Chọn trong trường hợp giá trị này là khoản Thu nhập thêm hoặc Chi phí vận hành, phát sinh của cửa hàng. Không chọn trong trường hợp Thu tiền hàng hoặc Trả tiền nhà cung cấp.">
                <InfoIcon />
              </span>
            </label>
          </SectionCard>
        </div>

        <div className="flex items-center justify-between gap-4 px-6 py-3 bg-card rounded-b-lg border-t border-line shrink-0">
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

export default CashFlowModal
