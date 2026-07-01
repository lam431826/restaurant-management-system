import { useEffect, useRef, useState } from 'react'
import type { InvoiceSummary } from '../../services/invoiceApi'
import { ApiClientError } from '../../services/apiClient'

interface Props {
  invoice: InvoiceSummary
  onClose: () => void
  onSubmit: (promotionCode: string) => Promise<void>
}

const inputCls =
  'w-full h-10 px-3 bg-field border border-line-default rounded-md text-md text-ink uppercase transition-colors ' +
  'placeholder:text-ink-muted hover:border-line-strong focus:outline-none focus:border-primary ' +
  'focus:shadow-[0_0_0_0.3rem_rgba(var(--kv-primary-rgb),0.12)]'

const DISCOUNT_ERROR_MESSAGES: Record<string, string> = {
  INVOICE_NOT_FOUND: 'Không tìm thấy hóa đơn.',
  ORDER_NOT_FOUND: 'Không tìm thấy đơn hàng.',
  PROMOTION_NOT_FOUND: 'Không tìm thấy mã khuyến mãi.',
  PROMOTION_INACTIVE: 'Mã khuyến mãi không còn hoạt động.',
  PROMOTION_EXPIRED: 'Mã khuyến mãi đã hết hạn.',
  PROMOTION_NOT_STARTED: 'Mã khuyến mãi chưa đến thời gian áp dụng.',
  PROMOTION_USAGE_LIMIT_REACHED:
    'Mã khuyến mãi đã đạt giới hạn sử dụng.',
  INVOICE_ALREADY_PAID: 'Hóa đơn này đã được thanh toán.',
  INVOICE_PROMOTION_ALREADY_APPLIED:
    'Hóa đơn này đã được áp dụng mã khuyến mãi này rồi.',
  PROMOTION_CHANGE_NOT_ALLOWED:
    'Không thể thay đổi mã khuyến mãi sau khi đã áp dụng.',
  INVOICE_ALREADY_DISCOUNTED:
    'Hóa đơn này đã có khuyến mãi, không thể áp dụng thêm.',
  ORDER_NOT_DISCOUNTABLE:
    'Không thể áp dụng khuyến mãi cho đơn đã đóng hoặc đã hủy.',
  INVALID_INVOICE_TOTAL: 'Hóa đơn có tổng tiền không hợp lệ.',
  VALIDATION_ERROR: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
  BAD_REQUEST: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
}

const DISCOUNT_MESSAGE_FALLBACKS: Record<string, string> = {
  'Invoice not found': DISCOUNT_ERROR_MESSAGES.INVOICE_NOT_FOUND,
  'Order not found': DISCOUNT_ERROR_MESSAGES.ORDER_NOT_FOUND,
  'Promotion not found': DISCOUNT_ERROR_MESSAGES.PROMOTION_NOT_FOUND,
  'Promotion is inactive': DISCOUNT_ERROR_MESSAGES.PROMOTION_INACTIVE,
  'Promotion has expired': DISCOUNT_ERROR_MESSAGES.PROMOTION_EXPIRED,
  'Promotion has not started': DISCOUNT_ERROR_MESSAGES.PROMOTION_NOT_STARTED,
  'Promotion usage limit has been reached':
    DISCOUNT_ERROR_MESSAGES.PROMOTION_USAGE_LIMIT_REACHED,
  'Invoice already paid': DISCOUNT_ERROR_MESSAGES.INVOICE_ALREADY_PAID,
  'Invoice has already been paid':
    DISCOUNT_ERROR_MESSAGES.INVOICE_ALREADY_PAID,
  'The same promotion has already been applied to this invoice':
    DISCOUNT_ERROR_MESSAGES.INVOICE_PROMOTION_ALREADY_APPLIED,
  'Cannot change promotion after one has already been applied':
    DISCOUNT_ERROR_MESSAGES.PROMOTION_CHANGE_NOT_ALLOWED,
  'Invoice already has a discount':
    DISCOUNT_ERROR_MESSAGES.INVOICE_ALREADY_DISCOUNTED,
  'Order is not discountable':
    DISCOUNT_ERROR_MESSAGES.ORDER_NOT_DISCOUNTABLE,
  'Invalid invoice total': DISCOUNT_ERROR_MESSAGES.INVALID_INVOICE_TOTAL,
  'Invoice subtotal must be greater than zero and total amount cannot be negative':
    DISCOUNT_ERROR_MESSAGES.INVALID_INVOICE_TOTAL,
  'Validation failed': DISCOUNT_ERROR_MESSAGES.VALIDATION_ERROR,
  'Invalid enum value': DISCOUNT_ERROR_MESSAGES.BAD_REQUEST,
  'Malformed or unreadable request body': DISCOUNT_ERROR_MESSAGES.BAD_REQUEST,
}

const DISCOUNT_FALLBACK_ERROR =
  'Không thể áp dụng khuyến mãi. Vui lòng thử lại.'

const getDiscountErrorMessage = (error: unknown): string => {
  if (error instanceof ApiClientError && error.code) {
    return DISCOUNT_ERROR_MESSAGES[error.code] ?? DISCOUNT_FALLBACK_ERROR
  }

  const message = error instanceof Error ? error.message : ''
  const fallback = Object.entries(DISCOUNT_MESSAGE_FALLBACKS).find(
    ([backendMessage]) => message.includes(backendMessage),
  )

  return fallback?.[1] ?? DISCOUNT_FALLBACK_ERROR
}

const ApplyDiscountModal = ({ invoice, onClose, onSubmit }: Props) => {
  const [promotionCode, setPromotionCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const codeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    codeRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!promotionCode.trim()) {
      setError('Vui lòng nhập mã khuyến mãi')
      codeRef.current?.focus()
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await onSubmit(promotionCode.trim())
    } catch (submitError) {
      setError(getDiscountErrorMessage(submitError))
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
      <form onSubmit={handleSubmit} className="w-full max-w-[48rem] my-6 bg-card rounded-lg shadow-lg flex flex-col">
        <div className="flex items-center justify-between px-6 h-16 border-b border-line">
          <h2 className="text-h3 font-bold text-ink">Áp dụng khuyến mãi</h2>
          <button type="button" onClick={onClose} disabled={submitting} className="w-9 h-9 flex items-center justify-center rounded-md text-ink-subtle cursor-pointer hover:bg-fill hover:text-ink disabled:opacity-50" aria-label="Đóng">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4 rounded-md bg-fill px-4 py-3 text-md">
            <div><span className="text-ink-muted">Hóa đơn:</span> <span className="font-semibold text-ink">{invoice.id}</span></div>
            <div className="text-right"><span className="text-ink-muted">Tạm tính:</span> <span className="font-semibold text-ink">{invoice.subtotal.toLocaleString('vi-VN')} đ</span></div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-md text-ink-subtle">Mã khuyến mãi <span className="text-danger">*</span></label>
            <input
              ref={codeRef}
              className={inputCls}
              maxLength={50}
              placeholder="Nhập mã khuyến mãi"
              value={promotionCode}
              onChange={event => { setPromotionCode(event.target.value.toUpperCase()); setError('') }}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-3 border-t border-line">
          <span className="text-md text-danger min-h-5">{error}</span>
          <div className="flex items-center justify-end gap-2">
            <button type="button" className="kv-btn kv-btn-outline-neutral h-10" onClick={onClose} disabled={submitting}>Bỏ qua</button>
            <button type="submit" className="kv-btn kv-btn-primary h-10" disabled={submitting}>{submitting ? 'Đang áp dụng...' : 'Áp dụng'}</button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default ApplyDiscountModal
