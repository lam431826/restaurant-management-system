import { useEffect, useRef, useState } from 'react'
import type { FinancialLineGroupParam, FinancialCustomLineRow } from '../../api/reports'
import { createFinancialCustomLine, updateFinancialCustomLine } from '../../api/reports'
import { ApiError } from '../../services/api'

interface Props {
  group: FinancialLineGroupParam
  line?: FinancialCustomLineRow | null
  onClose: () => void
  onSaved: () => void
}

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

/** Add/edit a single Chi phí or Thu nhập khác custom line — group is fixed by whichever
 * "+ Thêm danh mục" button opened this, never editable once created. */
const FinancialCustomLineModal = ({ group, line, onClose, onSaved }: Props) => {
  const [name, setName] = useState(line?.name ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Vui lòng nhập tên danh mục')
      nameRef.current?.focus()
      return
    }
    setSaving(true)
    setError('')
    try {
      if (line) await updateFinancialCustomLine(line.id, group, name.trim())
      else await createFinancialCustomLine(group, name.trim())
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể lưu danh mục.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[var(--kv-z-modal)] flex items-center justify-center p-4"
      style={{ background: 'rgba(var(--kv-black-rgb), 0.45)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-[36rem] bg-card rounded-xl shadow-lg flex flex-col">
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-h3 font-bold text-ink">{line ? 'Sửa danh mục' : 'Thêm danh mục'}</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-md text-ink-subtle cursor-pointer transition-colors hover:bg-fill hover:text-ink" aria-label="Đóng">
            <CloseIcon />
          </button>
        </div>

        <div className="px-6 pb-2 flex flex-col gap-3">
          <label className="text-md text-ink">Tên danh mục</label>
          <input
            ref={nameRef}
            className="w-full h-11 px-3 bg-field border border-line-default rounded-md text-md text-ink outline-none focus:border-primary"
            value={name}
            onChange={e => { setName(e.target.value); if (error) setError('') }}
          />
          {error && <span className="text-md text-danger">{error}</span>}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-line mt-4">
          <button className="kv-btn kv-btn-outline-neutral h-10 bg-card" onClick={onClose}>Bỏ qua</button>
          <button className="kv-btn kv-btn-primary h-10" disabled={saving} onClick={() => void handleSave()}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default FinancialCustomLineModal
