import { useCallback, useEffect, useState } from 'react'
import { parseYMD, formatTime } from './scheduleUtils'
import {
  listMissingClockouts, resolveMissingClockout, listStaff, listTemplates,
} from '../../../services/rosterService'
import type { Attendance, StaffSummary, ShiftTemplate } from '../../../services/rosterService'
import { ApiError } from '../../../services/api'

interface Props {
  onClose: () => void
  onResolved?: () => void
}

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

// Look back this many days for stuck check-ins (also triggers lazy MISSING_CLOCKOUT detection).
const LOOKBACK_DAYS = 14
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const MissingClockoutModal = ({ onClose, onResolved }: Props) => {
  const [rows, setRows] = useState<Attendance[]>([])
  const [staff, setStaff] = useState<StaffSummary[]>([])
  const [shiftTypes, setShiftTypes] = useState<ShiftTemplate[]>([])
  const [loadError, setLoadError] = useState('')
  const [outDraft, setOutDraft] = useState<Record<string, string>>({})
  const [reasonDraft, setReasonDraft] = useState<Record<string, string>>({})
  const [actionError, setActionError] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    try {
      const to = new Date()
      const from = new Date(); from.setDate(from.getDate() - LOOKBACK_DAYS)
      const [recs, staffList, templates] = await Promise.all([
        listMissingClockouts(ymd(from), ymd(to)), listStaff(), listTemplates(),
      ])
      setRows(recs)
      setStaff(staffList)
      setShiftTypes(templates)
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Không tải được danh sách thiếu chấm công.')
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const empName = (id: string) => staff.find(e => e.id === id)?.fullName ?? '—'
  const template = (id: string) => shiftTypes.find(s => s.id === id)

  // Default the out-time to the shift's scheduled end on that date (manager can adjust).
  const defaultOut = (rec: Attendance) => {
    const t = template(rec.shiftTemplateId)
    const end = t ? t.endTime.slice(0, 5) : '00:00'
    return `${rec.date}T${end}`
  }

  const handleResolve = async (rec: Attendance) => {
    if (!rec.id) return
    const out = outDraft[rec.id] ?? defaultOut(rec)
    const reason = (reasonDraft[rec.id] ?? '').trim()
    if (!reason) {
      setActionError(prev => ({ ...prev, [rec.id!]: 'Vui lòng nhập lý do.' }))
      return
    }
    try {
      await resolveMissingClockout(rec.id, out, reason)
      setActionError(prev => ({ ...prev, [rec.id!]: '' }))
      await load()
      onResolved?.()
    } catch (err) {
      setActionError(prev => ({ ...prev, [rec.id!]: err instanceof ApiError ? err.message : 'Không thể xử lý.' }))
    }
  }

  return (
    <div
      className="fixed inset-0 z-[var(--kv-z-modal)] flex items-start justify-center p-6 overflow-y-auto"
      style={{ background: 'rgba(var(--kv-black-rgb), 0.45)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-[76rem] my-[6vh] bg-card rounded-lg shadow-lg flex flex-col max-h-[calc(100vh-12vh)]">
        <div className="flex items-center justify-between px-6 h-16 border-b border-line shrink-0">
          <h2 className="text-h3 font-bold text-ink">Thiếu chấm công ra</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-md text-ink-subtle cursor-pointer transition-colors hover:bg-fill hover:text-ink" aria-label="Đóng">
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-2">
          {loadError && <div className="px-2 py-2 text-md text-danger">{loadError}</div>}
          {rows.length === 0 && !loadError && (
            <div className="text-center text-md text-ink-subtle py-10">Không có bản ghi thiếu chấm công ra.</div>
          )}
          {rows.map(rec => {
            const t = template(rec.shiftTemplateId)
            const date = parseYMD(rec.date)
            const key = rec.id ?? rec.date + rec.shiftTemplateId
            return (
              <div key={key} className="px-4 py-3 rounded-md border border-line flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-md font-semibold text-ink">{empName(rec.employeeId)}</span>
                    <span className="text-md text-ink-subtle">
                      {' · '}{t?.name ?? '—'}
                      {t && ` (${formatTime(t.startTime)} - ${formatTime(t.endTime)})`}
                      {' · '}{String(date.getDate()).padStart(2, '0')}/{String(date.getMonth() + 1).padStart(2, '0')}/{date.getFullYear()}
                    </span>
                  </div>
                  <span className="inline-flex items-center text-sm font-medium rounded-full px-2.5 py-1 shrink-0 bg-danger-50 text-danger-700">Thiếu chấm công ra</span>
                </div>
                <p className="text-md text-ink-subtle">
                  Giờ vào: <span className="text-ink">{rec.checkInAt ? new Date(rec.checkInAt).toLocaleString('vi-VN') : '—'}</span>
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
                  <label className="text-md text-ink-subtle shrink-0">Giờ ra thực tế</label>
                  <input
                    type="datetime-local"
                    className="h-9 px-3 bg-field border border-line-default rounded-md text-md text-ink"
                    value={outDraft[key] ?? defaultOut(rec)}
                    onChange={e => setOutDraft(prev => ({ ...prev, [key]: e.target.value }))}
                  />
                  <input
                    className="flex-1 h-9 px-3 bg-field border border-line-default rounded-md text-md text-ink"
                    placeholder="Lý do (bắt buộc)"
                    value={reasonDraft[key] ?? ''}
                    onChange={e => setReasonDraft(prev => ({ ...prev, [key]: e.target.value }))}
                  />
                  <button className="kv-btn kv-btn-primary h-9 shrink-0" onClick={() => void handleResolve(rec)}>Xác nhận</button>
                </div>
                {actionError[key] && <p className="text-md text-danger">{actionError[key]}</p>}
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-end gap-4 px-6 py-3 border-t border-line shrink-0">
          <button className="kv-btn kv-btn-primary h-10" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  )
}

export default MissingClockoutModal
