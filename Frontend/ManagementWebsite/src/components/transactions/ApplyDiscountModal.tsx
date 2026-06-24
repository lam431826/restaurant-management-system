import { useEffect, useRef, useState } from 'react'
import type { InvoiceSummary } from '../../services/invoiceApi'

interface Props {
  invoice: InvoiceSummary
  onClose: () => void
  onSubmit: (promotionCode: string) => Promise<void>
}

const inputCls =
  'w-full h-10 px-3 bg-field border border-line-default rounded-md text-md text-ink uppercase transition-colors ' +
  'placeholder:text-ink-muted hover:border-line-strong focus:outline-none focus:border-primary ' +
  'focus:shadow-[0_0_0_0.3rem_rgba(var(--kv-primary-rgb),0.12)]'

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
      setError(submitError instanceof Error ? submitError.message : 'Không thể áp dụng khuyến mãi')
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
