import { useState } from 'react'
import type { ScheduleDto } from '../../../api/attendance'
import { fmtDMY } from './scheduleUtils'

export type DeleteScope = 'single' | 'from' | 'all'

interface Props {
  entry: ScheduleDto
  error?: string
  busy?: boolean
  onClose: () => void
  onConfirm: (scope: DeleteScope) => void
}

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

/**
 * "Áp dụng thay đổi này cho" — shown when the "x" quick-delete is clicked on a card that
 * belongs to a repeat rule, so the manager can scope the deletion like a calendar app would.
 * A non-recurring entry (no ruleId) skips this modal entirely and deletes directly.
 */
const DeleteScheduleModal = ({ entry, error, busy, onClose, onConfirm }: Props) => {
  const [scope, setScope] = useState<DeleteScope>('single')
  const ruleStart = entry.ruleStartDate
  const ruleEnd = entry.ruleEndDate

  const fromLabel = ruleEnd
    ? `Từ ngày ${fmtDMY(entry.workDate)} đến ngày ${fmtDMY(ruleEnd)}`
    : `Từ ngày ${fmtDMY(entry.workDate)} trở đi`
  const allLabel = ruleEnd
    ? `Tất cả các ngày (từ ngày ${fmtDMY(ruleStart ?? entry.workDate)} đến ngày ${fmtDMY(ruleEnd)})`
    : `Tất cả các ngày (từ ngày ${fmtDMY(ruleStart ?? entry.workDate)} trở đi)`

  const OPTIONS: { value: DeleteScope; label: string }[] = [
    { value: 'single', label: `Chỉ ngày ${fmtDMY(entry.workDate)}` },
    { value: 'from', label: fromLabel },
    { value: 'all', label: allLabel },
  ]

  return (
    <div
      className="fixed inset-0 z-[var(--kv-z-modal)] flex items-center justify-center p-6"
      style={{ background: 'rgba(var(--kv-black-rgb), 0.45)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-[30rem] bg-card rounded-lg shadow-lg flex flex-col">
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <h2 className="text-h3 font-bold text-ink">Áp dụng thay đổi này cho</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-md text-ink-subtle cursor-pointer hover:bg-fill hover:text-ink" aria-label="Đóng">
            <CloseIcon />
          </button>
        </div>

        <div className="px-6 flex flex-col gap-4">
          {OPTIONS.map(o => (
            <label key={o.value} className="flex items-center gap-3 cursor-pointer text-md text-ink">
              <input type="radio" name="delete-scope" checked={scope === o.value} onChange={() => setScope(o.value)} className="accent-primary w-[1.1rem] h-[1.1rem]" />
              {o.label}
            </label>
          ))}
          <p className="text-sm text-ink-subtle">
            <span className="font-bold">Lưu ý:</span> Chỉ áp dụng thay đổi trên các Chi tiết ca làm việc chưa chấm công
          </p>
          {error && <p className="text-md text-danger">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-5 mt-2">
          <button className="kv-btn kv-btn-outline-neutral h-10" onClick={onClose} disabled={busy}>Bỏ qua</button>
          <button className="kv-btn kv-btn-primary h-10 disabled:opacity-60" onClick={() => onConfirm(scope)} disabled={busy}>
            {busy ? 'Đang xóa...' : 'Đồng ý'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeleteScheduleModal
