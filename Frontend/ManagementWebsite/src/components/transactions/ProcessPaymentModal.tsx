import { useEffect, useState } from 'react'
import type { InvoiceSummary } from '../../services/invoiceApi'
import type { PaymentMethod } from '../../services/paymentApi'

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
      setError(submitError instanceof Error ? submitError.message : 'Không thể xử lý thanh toán')
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
