import { useCallback, useEffect, useState } from 'react'
import { parseYMD } from './scheduleUtils'
import { listRequests, listStaff, listTemplates, approveRequest, rejectRequest } from '../../../services/rosterService'
import type { ShiftRequest, StaffSummary, ShiftTemplate } from '../../../services/rosterService'
import { ApiError } from '../../../services/api'

interface Props {
  onClose: () => void
}

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const statusBadge: Record<string, string> = {
  PENDING: 'bg-warning-50 text-warning-700',
  APPROVED: 'bg-success-50 text-success-700',
  REJECTED: 'bg-danger-50 text-danger-700',
}
const statusLabel: Record<string, string> = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Đã từ chối' }

const RequestsInboxModal = ({ onClose }: Props) => {
  const [requests, setRequests] = useState<ShiftRequest[]>([])
  const [staff, setStaff] = useState<StaffSummary[]>([])
  const [shiftTypes, setShiftTypes] = useState<ShiftTemplate[]>([])
  const [loadError, setLoadError] = useState('')
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({})
  const [actionError, setActionError] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    try {
      const [reqs, staffList, templates] = await Promise.all([listRequests(), listStaff(), listTemplates()])
      setRequests(reqs)
      setStaff(staffList)
      setShiftTypes(templates)
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Không tải được danh sách yêu cầu.')
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const empName = (id: string) => staff.find(e => e.id === id)?.fullName ?? '—'
  const shiftName = (id: string) => shiftTypes.find(s => s.id === id)?.name ?? '—'

  const sorted = [...requests].sort((a, b) => {
    if (a.status === 'PENDING' && b.status !== 'PENDING') return -1
    if (a.status !== 'PENDING' && b.status === 'PENDING') return 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const handleApprove = async (id: string) => {
    try {
      await approveRequest(id, noteDraft[id] ?? '')
      setActionError(prev => ({ ...prev, [id]: '' }))
      await load()
    } catch (err) {
      setActionError(prev => ({ ...prev, [id]: err instanceof ApiError ? err.message : 'Không thể duyệt yêu cầu.' }))
    }
  }

  const handleReject = async (id: string) => {
    try {
      await rejectRequest(id, noteDraft[id] ?? '')
      await load()
    } catch (err) {
      setActionError(prev => ({ ...prev, [id]: err instanceof ApiError ? err.message : 'Không thể từ chối yêu cầu.' }))
    }
  }

  return (
    <div
      className="fixed inset-0 z-[var(--kv-z-modal)] flex items-start justify-center p-6 overflow-y-auto"
      style={{ background: 'rgba(var(--kv-black-rgb), 0.45)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-[48rem] my-[6vh] bg-card rounded-lg shadow-lg flex flex-col max-h-[calc(100vh-12vh)]">
        <div className="flex items-center justify-between px-6 h-16 border-b border-line shrink-0">
          <h2 className="text-h3 font-bold text-ink">Yêu cầu đổi ca / xin nghỉ</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-md text-ink-subtle cursor-pointer transition-colors hover:bg-fill hover:text-ink" aria-label="Đóng">
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-2">
          {loadError && <div className="px-2 py-2 text-md text-danger">{loadError}</div>}
          {sorted.length === 0 && !loadError && (
            <div className="text-center text-md text-ink-subtle py-10">Chưa có yêu cầu nào.</div>
          )}
          {sorted.map(req => {
            const date = parseYMD(req.date)
            return (
              <div key={req.id} className="px-4 py-3 rounded-md border border-line flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-md font-semibold text-ink">{empName(req.requesterId)}</span>
                    <span className="text-md text-ink-subtle"> · {req.type === 'SWAP' ? 'Đổi ca' : 'Xin nghỉ'} · {shiftName(req.shiftTemplateId)}, {String(date.getDate()).padStart(2, '0')}/{String(date.getMonth() + 1).padStart(2, '0')}/{date.getFullYear()}</span>
                  </div>
                  <span className={`inline-flex items-center text-sm font-medium rounded-full px-2.5 py-1 shrink-0 ${statusBadge[req.status]}`}>{statusLabel[req.status]}</span>
                </div>
                {req.type === 'SWAP' && req.targetEmployeeId != null && (
                  <p className="text-md text-ink-subtle">Đổi với: <span className="text-ink">{empName(req.targetEmployeeId)}</span></p>
                )}
                <p className="text-md text-ink-subtle">Lý do: <span className="text-ink">{req.reason}</span></p>
                {req.managerNote && <p className="text-md text-ink-subtle">Ghi chú quản lý: <span className="text-ink">{req.managerNote}</span></p>}

                {req.status === 'PENDING' && (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      className="flex-1 h-9 px-3 bg-field border border-line-default rounded-md text-md text-ink"
                      placeholder="Ghi chú (không bắt buộc)"
                      value={noteDraft[req.id] ?? ''}
                      onChange={e => setNoteDraft(prev => ({ ...prev, [req.id]: e.target.value }))}
                    />
                    <button className="kv-btn kv-btn-outline-neutral h-9" onClick={() => handleReject(req.id)}>Từ chối</button>
                    <button className="kv-btn kv-btn-primary h-9" onClick={() => handleApprove(req.id)}>Duyệt</button>
                  </div>
                )}
                {actionError[req.id] && <p className="text-md text-danger">{actionError[req.id]}</p>}
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

export default RequestsInboxModal
