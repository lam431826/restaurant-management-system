import { useEffect, useState } from 'react'
import { createCategory, updateCategory, deleteCategory } from '../../services/menuService'
import type { MenuCategory } from '../../services/menuService'
import { ApiError } from '../../services/api'
import ConfirmDialog from './ConfirmDialog'

interface Props {
  categories: MenuCategory[]
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

const CategoryManagerModal = ({ categories, onClose, onChanged }: Props) => {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<MenuCategory | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose, busy])

  const startCreate = () => { setCreating(true); setNewName(''); setError('') }

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) { setError('Tên nhóm không được để trống'); return }
    setBusy(true)
    setError('')
    try {
      await createCategory({ name, displayOrder: categories.length })
      setCreating(false)
      setNewName('')
      onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Tạo nhóm thất bại.')
    } finally {
      setBusy(false)
    }
  }

  const startEdit = (c: MenuCategory) => { setEditingId(c.id); setEditName(c.name); setError('') }

  const saveRename = async (c: MenuCategory) => {
    const name = editName.trim()
    if (!name) { setError('Tên nhóm không được để trống'); return }
    setBusy(true)
    setError('')
    try {
      await updateCategory(c.id, { name, displayOrder: c.displayOrder, icon: c.icon ?? undefined })
      setEditingId(null)
      onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Đổi tên nhóm thất bại.')
    } finally {
      setBusy(false)
    }
  }

  const doDelete = async () => {
    if (!confirmDeleteCat) return
    setBusy(true)
    setError('')
    try {
      await deleteCategory(confirmDeleteCat.id)
      setConfirmDeleteCat(null)
      onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xóa nhóm thất bại.')
      setConfirmDeleteCat(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[var(--kv-z-modal)] flex items-start justify-center p-6 overflow-y-auto"
      style={{ background: 'rgba(var(--kv-black-rgb), 0.45)' }}
      onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose() }}
    >
      <div className="w-full max-w-[42rem] my-[8vh] bg-card rounded-lg shadow-lg flex flex-col max-h-[calc(100vh-12vh)]">
        <div className="flex items-center justify-between px-6 h-16 border-b border-line shrink-0">
          <h2 className="text-h3 font-bold text-ink">Quản lý nhóm món</h2>
          <div className="flex items-center gap-3">
            {!creating && (
              <button className="text-sm font-medium text-primary hover:underline" onClick={startCreate}>
                + Tạo nhóm mới
              </button>
            )}
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-md text-ink-subtle cursor-pointer transition-colors hover:bg-fill hover:text-ink" aria-label="Đóng">
              <CloseIcon />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-3">
          {creating && (
            <div className="flex items-center gap-2 px-2 py-2 rounded-md bg-fill">
              <input
                className={`${inputCls} flex-1`}
                placeholder="Tên nhóm món mới"
                value={newName}
                autoFocus
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
              />
              <button className="kv-btn kv-btn-primary h-8" disabled={busy} onClick={handleCreate}>Lưu</button>
              <button className="kv-btn kv-btn-outline-neutral h-8" disabled={busy} onClick={() => { setCreating(false); setError('') }}>Hủy</button>
            </div>
          )}
          {categories.length === 0 && !creating && (
            <div className="text-center text-md text-ink-subtle py-10">Chưa có nhóm món nào.</div>
          )}
          {categories.map(c => (
            <div key={c.id} className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-fill">
              {editingId === c.id ? (
                <input
                  className={`${inputCls} flex-1`}
                  value={editName}
                  autoFocus
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveRename(c) }}
                />
              ) : (
                <span className="flex-1 text-md text-ink truncate">{c.name}</span>
              )}

              <span className="text-sm text-ink-muted shrink-0 w-[5.5rem] text-right">
                {c.itemCount} món
              </span>

              {editingId === c.id ? (
                <>
                  <button className="kv-btn kv-btn-primary h-8" disabled={busy} onClick={() => saveRename(c)}>Lưu</button>
                  <button className="kv-btn kv-btn-outline-neutral h-8" disabled={busy} onClick={() => setEditingId(null)}>Hủy</button>
                </>
              ) : (
                <>
                  <button className="text-sm text-primary hover:underline" onClick={() => startEdit(c)}>Đổi tên</button>
                  {c.itemCount === 0 ? (
                    <button className="text-sm text-danger hover:underline" disabled={busy} onClick={() => setConfirmDeleteCat(c)}>Xóa</button>
                  ) : (
                    <span className="text-sm text-ink-muted w-[3.5rem] text-center" title="Còn món trong nhóm — chỉ có thể đổi tên">—</span>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-4 px-6 py-3 border-t border-line shrink-0">
          <span className="text-md text-danger">{error}</span>
          <button className="kv-btn kv-btn-primary h-10" onClick={onClose}>Xong</button>
        </div>
      </div>

      {confirmDeleteCat && (
        <ConfirmDialog
          title="Xóa nhóm món"
          message={<>Bạn có chắc muốn xóa nhóm <b className="text-ink">{confirmDeleteCat.name}</b>? Hành động này không thể hoàn tác.</>}
          confirmLabel="Xóa"
          cancelLabel="Hủy"
          loading={busy}
          onConfirm={doDelete}
          onCancel={() => setConfirmDeleteCat(null)}
        />
      )}
    </div>
  )
}

export default CategoryManagerModal
