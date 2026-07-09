import { useEffect, useState } from 'react'
import type { ShiftTemplate } from '../../../services/rosterService'
import { deleteTemplate } from '../../../services/rosterService'
import { ApiError } from '../../../services/api'
import { formatTime } from './scheduleUtils'
import ConfirmDialog from '../../menu/ConfirmDialog'
import ShiftTemplateModal from './ShiftTemplateModal'

interface Props {
  templates: ShiftTemplate[]
  onClose: () => void
  onChanged: () => void
}

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

// 'new' opens the add form; a template opens the edit form; null keeps it closed.
type FormState = 'new' | ShiftTemplate | null

const TemplateManagerModal = ({ templates, onClose, onChanged }: Props) => {
  const [form, setForm] = useState<FormState>(null)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<ShiftTemplate | null>(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const doDelete = async () => {
    if (!confirmDelete) return
    try {
      await deleteTemplate(confirmDelete.id)
      onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể xóa ca làm việc.')
    } finally {
      setConfirmDelete(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[var(--kv-z-modal)] flex items-start justify-center p-6 overflow-y-auto"
      style={{ background: 'rgba(var(--kv-black-rgb), 0.45)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-[36rem] my-[8vh] bg-card rounded-lg shadow-lg flex flex-col max-h-[calc(100vh-12vh)]">
        <div className="flex items-center justify-between px-6 h-16 border-b border-line shrink-0">
          <h2 className="text-h3 font-bold text-ink">Quản lý ca làm việc</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-md text-ink-subtle cursor-pointer transition-colors hover:bg-fill hover:text-ink" aria-label="Đóng">
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-2">
          <button className="text-md font-medium text-primary text-left px-2 py-1 hover:underline" onClick={() => { setError(''); setForm('new') }}>
            + Thêm ca làm việc
          </button>

          {error && <span className="px-2 text-md text-danger">{error}</span>}

          {templates.map(s => (
            <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-fill">
              <div className="flex-1 min-w-0">
                <div className="text-md font-semibold text-ink">{s.name}</div>
                <div className="text-sm text-ink-subtle">
                  {formatTime(s.startTime)} - {formatTime(s.endTime)} · Nghỉ {s.breakMinutes}p · {s.headcountTarget} người · {s.wage.toLocaleString('vi-VN')}đ
                </div>
              </div>
              <button className="text-sm text-primary hover:underline shrink-0" onClick={() => { setError(''); setForm(s) }}>Sửa</button>
              <button className="text-sm text-danger hover:underline shrink-0" onClick={() => setConfirmDelete(s)}>Xóa</button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-4 px-6 py-3 border-t border-line shrink-0">
          <button className="kv-btn kv-btn-primary h-10" onClick={onClose}>Xong</button>
        </div>
      </div>

      {form && (
        <ShiftTemplateModal
          template={form === 'new' ? null : form}
          onClose={() => setForm(null)}
          onSaved={() => { setForm(null); onChanged() }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Xóa ca làm việc"
          message={<>Bạn có chắc muốn xóa ca <b className="text-ink">{confirmDelete.name}</b>?</>}
          confirmLabel="Xóa"
          cancelLabel="Hủy"
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}

export default TemplateManagerModal
