import { useEffect, useRef, useState } from 'react'
import { ApiClientError } from '../../services/apiClient'

interface Props {
  onClose: () => void
  onSubmit: (orderId: string, promotionCode: string | null) => Promise<void>
}

const inputCls =
  'w-full h-10 px-3 bg-field border border-line-default rounded-md text-md text-ink transition-colors ' +
  'placeholder:text-ink-muted hover:border-line-strong focus:outline-none focus:border-primary ' +
  'focus:shadow-[0_0_0_0.3rem_rgba(var(--kv-primary-rgb),0.12)]'

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const CREATE_INVOICE_ERROR_MESSAGES: Record<string, string> = {
  INVOICE_NOT_FOUND: 'Không tìm thấy hóa đơn.',
  ORDER_NOT_FOUND: 'Không tìm thấy đơn hàng.',
  ORDER_ALREADY_INVOICED:
    'Đơn hàng đã có hóa đơn nên không thể chỉnh sửa món.',
  INVOICE_ALREADY_EXISTS: 'Đơn hàng này đã có hóa đơn.',
  ORDER_NOT_READY_FOR_INVOICE:
    'Đơn hàng chưa đủ điều kiện tạo hóa đơn.',
  ORDER_NOT_INVOICEABLE:
    'Đơn hàng chưa đủ điều kiện tạo hóa đơn.',
  INVALID_ORDER_ITEMS:
    'Đơn hàng không có món hợp lệ để tạo hóa đơn.',
  INVALID_INVOICE_ITEMS:
    'Đơn hàng không có món hợp lệ để tạo hóa đơn.',
  INVALID_INVOICE_TOTAL: 'Hóa đơn có tổng tiền không hợp lệ.',
  PROMOTION_NOT_FOUND: 'Không tìm thấy mã khuyến mãi.',
  PROMOTION_INACTIVE: 'Mã khuyến mãi không còn hoạt động.',
  PROMOTION_EXPIRED: 'Mã khuyến mãi đã hết hạn.',
  PROMOTION_NOT_STARTED: 'Mã khuyến mãi chưa đến thời gian áp dụng.',
  PROMOTION_USAGE_LIMIT_REACHED:
    'Mã khuyến mãi đã đạt giới hạn sử dụng.',
  VALIDATION_ERROR: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
  BAD_REQUEST: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
}

const CREATE_INVOICE_MESSAGE_FALLBACKS: Record<string, string> = {
  'Order not found': CREATE_INVOICE_ERROR_MESSAGES.ORDER_NOT_FOUND,
  'Invoice not found': CREATE_INVOICE_ERROR_MESSAGES.INVOICE_NOT_FOUND,
  'Invoice already exists':
    CREATE_INVOICE_ERROR_MESSAGES.INVOICE_ALREADY_EXISTS,
  'Invoice already exists for this order':
    CREATE_INVOICE_ERROR_MESSAGES.INVOICE_ALREADY_EXISTS,
  'Order cannot be invoiced in its current status':
    CREATE_INVOICE_ERROR_MESSAGES.ORDER_NOT_INVOICEABLE,
  'Order is not ready for invoice because some items are still pending or cooking':
    CREATE_INVOICE_ERROR_MESSAGES.ORDER_NOT_READY_FOR_INVOICE,
  'Order contains invalid invoice items':
    CREATE_INVOICE_ERROR_MESSAGES.INVALID_ORDER_ITEMS,
  'Order must contain at least one item before invoice generation':
    CREATE_INVOICE_ERROR_MESSAGES.INVALID_ORDER_ITEMS,
  'Order does not contain any payable items':
    CREATE_INVOICE_ERROR_MESSAGES.INVALID_ORDER_ITEMS,
  'Invoice subtotal must be greater than zero and total amount cannot be negative':
    CREATE_INVOICE_ERROR_MESSAGES.INVALID_INVOICE_TOTAL,
  'Invalid invoice total':
    CREATE_INVOICE_ERROR_MESSAGES.INVALID_INVOICE_TOTAL,
  'Promotion not found': CREATE_INVOICE_ERROR_MESSAGES.PROMOTION_NOT_FOUND,
  'Promotion is inactive':
    CREATE_INVOICE_ERROR_MESSAGES.PROMOTION_INACTIVE,
  'Promotion has expired':
    CREATE_INVOICE_ERROR_MESSAGES.PROMOTION_EXPIRED,
  'Promotion has not started':
    CREATE_INVOICE_ERROR_MESSAGES.PROMOTION_NOT_STARTED,
  'Promotion usage limit has been reached':
    CREATE_INVOICE_ERROR_MESSAGES.PROMOTION_USAGE_LIMIT_REACHED,
  'Validation failed': CREATE_INVOICE_ERROR_MESSAGES.VALIDATION_ERROR,
  'Invalid enum value': CREATE_INVOICE_ERROR_MESSAGES.BAD_REQUEST,
  'Malformed or unreadable request body':
    CREATE_INVOICE_ERROR_MESSAGES.BAD_REQUEST,
}

const CREATE_INVOICE_FALLBACK_ERROR =
  'Không thể tạo hóa đơn. Vui lòng thử lại.'

const getCreateInvoiceErrorMessage = (error: unknown): string => {
  if (error instanceof ApiClientError && error.code) {
    return (
      CREATE_INVOICE_ERROR_MESSAGES[error.code] ??
      CREATE_INVOICE_FALLBACK_ERROR
    )
  }

  const message = error instanceof Error ? error.message : ''
  const fallback = Object.entries(CREATE_INVOICE_MESSAGE_FALLBACKS).find(
    ([backendMessage]) => message.includes(backendMessage),
  )

  return fallback?.[1] ?? CREATE_INVOICE_FALLBACK_ERROR
}

const GenerateInvoiceModal = ({ onClose, onSubmit }: Props) => {
  const [orderId, setOrderId] = useState('')
  const [promotionCode, setPromotionCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const orderIdRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    orderIdRef.current?.focus()
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
    if (!orderId.trim()) {
      setError('Vui lòng nhập mã đơn hàng')
      orderIdRef.current?.focus()
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await onSubmit(orderId.trim(), promotionCode.trim() || null)
    } catch (submitError) {
      setError(getCreateInvoiceErrorMessage(submitError))
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
      <form onSubmit={handleSubmit} className="w-full max-w-[52rem] my-6 bg-card rounded-lg shadow-lg flex flex-col">
        <div className="flex items-center justify-between px-6 h-16 border-b border-line">
          <h2 className="text-h3 font-bold text-ink">Tạo hóa đơn</h2>
          <button type="button" onClick={onClose} disabled={submitting} className="w-9 h-9 flex items-center justify-center rounded-md text-ink-subtle cursor-pointer hover:bg-fill hover:text-ink disabled:opacity-50" aria-label="Đóng">
            <CloseIcon />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-md text-ink-subtle">Mã đơn hàng <span className="text-danger">*</span></label>
            <input
              ref={orderIdRef}
              className={inputCls}
              placeholder="Nhập mã đơn hàng đã tồn tại"
              value={orderId}
              onChange={event => { setOrderId(event.target.value); setError('') }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-md text-ink-subtle">Mã khuyến mãi</label>
            <input
              className={inputCls}
              maxLength={50}
              placeholder="Để trống nếu không áp dụng"
              value={promotionCode}
              onChange={event => { setPromotionCode(event.target.value.toUpperCase()); setError('') }}
            />
          </div>
          <p className="text-sm text-ink-muted">Tổng tiền và giảm giá được backend tính từ các món trong đơn hàng.</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-3 border-t border-line">
          <span className="text-md text-danger min-h-5">{error}</span>
          <div className="flex items-center justify-end gap-2">
            <button type="button" className="kv-btn kv-btn-outline-neutral h-10" onClick={onClose} disabled={submitting}>Bỏ qua</button>
            <button type="submit" className="kv-btn kv-btn-primary h-10" disabled={submitting}>{submitting ? 'Đang tạo...' : 'Tạo hóa đơn'}</button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default GenerateInvoiceModal
