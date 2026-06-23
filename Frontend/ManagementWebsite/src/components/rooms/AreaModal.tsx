import { useEffect, useRef, useState } from 'react'
import { createArea } from '../../services/tableService'
import { ApiError } from '../../services/api'

interface Props {
  existingNames: string[]
  onClose: () => void
  onSaved: () => void
}

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const inputCls =
  'w-full h-10 px-3 bg-field border border-line-default rounded-md text-md text-ink transition-colors ' +
  'placeholder:text-ink-muted hover:border-line-strong focus:outline-none focus:border-primary ' +
  'focus:shadow-[0_0_0_0.3rem_rgba(var(--kv-primary-rgb),0.12)]'

const AreaModal = ({ existingNames, onClose, onSaved }: Props) => {
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
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
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Vui lòng nhập tên khu vực')
      nameRef.current?.focus()
      return
    }
    if (existingNames.some(n => n.toLowerCase() === trimmed.toLowerCase())) {
      setError('Khu vực này đã tồn tại')
      return
    }
    setSaving(true)
    setError('')
    try {
      await createArea(trimmed, note.trim())
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Tạo khu vực thất bại.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[var(--kv-z-modal)] flex items-start justify-center p-6 overflow-y-auto"
      style={{ background: 'rgba(var(--kv-black-rgb), 0.45)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-[40rem] my-[10vh] bg-card rounded-lg shadow-lg flex flex-col">
        <div className="flex items-center justify-between px-6 h-16 border-b border-line shrink-0">
          <h2 className="text-h3 font-bold text-ink">Thêm khu vực</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-md text-ink-subtle cursor-pointer transition-colors hover:bg-fill hover:text-ink" aria-label="Đóng">
            <CloseIcon />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-md text-ink-subtle">Tên khu vực<span className="text-danger ml-0.5">*</span></label>
            <input
              ref={nameRef}
              className={inputCls}
              placeholder="Bắt buộc"
              value={name}
              onChange={e => { setName(e.target.value); if (error) setError('') }}
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-md text-ink-subtle">Ghi chú</label>
            <textarea
              className={`${inputCls} h-[7rem] py-2 resize-none`}
              placeholder="Nhập ghi chú"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 px-6 py-3 border-t border-line shrink-0">
          <span className="text-md text-danger">{error}</span>
          <div className="flex items-center gap-2">
            <button className="kv-btn kv-btn-text-primary h-10 text-ink-subtle" disabled={saving} onClick={onClose}>Bỏ qua</button>
            <button className="kv-btn kv-btn-primary h-10" disabled={saving} onClick={handleSave}>{saving ? 'Đang lưu…' : 'Lưu'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AreaModal
