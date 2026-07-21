import { useEffect, useState } from 'react'
import { inputCls } from '../staff/EmployeeModal'
import type { CashFlowCategory, CashFlowType } from '../../data/cashBookMockData'

interface Props {
  type: CashFlowType
  category?: CashFlowCategory // undefined = create mode
  onClose: () => void
  onSave: (data: { name: string; description: string; accountingToIncome: boolean }) => void
  onDelete?: () => void
}

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
)

const CategoryModal = ({ type, category, onClose, onSave, onDelete }: Props) => {
  const isReceipt = type === 'RECEIPT'
  const isEdit = !!category

  const [name, setName] = useState(category?.name ?? '')
  const [description, setDescription] = useState(category?.description ?? '')
  const [accountingToIncome, setAccountingToIncome] = useState(category?.accountingToIncome ?? true)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const title = isEdit ? (isReceipt ? 'Sửa loại thu' : 'Sửa loại chi') : (isReceipt ? 'Tạo loại thu' : 'Tạo loại chi')
  const nameLabel = isReceipt ? 'Tên loại thu' : 'Tên loại chi'

  const handleSave = () => {
    if (!name.trim()) { setError('Vui lòng nhập tên loại thu/chi'); return }
    onSave({ name: name.trim(), description: description.trim(), accountingToIncome })
  }

  return (
    <div
      className="fixed inset-0 z-[var(--kv-z-modal)] flex items-start justify-center p-4 sm:p-6 overflow-y-auto"
      style={{ background: 'rgba(var(--kv-black-rgb), 0.45)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-[42rem] my-[10vh] bg-surface rounded-lg shadow-lg flex flex-col">
        <div className="flex items-center justify-between px-6 h-16 bg-card rounded-t-lg border-b border-line shrink-0">
          <h2 className="text-h3 font-bold text-ink">{title}</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-md text-ink-subtle cursor-pointer transition-colors hover:bg-fill hover:text-ink" aria-label="Đóng">
            <CloseIcon />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-md text-ink-subtle">{nameLabel}</label>
            <input
              autoFocus
              className={inputCls}
              value={name}
              onChange={e => { setName(e.target.value); if (error) setError('') }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-md text-ink-subtle">Mô tả</label>
            <textarea
              className={`${inputCls} h-24 py-2 resize-none`}
              placeholder="Nhập mô tả"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={accountingToIncome}
              onChange={e => setAccountingToIncome(e.target.checked)}
              className="w-4 h-4 accent-[var(--kv-primary)] cursor-pointer"
            />
            <span className="text-md text-ink">Hạch toán vào kết quả hoạt động kinh doanh</span>
          </label>
        </div>

        <div className="flex items-center justify-between gap-4 px-6 py-3 bg-card rounded-b-lg border-t border-line shrink-0">
          {isEdit ? (
            <button type="button" className="flex items-center gap-1.5 text-md text-ink-subtle hover:text-danger cursor-pointer" onClick={onDelete}>
              <TrashIcon /> Xóa
            </button>
          ) : <span />}
          <div className="flex items-center gap-2">
            {error && <span className="text-md text-danger">{error}</span>}
            <button className="kv-btn kv-btn-outline-neutral h-10" onClick={onClose}>Bỏ qua</button>
            <button className="kv-btn kv-btn-primary h-10" onClick={handleSave}>Lưu</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CategoryModal
