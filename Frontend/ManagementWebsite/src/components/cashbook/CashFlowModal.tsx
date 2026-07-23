import { useCallback, useEffect, useRef, useState } from 'react'
import { Field, Picker, SectionCard, inputCls } from '../staff/EmployeeModal'
import CategoryModal from './CategoryModal'
import { listEmployees } from '../../api/employees'
import type { EmployeeDto } from '../../api/employees'
import { useAuth } from '../../context/AuthContext'
import { METHOD_LABEL } from '../../api/cashbook'
import type {
  CashFlowCategory, CashFlowMethod, CashFlowType, CreateVoucherPayload, PartnerGroup,
} from '../../api/cashbook'

interface Props {
  type: CashFlowType
  defaultMethod?: CashFlowMethod
  categories: CashFlowCategory[]
  onClose: () => void
  onSave: (payload: CreateVoucherPayload) => Promise<void>
  onAddCategory: (type: CashFlowType, data: { name: string; description: string; accountingToIncome: boolean }) => Promise<CashFlowCategory>
  onUpdateCategory: (id: string, data: { name: string; description: string; accountingToIncome: boolean }) => Promise<void>
  onDeleteCategory: (id: string) => Promise<void>
}

type CategoryModalState = { mode: 'create' } | { mode: 'edit'; category: CashFlowCategory }

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
const PencilIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
)
const PlusCircleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" />
  </svg>
)

const partnerGroupLabel: Record<PartnerGroup, string> = { EMPLOYEE: 'Nhân viên', OTHER: 'Khác' }

const errMsg = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback

const toDatetimeLocal = (isoValue: string) => {
  const d = new Date(isoValue)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
// The datetime-local input value is already "YYYY-MM-DDTHH:mm" wall-clock time — append
// seconds directly instead of round-tripping through Date/toISOString (which shifts to UTC
// and appends "Z", breaking the backend's LocalDateTime parsing that expects no offset).
const toBackendDateTime = (value: string) => (value.length === 16 ? `${value}:00` : value)
const formatAmount = (raw: string) => {
  const digits = raw.replace(/\D/g, '')
  if (digits === '') return ''
  const n = Math.min(parseInt(digits, 10), 999_999_999_999)
  return n.toLocaleString('en-US')
}

// ── Employee search picker — used both for "Tên người nộp/nhận" (partnerGroup
// === 'EMPLOYEE') and for "Người thu/chi". `fallbackLabel` lets the latter show
// the current user's name by default without that name having to match a real
// employee record. ─────────────────────────────────────────────────────────
const EmployeePicker = ({
  value, employees, loading, fallbackLabel, onChange,
}: {
  value: string
  employees: EmployeeDto[]
  loading: boolean
  fallbackLabel?: string
  onChange: (id: string, name: string) => void
}) => {
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
        <span className={`text-md truncate ${selected || fallbackLabel ? 'text-ink' : 'text-ink-muted'}`}>
          {selected ? `${selected.code} - ${selected.name}` : (fallbackLabel || 'Chọn nhân viên')}
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

// ── "Loại thu/chi" dropdown — per-row edit (pencil) + "Tạo mới" footer row ──
const CategoryPicker = ({
  value, categories, placeholder, onSelect, onEdit, onCreate,
}: {
  value: string
  categories: CashFlowCategory[]
  placeholder: string
  onSelect: (name: string) => void
  onEdit: (category: CashFlowCategory) => void
  onCreate: () => void
}) => {
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
        className={`flex items-center justify-between w-full h-11 px-3 bg-field border rounded-md cursor-pointer transition-colors ${open ? 'border-primary' : 'border-line-default hover:border-line-strong'}`}
      >
        <span className={`text-md truncate ${value ? 'text-ink' : 'text-ink-muted'}`}>{value || placeholder}</span>
        <ChevronDown className={`text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-[calc(100%+0.4rem)] left-0 right-0 bg-card border border-line-default rounded-md shadow-md z-[var(--kv-z-dropdown)] flex flex-col overflow-hidden">
          <div className="px-3 py-2 text-sm font-medium text-ink-subtle bg-fill">Loại thu chi</div>
          <div className="overflow-y-auto max-h-[14rem] py-1">
            {categories.length === 0 && <div className="px-3 py-2 text-md text-ink-muted">Không có dữ liệu</div>}
            {categories.map(cat => (
              <div
                key={cat.id}
                className={`group flex items-center justify-between gap-2 px-3 py-2.5 cursor-pointer transition-colors hover:bg-[var(--kv-state-hover-bg)] ${cat.name === value ? 'bg-[var(--kv-action-primary-faded-bg)]' : ''}`}
                onClick={() => { onSelect(cat.name); setOpen(false) }}
              >
                <span className={`text-md truncate ${cat.name === value ? 'text-primary font-medium' : 'text-ink'}`}>{cat.name}</span>
                <button
                  type="button"
                  title="Sửa"
                  onClick={e => { e.stopPropagation(); onEdit(cat); setOpen(false) }}
                  className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-ink-subtle opacity-0 group-hover:opacity-100 hover:bg-card hover:text-primary transition-opacity cursor-pointer"
                >
                  <PencilIcon />
                </button>
              </div>
            ))}
          </div>
          <div className="border-t border-line-default shrink-0">
            <button
              type="button"
              onClick={() => { onCreate(); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-md text-primary hover:bg-primary-50 cursor-pointer"
            >
              <PlusCircleIcon /> Tạo mới
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const CashFlowModal = ({
  type, defaultMethod, categories, onClose, onSave, onAddCategory, onUpdateCategory, onDeleteCategory,
}: Props) => {
  const { user } = useAuth()

  const [dateTimeLocal, setDateTimeLocal] = useState(() => toDatetimeLocal(new Date().toISOString()))
  const [categoryName, setCategoryName] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [method] = useState<CashFlowMethod>(defaultMethod ?? 'CASH')
  const [partnerGroup, setPartnerGroup] = useState<PartnerGroup>('OTHER')
  const [partnerName, setPartnerName] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [employeeName, setEmployeeName] = useState('')
  const [collectorId, setCollectorId] = useState('')
  const [collectorName, setCollectorName] = useState(user?.fullName ?? user?.username ?? 'manager')
  const [accountingToIncome, setAccountingToIncome] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [categoryModal, setCategoryModal] = useState<CategoryModalState | null>(null)

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

  // Needed for both "Tên người nộp/nhận" (Nhân viên) and "Người thu/chi", so
  // fetch once up front instead of gating on partnerGroup.
  useEffect(() => {
    const t = setTimeout(() => { void fetchEmployees() }, 0)
    return () => clearTimeout(t)
  }, [fetchEmployees])

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

  const isReceipt = type === 'RECEIPT'
  const title = `Tạo ${isReceipt ? 'phiếu thu' : 'phiếu chi'} ${METHOD_LABEL[method].toLowerCase()}`
  const categoryTypeLabel = isReceipt ? 'Loại thu' : 'Loại chi'
  const collectorLabel = isReceipt ? 'Người thu' : 'Người chi'
  const partnerGroupFieldLabel = isReceipt ? 'Đối tượng nộp' : 'Đối tượng nhận'
  const partnerNameFieldLabel = isReceipt ? 'Tên người nộp' : 'Tên người nhận'

  const categoriesForType = categories.filter(c => c.type === type)

  const handleCategorySave = async (data: { name: string; description: string; accountingToIncome: boolean }) => {
    try {
      if (categoryModal?.mode === 'edit') {
        await onUpdateCategory(categoryModal.category.id, data)
        if (categoryModal.category.name === categoryName) setCategoryName(data.name)
      } else {
        const created = await onAddCategory(type, data)
        setCategoryName(created.name)
        if (error) setError('')
      }
      setCategoryModal(null)
    } catch (err) {
      window.alert(errMsg(err, 'Không thể lưu loại thu/chi'))
    }
  }
  const handleCategoryDelete = async () => {
    try {
      if (categoryModal?.mode === 'edit') {
        await onDeleteCategory(categoryModal.category.id)
        if (categoryModal.category.name === categoryName) setCategoryName('')
      }
      setCategoryModal(null)
    } catch (err) {
      window.alert(errMsg(err, 'Không thể xóa loại thu/chi'))
    }
  }

  const buildPayload = (): CreateVoucherPayload | null => {
    if (!categoryName) { setError('Vui lòng chọn loại thu/chi'); return null }
    const amountValue = parseInt(amount.replace(/\D/g, '') || '0', 10)
    if (amountValue <= 0) { setError('Vui lòng nhập giá trị lớn hơn 0'); return null }
    if (partnerGroup === 'OTHER' && !partnerName.trim()) { setError('Vui lòng nhập tên người nộp/nhận'); return null }
    if (partnerGroup === 'EMPLOYEE' && !employeeId) { setError('Vui lòng chọn nhân viên'); return null }

    const chosenCategory = categories.find(c => c.name === categoryName && c.type === type)
    if (!chosenCategory) { setError('Loại thu/chi không hợp lệ'); return null }

    return {
      type,
      occurredAt: toBackendDateTime(dateTimeLocal),
      categoryId: chosenCategory.id,
      method,
      partnerGroup,
      partnerId: partnerGroup === 'EMPLOYEE' ? employeeId : null,
      partnerName: partnerGroup === 'EMPLOYEE' ? employeeName : partnerName.trim(),
      amount: amountValue,
      note: note.trim(),
      accountingToIncome,
    }
  }

  const submit = async (thenPrint: boolean) => {
    const payload = buildPayload()
    if (!payload) return
    setSaving(true)
    try {
      await onSave(payload)
      if (thenPrint) window.print()
    } catch (err) {
      setError(errMsg(err, 'Không thể lưu phiếu'))
    } finally {
      setSaving(false)
    }
  }
  const handleSave = () => { void submit(false) }
  const handleSaveAndPrint = () => { void submit(true) }

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
                <input className={`${inputCls} text-ink-muted`} value="" placeholder="Tự động" disabled />
              </Field>
              <Field label="Thời gian">
                <input
                  type="datetime-local"
                  className={inputCls}
                  value={dateTimeLocal}
                  onChange={e => setDateTimeLocal(e.target.value)}
                />
              </Field>

              <Field label={categoryTypeLabel}>
                <CategoryPicker
                  value={categoryName}
                  categories={categoriesForType}
                  placeholder={isReceipt ? 'Chọn loại thu' : 'Chọn loại chi'}
                  onSelect={v => { setCategoryName(v); if (error) setError('') }}
                  onEdit={cat => setCategoryModal({ mode: 'edit', category: cat })}
                  onCreate={() => setCategoryModal({ mode: 'create' })}
                />
              </Field>
              <Field label={collectorLabel}>
                <EmployeePicker
                  value={collectorId}
                  employees={employees}
                  loading={employeesLoading}
                  fallbackLabel={collectorName}
                  onChange={(id, name) => { setCollectorId(id); setCollectorName(name) }}
                />
              </Field>

              <Field label={partnerGroupFieldLabel}>
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
              <div className="flex flex-col gap-1.5">
                <label className="text-md text-ink-subtle">{partnerNameFieldLabel}</label>
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
                    placeholder="Họ và tên"
                    value={partnerName}
                    onChange={e => { setPartnerName(e.target.value); if (error) setError('') }}
                  />
                )}
              </div>

              <Field label="Số tiền" className="md:col-span-2">
                <input
                  inputMode="numeric"
                  className={`${inputCls} text-right`}
                  placeholder="0"
                  value={amount}
                  onChange={e => { setAmount(formatAmount(e.target.value)); if (error) setError('') }}
                />
              </Field>
              <Field label="Ghi chú" className="md:col-span-2">
                <textarea
                  className={`${inputCls} h-28 py-2 resize-none`}
                  placeholder="Nhập ghi chú"
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
            <button className="kv-btn kv-btn-outline-neutral h-10" onClick={onClose} disabled={saving}>Bỏ qua</button>
            <button className="kv-btn kv-btn-outline-neutral h-10" onClick={handleSaveAndPrint} disabled={saving}>Lưu &amp; In</button>
            <button className="kv-btn kv-btn-primary h-10" onClick={handleSave} disabled={saving}>Lưu</button>
          </div>
        </div>
      </div>

      {categoryModal && (
        <CategoryModal
          type={type}
          category={categoryModal.mode === 'edit' ? categoryModal.category : undefined}
          onClose={() => setCategoryModal(null)}
          onSave={handleCategorySave}
          onDelete={categoryModal.mode === 'edit' ? handleCategoryDelete : undefined}
        />
      )}
    </div>
  )
}

export default CashFlowModal
