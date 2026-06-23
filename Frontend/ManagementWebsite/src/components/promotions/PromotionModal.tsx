import { useEffect, useRef, useState } from 'react'
import type {
  CreatePromotionRequest,
  Promotion,
  UpdatePromotionRequest,
} from '../../services/promotionApi'

interface Props {
  promotion?: Promotion
  onClose: () => void
  onSubmit: (request: CreatePromotionRequest | UpdatePromotionRequest) => Promise<void>
}

type DiscountType = 'percent' | 'fixed'

const inputCls =
  'w-full h-10 px-3 bg-field border border-line-default rounded-md text-md text-ink transition-colors ' +
  'placeholder:text-ink-muted hover:border-line-strong focus:outline-none focus:border-primary ' +
  'focus:shadow-[0_0_0_0.3rem_rgba(var(--kv-primary-rgb),0.12)]'

const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div className="flex flex-col gap-2">
    <label className="text-md text-ink-subtle">
      {label}
      {required && <span className="text-danger ml-0.5">*</span>}
    </label>
    {children}
  </div>
)

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const PromotionModal = ({ promotion, onClose, onSubmit }: Props) => {
  const isEdit = !!promotion
  const [code, setCode] = useState(promotion?.code ?? '')
  const [description, setDescription] = useState(promotion?.description ?? '')
  const [discountType, setDiscountType] = useState<DiscountType>(promotion?.discountAmount != null ? 'fixed' : 'percent')
  const [discountValue, setDiscountValue] = useState(
    String(promotion?.discountPercent ?? promotion?.discountAmount ?? '')
  )
  const [validFrom, setValidFrom] = useState(promotion?.validFrom ?? '')
  const [validTo, setValidTo] = useState(promotion?.validTo ?? '')
  const [usageLimit, setUsageLimit] = useState(promotion?.usageLimit === null || promotion?.usageLimit === undefined ? '' : String(promotion.usageLimit))
  const [active, setActive] = useState(promotion?.active ?? true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const codeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    codeRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, submitting])

  const changeDiscountType = (type: DiscountType) => {
    setDiscountType(type)
    setDiscountValue('')
    setError('')
  }

  const validate = () => {
    if (!code.trim()) return 'Vui lòng nhập mã khuyến mãi'

    const discount = Number(discountValue)
    if (!discountValue || !Number.isFinite(discount) || discount <= 0) {
      return discountType === 'percent'
        ? 'Phần trăm giảm phải lớn hơn 0'
        : 'Số tiền giảm phải lớn hơn 0'
    }
    if (discountType === 'percent' && discount > 100) {
      return 'Phần trăm giảm không được vượt quá 100'
    }
    if (validFrom && validTo && validFrom >= validTo) {
      return 'Ngày bắt đầu phải trước ngày kết thúc'
    }
    if (usageLimit) {
      const limit = Number(usageLimit)
      if (!Number.isInteger(limit) || limit < 1) return 'Giới hạn lượt dùng phải là số nguyên từ 1 trở lên'
      if (promotion && limit < promotion.usedCount) return 'Giới hạn lượt dùng không thể nhỏ hơn số lượt đã dùng'
    }
    return ''
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    const discount = Number(discountValue)
    const baseRequest: CreatePromotionRequest = {
      code: code.trim(),
      description: description.trim(),
      discountPercent: discountType === 'percent' ? discount : null,
      discountAmount: discountType === 'fixed' ? discount : null,
      validFrom: validFrom || null,
      validTo: validTo || null,
      usageLimit: usageLimit ? Number(usageLimit) : null,
    }

    setSubmitting(true)
    setError('')
    try {
      await onSubmit(isEdit ? { ...baseRequest, active } : baseRequest)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Không thể lưu khuyến mãi')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[var(--kv-z-modal)] flex items-start justify-center p-4 md:p-6 overflow-y-auto"
      style={{ background: 'rgba(var(--kv-black-rgb), 0.45)' }}
      onMouseDown={event => { if (event.target === event.currentTarget && !submitting) onClose() }}
    >
      <form onSubmit={handleSubmit} className="w-full max-w-[72rem] my-4 md:my-6 bg-card rounded-lg shadow-lg flex flex-col max-h-[calc(100vh-4rem)]">
        <div className="flex items-center justify-between px-6 h-16 border-b border-line shrink-0">
          <h2 className="text-h3 font-bold text-ink">{isEdit ? 'Cập nhật khuyến mãi' : 'Thêm khuyến mãi'}</h2>
          <button type="button" onClick={onClose} disabled={submitting} className="w-9 h-9 flex items-center justify-center rounded-md text-ink-subtle cursor-pointer transition-colors hover:bg-fill hover:text-ink disabled:opacity-50" aria-label="Đóng">
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Mã khuyến mãi" required>
            <input
              ref={codeRef}
              className={`${inputCls} uppercase`}
              maxLength={50}
              placeholder="Ví dụ: SUMMER20"
              value={code}
              onChange={event => { setCode(event.target.value.toUpperCase()); setError('') }}
            />
          </Field>

          <Field label="Loại giảm giá" required>
            <div className="grid grid-cols-2 h-10 border border-line-default rounded-md overflow-hidden">
              <button
                type="button"
                className={`text-md font-medium transition-colors ${discountType === 'percent' ? 'bg-primary text-white' : 'bg-field text-ink hover:bg-fill'}`}
                onClick={() => changeDiscountType('percent')}
              >
                Theo phần trăm
              </button>
              <button
                type="button"
                className={`text-md font-medium border-l border-line-default transition-colors ${discountType === 'fixed' ? 'bg-primary text-white' : 'bg-field text-ink hover:bg-fill'}`}
                onClick={() => changeDiscountType('fixed')}
              >
                Số tiền cố định
              </button>
            </div>
          </Field>

          <div className="md:col-span-2">
            <Field label="Mô tả">
              <textarea
                className={`${inputCls} h-[7rem] py-2 resize-none`}
                maxLength={200}
                placeholder="Nhập mô tả khuyến mãi"
                value={description}
                onChange={event => setDescription(event.target.value)}
              />
            </Field>
          </div>

          <Field label={discountType === 'percent' ? 'Phần trăm giảm' : 'Số tiền giảm'} required>
            <div className="relative">
              <input
                className={`${inputCls} pr-12 text-right`}
                type="number"
                min="0"
                max={discountType === 'percent' ? 100 : undefined}
                step={discountType === 'percent' ? '0.01' : '1'}
                placeholder="0"
                value={discountValue}
                onChange={event => { setDiscountValue(event.target.value); setError('') }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-md text-ink-muted">{discountType === 'percent' ? '%' : 'đ'}</span>
            </div>
          </Field>

          <Field label="Giới hạn lượt dùng">
            <input
              className={`${inputCls} text-right`}
              type="number"
              min="1"
              step="1"
              placeholder="Không giới hạn"
              value={usageLimit}
              onChange={event => { setUsageLimit(event.target.value); setError('') }}
            />
          </Field>

          <Field label="Ngày bắt đầu">
            <input className={inputCls} type="date" value={validFrom} onChange={event => { setValidFrom(event.target.value); setError('') }} />
          </Field>

          <Field label="Ngày kết thúc">
            <input className={inputCls} type="date" value={validTo} onChange={event => { setValidTo(event.target.value); setError('') }} />
          </Field>

          {isEdit && (
            <div className="md:col-span-2 flex items-center justify-between gap-4 rounded-md bg-fill px-4 py-3">
              <label className="kv-check">
                <input type="checkbox" checked={active} onChange={() => setActive(value => !value)} />
                <span className="kv-check-box" />
                <span className="kv-check-text">Đang hoạt động</span>
              </label>
              <span className="text-md text-ink-muted">Đã sử dụng: {promotion?.usedCount ?? 0} lượt</span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-3 border-t border-line shrink-0">
          <span className="text-md text-danger min-h-5">{error}</span>
          <div className="flex items-center justify-end gap-2">
            <button type="button" className="kv-btn kv-btn-outline-neutral h-10" onClick={onClose} disabled={submitting}>Bỏ qua</button>
            <button type="submit" className="kv-btn kv-btn-primary h-10" disabled={submitting}>
              {submitting ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default PromotionModal
