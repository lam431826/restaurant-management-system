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

const Field = ({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: React.ReactNode
}) => (
  <div className="flex flex-col gap-2">
    <label className="text-md text-ink-subtle">
      {label}
      {required && <span className="text-danger ml-0.5">*</span>}
    </label>
    {children}
    {/* Reserve the message row so validating a field never shifts the form's layout. */}
    <span className={`text-sm min-h-4 ${error ? 'text-danger' : 'text-ink-muted'}`}>
      {error || hint || ''}
    </span>
  </div>
)

// Mirrors the backend contract (CreatePromotionRequest @Size / Promotion entity columns /
// PromotionServiceImpl business checks) so the form never accepts something the API rejects.
const CODE_MAX = 50 // @Size(max = 50) + column length 50
const DESCRIPTION_MAX = 200 // @Size(max = 200)
// Codes get typed at the till and read aloud, so new ones must stay unambiguous. The backend
// only enforces @NotBlank + @Size(50), so this rule is applied ONLY to a code the user actually
// typed or changed — otherwise a legacy row containing a space or lowercase letter would become
// permanently un-editable, blocking unrelated edits to that promotion.
const CODE_PATTERN = /^[A-Z0-9_-]+$/
const AMOUNT_MAX = 999_999_999_999 // discount_amount precision 12, scale 0

// Counts significant decimals via the parsed number so "0.020" reads as 2 places (not 3), and
// folds in the exponent so small values that String() renders in scientific notation are still
// measured: "1e-7" is 7 places, not 0. Without the exponent term such a value passed validation
// and was then rounded to 0.00 by decimal(5,2), silently creating a 0% promotion.
const decimalPlaces = (value: string) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  const match = /^-?\d+(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(String(parsed))
  if (!match) return 0
  const fractionDigits = match[1]?.length ?? 0
  const exponent = match[2] ? Number(match[2]) : 0
  return Math.max(0, fractionDigits - exponent)
}

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const codeRef = useRef<HTMLInputElement>(null)

  /** Clears a field's message as soon as the user edits it, so stale errors never linger. */
  const clearFieldError = (field: string) => {
    setError('')
    setFieldErrors(current => (current[field] ? { ...current, [field]: '' } : current))
  }

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
    setFieldErrors(current => ({ ...current, discountValue: '' }))
  }

  /** Returns a message per invalid field; an empty object means the form is valid. */
  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {}

    const trimmedCode = code.trim()
    // Only a code the user actually authored is held to the charset rule — see CODE_PATTERN.
    // Compared case-insensitively because the input uppercases as you type: a lowercase legacy
    // code would otherwise latch to "changed" on the first keystroke and become un-saveable.
    const codeIsUserAuthored =
      !promotion || trimmedCode.toUpperCase() !== promotion.code.trim().toUpperCase()
    if (!trimmedCode) {
      next.code = 'Vui lòng nhập mã khuyến mãi'
    } else if (trimmedCode.length > CODE_MAX) {
      next.code = `Mã khuyến mãi không được vượt quá ${CODE_MAX} ký tự`
    } else if (codeIsUserAuthored && !CODE_PATTERN.test(trimmedCode)) {
      next.code = 'Mã chỉ gồm chữ không dấu, số, dấu gạch ngang hoặc gạch dưới (không có khoảng trắng)'
    }

    if (description.trim().length > DESCRIPTION_MAX) {
      next.description = `Mô tả không được vượt quá ${DESCRIPTION_MAX} ký tự`
    }

    const discount = Number(discountValue)
    if (!discountValue.trim()) {
      next.discountValue =
        discountType === 'percent' ? 'Vui lòng nhập phần trăm giảm' : 'Vui lòng nhập số tiền giảm'
    } else if (!Number.isFinite(discount) || discount <= 0) {
      next.discountValue =
        discountType === 'percent' ? 'Phần trăm giảm phải lớn hơn 0' : 'Số tiền giảm phải lớn hơn 0'
    } else if (discountType === 'percent') {
      if (discount > 100) next.discountValue = 'Phần trăm giảm không được vượt quá 100'
      // discount_percent is precision 5, scale 2 — more decimals would be silently rounded.
      else if (decimalPlaces(discountValue) > 2) next.discountValue = 'Phần trăm giảm tối đa 2 chữ số thập phân'
    } else {
      // discount_amount is scale 0 — a fractional đồng cannot be stored.
      if (!Number.isInteger(discount)) next.discountValue = 'Số tiền giảm phải là số nguyên (đồng)'
      else if (discount > AMOUNT_MAX) next.discountValue = 'Số tiền giảm vượt quá giá trị cho phép'
    }

    if (usageLimit.trim()) {
      const limit = Number(usageLimit)
      if (!Number.isInteger(limit) || limit < 1) {
        next.usageLimit = 'Giới hạn lượt dùng phải là số nguyên từ 1 trở lên'
      } else if (limit > 2_147_483_647) {
        next.usageLimit = 'Giới hạn lượt dùng vượt quá giá trị cho phép'
      } else if (promotion && limit < promotion.usedCount) {
        next.usageLimit = `Không thể nhỏ hơn số lượt đã dùng (${promotion.usedCount})`
      }
    }

    // The backend requires validFrom strictly before validTo, so equal dates are rejected too.
    if (validFrom && validTo && validFrom >= validTo) {
      next.validTo = 'Ngày kết thúc phải sau ngày bắt đầu'
    }

    return next
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const validationErrors = validate()
    setFieldErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      setError('Vui lòng kiểm tra lại các trường được đánh dấu')
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
      {/* noValidate: the number inputs' min/max/step made the browser block submit with its own
          English message ("Value must be less than or equal to 100.") before this form's handler
          ran, so some fields got native bubbles and others got the styled Vietnamese messages
          below. Validation is owned entirely by validate() now, which covers the same rules. */}
      <form noValidate onSubmit={handleSubmit} className="w-full max-w-[72rem] my-4 md:my-6 bg-card rounded-lg shadow-lg flex flex-col max-h-[calc(100vh-4rem)]">
        <div className="flex items-center justify-between px-6 h-16 border-b border-line shrink-0">
          <h2 className="text-h3 font-bold text-ink">{isEdit ? 'Cập nhật khuyến mãi' : 'Thêm khuyến mãi'}</h2>
          <button type="button" onClick={onClose} disabled={submitting} className="w-9 h-9 flex items-center justify-center rounded-md text-ink-subtle cursor-pointer transition-colors hover:bg-fill hover:text-ink disabled:opacity-50" aria-label="Đóng">
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field
            label="Mã khuyến mãi"
            required
            error={fieldErrors.code}
            hint={`${code.trim().length}/${CODE_MAX} ký tự · chữ không dấu, số, "-", "_"`}
          >
            <input
              ref={codeRef}
              className={`${inputCls} uppercase ${fieldErrors.code ? 'border-danger' : ''}`}
              maxLength={CODE_MAX}
              placeholder="Ví dụ: SUMMER20"
              aria-invalid={!!fieldErrors.code}
              value={code}
              onChange={event => { setCode(event.target.value.toUpperCase()); clearFieldError('code') }}
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
            <Field
              label="Mô tả"
              error={fieldErrors.description}
              hint={`${description.length}/${DESCRIPTION_MAX} ký tự`}
            >
              <textarea
                className={`${inputCls} h-[7rem] py-2 resize-none ${fieldErrors.description ? 'border-danger' : ''}`}
                maxLength={DESCRIPTION_MAX}
                placeholder="Nhập mô tả khuyến mãi"
                aria-invalid={!!fieldErrors.description}
                value={description}
                onChange={event => { setDescription(event.target.value); clearFieldError('description') }}
              />
            </Field>
          </div>

          <Field
            label={discountType === 'percent' ? 'Phần trăm giảm' : 'Số tiền giảm'}
            required
            error={fieldErrors.discountValue}
            hint={discountType === 'percent' ? 'Lớn hơn 0 và tối đa 100, tối đa 2 chữ số thập phân' : 'Số nguyên đồng, lớn hơn 0'}
          >
            <div className="relative">
              <input
                className={`${inputCls} pr-12 text-right ${fieldErrors.discountValue ? 'border-danger' : ''}`}
                type="number"
                min="0"
                max={discountType === 'percent' ? 100 : undefined}
                step={discountType === 'percent' ? '0.01' : '1'}
                placeholder="0"
                aria-invalid={!!fieldErrors.discountValue}
                value={discountValue}
                onChange={event => { setDiscountValue(event.target.value); clearFieldError('discountValue') }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-md text-ink-muted">{discountType === 'percent' ? '%' : 'đ'}</span>
            </div>
          </Field>

          <Field
            label="Giới hạn lượt dùng"
            error={fieldErrors.usageLimit}
            hint={isEdit ? `Để trống là không giới hạn · đã dùng ${promotion?.usedCount ?? 0}` : 'Để trống là không giới hạn'}
          >
            <input
              className={`${inputCls} text-right ${fieldErrors.usageLimit ? 'border-danger' : ''}`}
              type="number"
              min="1"
              step="1"
              placeholder="Không giới hạn"
              aria-invalid={!!fieldErrors.usageLimit}
              value={usageLimit}
              onChange={event => { setUsageLimit(event.target.value); clearFieldError('usageLimit') }}
            />
          </Field>

          <Field label="Ngày bắt đầu" hint="Để trống là áp dụng ngay">
            <input
              className={inputCls}
              type="date"
              max={validTo || undefined}
              value={validFrom}
              onChange={event => { setValidFrom(event.target.value); clearFieldError('validTo') }}
            />
          </Field>

          <Field
            label="Ngày kết thúc"
            error={fieldErrors.validTo}
            hint="Để trống là không có ngày hết hạn"
          >
            <input
              className={`${inputCls} ${fieldErrors.validTo ? 'border-danger' : ''}`}
              type="date"
              min={validFrom || undefined}
              aria-invalid={!!fieldErrors.validTo}
              value={validTo}
              onChange={event => { setValidTo(event.target.value); clearFieldError('validTo') }}
            />
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
