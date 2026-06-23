import { useEffect } from 'react'

interface Props {
  title: string
  message: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const WarningIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)

const ConfirmDialog = ({
  title, message, confirmLabel = 'Xóa', cancelLabel = 'Hủy', danger = true, loading = false, onConfirm, onCancel,
}: Props) => {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel()
      if (e.key === 'Enter' && !loading) onConfirm()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [onCancel, onConfirm, loading])

  return (
    <div
      className="fixed inset-0 z-[var(--kv-z-modal)] flex items-center justify-center p-6"
      style={{ background: 'rgba(var(--kv-black-rgb), 0.45)' }}
      onMouseDown={e => { if (e.target === e.currentTarget && !loading) onCancel() }}
    >
      <div className="w-full max-w-[28rem] bg-card rounded-lg shadow-lg flex flex-col">
        <div className="flex items-start gap-4 p-6">
          <div className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center ${danger ? 'bg-danger-50 text-danger' : 'bg-primary-50 text-primary'}`}>
            <WarningIcon />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-h3 font-bold text-ink">{title}</h2>
            <div className="text-md text-ink-subtle mt-1">{message}</div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-line">
          <button className="kv-btn kv-btn-outline-neutral h-10" disabled={loading} onClick={onCancel}>{cancelLabel}</button>
          <button
            className={danger
              ? 'h-10 px-4 rounded-md bg-danger text-white font-medium transition-colors hover:bg-danger-600 disabled:opacity-60 disabled:cursor-not-allowed'
              : 'kv-btn kv-btn-primary h-10'}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? 'Đang xử lý…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
