import { useEffect, useRef, useState } from 'react'

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
      setError(submitError instanceof Error ? submitError.message : 'Không thể tạo hóa đơn')
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
              placeholder="Nhập orderId đã tồn tại"
              value={orderId}
              onChange={event => { setOrderId(event.target.value); setError('') }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-md text-ink-subtle">Mã khuyến mãi</label>
            <input
              className={`${inputCls} uppercase`}
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
