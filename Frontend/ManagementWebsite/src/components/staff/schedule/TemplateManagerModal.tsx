import { useEffect, useState } from 'react'
import type { ShiftTemplate } from '../../../services/rosterService'
import { createTemplate, updateTemplate, deleteTemplate } from '../../../services/rosterService'
import { ApiError } from '../../../services/api'
import { formatTime } from './scheduleUtils'
import ConfirmDialog from '../../menu/ConfirmDialog'

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

const inputCls =
  'h-9 px-3 bg-field border border-line-default rounded-md text-md text-ink transition-colors ' +
  'placeholder:text-ink-muted hover:border-line-strong focus:outline-none focus:border-primary'

type Draft = { name: string; start: string; end: string; breakMinutes: string; headcountTarget: string; wage: string }
const emptyDraft: Draft = { name: '', start: '07:00', end: '11:00', breakMinutes: '0', headcountTarget: '1', wage: '0' }

const toDraft = (s: ShiftTemplate): Draft => ({
  name: s.name, start: formatTime(s.startTime), end: formatTime(s.endTime),
  breakMinutes: String(s.breakMinutes), headcountTarget: String(s.headcountTarget), wage: String(s.wage),
})

const TemplateManagerModal = ({ templates, onClose, onChanged }: Props) => {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
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

  const startAdd = () => { setAdding(true); setEditingId(null); setDraft(emptyDraft); setError('') }
  const startEdit = (s: ShiftTemplate) => { setEditingId(s.id); setAdding(false); setDraft(toDraft(s)); setError('') }
  const cancelForm = () => { setAdding(false); setEditingId(null); setError('') }

  const submit = async () => {
    const name = draft.name.trim()
    if (!name) { setError('Vui lòng nhập tên ca làm việc'); return }
    const payload = {
      name,
      startTime: `${draft.start}:00`,
      endTime: `${draft.end}:00`,
      breakMinutes: Number(draft.breakMinutes) || 0,
      headcountTarget: Number(draft.headcountTarget) || 0,
      wage: Number(draft.wage) || 0,
    }
    try {
      if (editingId) await updateTemplate(editingId, payload)
      else await createTemplate(payload)
      onChanged()
      cancelForm()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể lưu ca làm việc.')
    }
  }

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

  const formFields = (
    <div className="grid grid-cols-2 gap-3 p-3 bg-fill rounded-md">
      <div className="col-span-2 flex flex-col gap-1">
        <label className="text-sm text-ink-subtle">Tên ca làm việc</label>
        <input className={inputCls} value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} autoFocus />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm text-ink-subtle">Giờ bắt đầu</label>
        <input type="time" className={inputCls} value={draft.start} onChange={e => setDraft(d => ({ ...d, start: e.target.value }))} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm text-ink-subtle">Giờ kết thúc</label>
        <input type="time" className={inputCls} value={draft.end} onChange={e => setDraft(d => ({ ...d, end: e.target.value }))} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm text-ink-subtle">Nghỉ giữa ca (phút)</label>
        <input type="number" min="0" className={inputCls} value={draft.breakMinutes} onChange={e => setDraft(d => ({ ...d, breakMinutes: e.target.value }))} />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm text-ink-subtle">Số nhân viên cần</label>
        <input type="number" min="0" className={inputCls} value={draft.headcountTarget} onChange={e => setDraft(d => ({ ...d, headcountTarget: e.target.value }))} />
      </div>
      <div className="flex flex-col gap-1 col-span-2">
        <label className="text-sm text-ink-subtle">Tiền công mỗi ca (đ)</label>
        <input type="number" min="0" className={inputCls} value={draft.wage} onChange={e => setDraft(d => ({ ...d, wage: e.target.value }))} />
      </div>
      {error && <span className="col-span-2 text-md text-danger">{error}</span>}
      <div className="col-span-2 flex items-center gap-2 justify-end">
        <button className="kv-btn kv-btn-outline-neutral h-9" onClick={cancelForm}>Hủy</button>
        <button className="kv-btn kv-btn-primary h-9" onClick={submit}>Lưu</button>
      </div>
    </div>
  )

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
          {!adding && (
            <button className="text-md font-medium text-primary text-left px-2 py-1 hover:underline" onClick={startAdd}>
              + Thêm ca làm việc
            </button>
          )}
          {adding && formFields}

          {templates.map(s => (
            editingId === s.id ? (
              <div key={s.id}>{formFields}</div>
            ) : (
              <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-fill">
                <div className="flex-1 min-w-0">
                  <div className="text-md font-semibold text-ink">{s.name}</div>
                  <div className="text-sm text-ink-subtle">
                    {formatTime(s.startTime)} - {formatTime(s.endTime)} · Nghỉ {s.breakMinutes}p · {s.headcountTarget} người · {s.wage.toLocaleString('vi-VN')}đ
                  </div>
                </div>
                <button className="text-sm text-primary hover:underline shrink-0" onClick={() => startEdit(s)}>Sửa</button>
                <button className="text-sm text-danger hover:underline shrink-0" onClick={() => setConfirmDelete(s)}>Xóa</button>
              </div>
            )
          ))}
        </div>

        <div className="flex items-center justify-end gap-4 px-6 py-3 border-t border-line shrink-0">
          <button className="kv-btn kv-btn-primary h-10" onClick={onClose}>Xong</button>
        </div>
      </div>

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
