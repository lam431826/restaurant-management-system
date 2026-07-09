import { useEffect, useState } from 'react'
import type { InvoiceSummary } from '../../services/invoiceApi'
import type { PaymentMethod } from '../../services/paymentApi'
import { ApiClientError } from '../../services/apiClient'

interface Props {
  invoice: InvoiceSummary
  onClose: () => void
  onSubmit: (method: PaymentMethod) => Promise<void>
}

const methods: { value: PaymentMethod; label: string; description: string }[] = [
  { value: 'CASH', label: 'Tiền mặt', description: 'Thanh toán trực tiếp bằng tiền mặt' },
  { value: 'CARD', label: 'Thẻ', description: 'Thẻ tín dụng hoặc thẻ ghi nợ' },
  { value: 'QR', label: 'Mã QR', description: 'Quét mã QR để thanh toán' },
  { value: 'E_WALLET', label: 'Ví điện tử', description: 'Thanh toán qua ví điện tử' },
]

const PAYMENT_ERROR_MESSAGES: Record<string, string> = {
  INVOICE_ALREADY_PAID: 'Hóa đơn này đã được thanh toán.',
  ORDER_NOT_PAYABLE: 'Không thể thanh toán đơn đã đóng hoặc đã hủy.',
  INVALID_INVOICE_TOTAL: 'Hóa đơn có tổng tiền không hợp lệ.',
  INVOICE_NOT_FOUND: 'Không tìm thấy hóa đơn.',
  ORDER_NOT_FOUND: 'Không tìm thấy đơn hàng.',
  VALIDATION_ERROR: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
  BAD_REQUEST: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
}

const PAYMENT_MESSAGE_FALLBACKS: Record<string, string> = {
  'Invoice has already been paid': PAYMENT_ERROR_MESSAGES.INVOICE_ALREADY_PAID,
  'A paid payment already exists for this invoice':
    PAYMENT_ERROR_MESSAGES.INVOICE_ALREADY_PAID,
  'Order cannot be paid in its current status':
    PAYMENT_ERROR_MESSAGES.ORDER_NOT_PAYABLE,
  'Invoice subtotal must be greater than zero and total amount cannot be negative':
    PAYMENT_ERROR_MESSAGES.INVALID_INVOICE_TOTAL,
  'Invoice not found': PAYMENT_ERROR_MESSAGES.INVOICE_NOT_FOUND,
  'Order not found': PAYMENT_ERROR_MESSAGES.ORDER_NOT_FOUND,
  'Validation failed': PAYMENT_ERROR_MESSAGES.VALIDATION_ERROR,
  'Invalid enum value': PAYMENT_ERROR_MESSAGES.BAD_REQUEST,
  'Malformed or unreadable request body': PAYMENT_ERROR_MESSAGES.BAD_REQUEST,
}

const PAYMENT_FALLBACK_ERROR =
  'Không thể xử lý thanh toán. Vui lòng thử lại.'

const getPaymentErrorMessage = (error: unknown): string => {
  if (error instanceof ApiClientError && error.code) {
    return PAYMENT_ERROR_MESSAGES[error.code] ?? PAYMENT_FALLBACK_ERROR
  }

  const message = error instanceof Error ? error.message : ''
  const fallback = Object.entries(PAYMENT_MESSAGE_FALLBACKS).find(
    ([backendMessage]) => message.includes(backendMessage),
  )

  return fallback?.[1] ?? PAYMENT_FALLBACK_ERROR
}

const ProcessPaymentModal = ({ invoice, onClose, onSubmit }: Props) => {
  const [method, setMethod] = useState<PaymentMethod | ''>('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
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
    if (!invoice.id) {
      setError('Không xác định được hóa đơn cần thanh toán')
      return
    }
    if (!method) {
      setError('Vui lòng chọn phương thức thanh toán')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await onSubmit(method)
    } catch (submitError) {
      setError(getPaymentErrorMessage(submitError))
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
      <form onSubmit={handleSubmit} className="w-full max-w-[56rem] my-6 bg-card rounded-lg shadow-lg flex flex-col">
        <div className="flex items-center justify-between px-6 h-16 border-b border-line">
          <h2 className="text-h3 font-bold text-ink">Thanh toán hóa đơn</h2>
          <button type="button" onClick={onClose} disabled={submitting} className="w-9 h-9 flex items-center justify-center rounded-md text-ink-subtle cursor-pointer hover:bg-fill hover:text-ink disabled:opacity-50" aria-label="Đóng">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-md bg-fill px-4 py-3 text-md">
            <div><span className="text-ink-muted">Hóa đơn:</span> <span className="font-semibold text-ink break-all">{invoice.id}</span></div>
            <div className="sm:text-right"><span className="text-ink-muted">Cần thanh toán:</span> <span className="font-bold text-primary">{invoice.totalAmount.toLocaleString('vi-VN')} đ</span></div>
          </div>

          <fieldset className="flex flex-col gap-3">
            <legend className="text-md font-semibold text-ink mb-2">Phương thức thanh toán <span className="text-danger">*</span></legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {methods.map(option => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 p-4 border rounded-md cursor-pointer transition-colors ${method === option.value ? 'border-primary bg-primary-50' : 'border-line-default bg-card hover:border-primary-150'}`}
                >
                  <span className="kv-radio mt-0.5">
                    <input
                      type="radio"
                      name="payment-method"
                      value={option.value}
                      checked={method === option.value}
                      onChange={() => { setMethod(option.value); setError('') }}
                    />
                    <span className="kv-radio-dot" />
                  </span>
                  <span>
                    <span className="block text-md font-semibold text-ink">{option.label}</span>
                    <span className="block text-sm text-ink-muted mt-1">{option.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <p className="text-sm text-ink-muted">Số tiền được backend lấy trực tiếp từ tổng thanh toán của hóa đơn.</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-3 border-t border-line">
          <span className="text-md text-danger min-h-5">{error}</span>
          <div className="flex items-center justify-end gap-2">
            <button type="button" className="kv-btn kv-btn-outline-neutral h-10" onClick={onClose} disabled={submitting}>Bỏ qua</button>
            <button type="submit" className="kv-btn kv-btn-primary h-10" disabled={submitting}>{submitting ? 'Đang thanh toán...' : 'Xác nhận thanh toán'}</button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default ProcessPaymentModal
