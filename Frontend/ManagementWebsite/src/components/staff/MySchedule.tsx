import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  getMyTimesheet, checkIn, checkOut, formatTime,
  TIMESHEET_STATUS_LABEL, TIMESHEET_STATUS_COLOR,
} from '../../api/attendance'
import type { TimesheetCellDto } from '../../api/attendance'

/* ─────────────────────────────────────────────────────────────────────────────
 * Lịch làm việc (self-service) — Cashier/Waiter view their own weekly schedule
 * and clock themselves in/out for today's shift(s). Mirrors MyProfile.tsx's
 * header/back-button shape; week nav mirrors EmployeeDetail.tsx's ScheduleTab.
 * ──────────────────────────────────────────────────────────────────────────── */

const defaultRouteForRole = (role?: string) => {
  if (role === 'ADMIN') return '/admin'
  if (role === 'MANAGER') return '/manager/dashboard'
  if (role === 'CASHIER') return '/cashier'
  return '/waiter'
}

const WEEKDAY_MON = ['Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy', 'Chủ nhật']
const stripTime = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d: Date, n: number) => { const r = stripTime(d); r.setDate(r.getDate() + n); return r }
const startOfWeek = (d: Date) => { const day = d.getDay(); return addDays(d, (day === 0 ? -6 : 1) - day) }
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const toYMD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const fmtDMY = (ymd: string) => { const [y, m, d] = ymd.split('-'); return `${d}/${m}/${y}` }
const hours = (minutes: number) => `${Math.round(minutes / 6) / 10} giờ`

const errMsg = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback

const ChevronL = () => (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>)
const ChevronR = () => (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>)
const CloseIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>)
const WarningIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-warning shrink-0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>)

const StatusBadge = ({ row }: { row: TimesheetCellDto }) => (
  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium"
    style={{ color: TIMESHEET_STATUS_COLOR[row.displayStatus], backgroundColor: `${TIMESHEET_STATUS_COLOR[row.displayStatus]}1A` }}>
    {TIMESHEET_STATUS_LABEL[row.displayStatus]}
  </span>
)

/** True once the shift's end time (on its work date) has passed. */
const isShiftEnded = (row: TimesheetCellDto) => {
  if (!row.shiftEndTime) return true
  return new Date() >= new Date(`${row.workDate}T${row.shiftEndTime}`)
}

const ConfirmCheckoutModal = ({ row, busy, onClose, onConfirm }: {
  row: TimesheetCellDto; busy: boolean; onClose: () => void; onConfirm: () => void
}) => {
  const early = !isShiftEnded(row)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/50" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-[28rem] bg-card rounded-xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-xl font-bold text-ink">Xác nhận ra ca</h2>
          <button onClick={onClose} aria-label="Đóng" className="w-8 h-8 flex items-center justify-center rounded-full text-ink-muted hover:bg-fill hover:text-ink cursor-pointer"><CloseIcon /></button>
        </div>
        <div className="px-6 py-3 text-md text-ink border-t border-line flex flex-col gap-3">
          {early && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-warning-50 text-warning-700 border border-warning/30 text-sm">
              <WarningIcon />
              <span>Bạn đang ra ca sớm hơn giờ kết thúc ca ({formatTime(row.shiftEndTime)}).</span>
            </div>
          )}
          Bạn có chắc chắn muốn ra ca ngay bây giờ không?
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-line">
          <button onClick={onClose} disabled={busy} className="kv-btn kv-btn-outline-neutral h-10 bg-card">Bỏ qua</button>
          <button onClick={onConfirm} disabled={busy} className="kv-btn kv-btn-primary h-10">{busy ? 'Đang xử lý…' : 'Đồng ý'}</button>
        </div>
      </div>
    </div>
  )
}

const MySchedule = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const today = stripTime(new Date())
  const [weekStart, setWeekStart] = useState(startOfWeek(today))
  const [rows, setRows] = useState<TimesheetCellDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmRow, setConfirmRow] = useState<TimesheetCellDto | null>(null)
  const step = (n: number) => setWeekStart(w => addDays(w, n * 7))

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    getMyTimesheet(toYMD(weekStart), toYMD(addDays(weekStart, 6)))
      .then(res => setRows(res.data.data))
      .catch(() => setError('Không thể tải lịch làm việc.'))
      .finally(() => setLoading(false))
  }, [weekStart])

  useEffect(() => { load() }, [load])

  const doCheckIn = async (scheduleId: string) => {
    setBusyId(scheduleId)
    setError('')
    try {
      await checkIn(scheduleId)
      load()
    } catch (err) {
      setError(errMsg(err, 'Không thể chấm công vào ca'))
    } finally {
      setBusyId(null)
    }
  }

  const doCheckOut = async (scheduleId: string) => {
    setBusyId(scheduleId)
    setError('')
    try {
      await checkOut(scheduleId)
      setConfirmRow(null)
      load()
    } catch (err) {
      setError(errMsg(err, 'Không thể chấm công ra ca'))
    } finally {
      setBusyId(null)
    }
  }

  if (!user) return null

  return (
    <div className="flex flex-col h-screen bg-surface overflow-y-auto">
      <header className="flex items-center justify-between px-6 h-16 bg-card border-b border-line shrink-0">
        <div className="flex items-center gap-3">
          <button
            className="w-9 h-9 flex items-center justify-center rounded-md text-ink-subtle cursor-pointer hover:bg-fill"
            onClick={() => navigate(defaultRouteForRole(user.role))}
            aria-label="Quay lại"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          </button>
          <h1 className="text-h3 font-bold text-ink">Lịch làm việc</h1>
        </div>
        <span className="text-md text-ink-subtle">{user.fullName}</span>
      </header>

      <div className="flex-1 p-5 flex flex-col gap-4 max-w-[50rem] w-full mx-auto">
        <div className="flex items-center gap-1">
          <button onClick={() => step(-1)} className="w-9 h-9 flex items-center justify-center border border-line-default rounded-md bg-card text-ink-subtle hover:border-primary hover:text-primary cursor-pointer" aria-label="Tuần trước"><ChevronL /></button>
          <div className="h-10 px-4 flex items-center border border-line-default rounded-md bg-card text-md text-ink whitespace-nowrap">
            {fmtDMY(toYMD(weekStart))} - {fmtDMY(toYMD(addDays(weekStart, 6)))}
          </div>
          <button onClick={() => step(1)} className="w-9 h-9 flex items-center justify-center border border-line-default rounded-md bg-card text-ink-subtle hover:border-primary hover:text-primary cursor-pointer" aria-label="Tuần sau"><ChevronR /></button>
        </div>

        {error && <div className="px-4 py-2 rounded-md bg-danger-50 text-danger text-md border border-danger/30">{error}</div>}

        <div className="flex flex-col gap-3">
          {loading ? (
            <div className="text-md text-ink-subtle text-center py-10">Đang tải...</div>
          ) : rows.length === 0 ? (
            <div className="text-md text-ink-subtle text-center py-10 bg-card border border-line rounded-lg">Chưa có lịch làm việc trong tuần này</div>
          ) : (
            rows.map(row => {
              const rowDate = new Date(`${row.workDate}T00:00:00`)
              const isToday = sameDay(rowDate, today)
              const record = row.record
              const busy = busyId === row.scheduleId
              return (
                <div key={row.scheduleId} className={`flex items-center justify-between gap-4 p-4 bg-card border rounded-lg ${isToday ? 'border-primary' : 'border-line'}`}>
                  <div className="flex flex-col gap-1">
                    <div className="text-md font-bold text-ink">{WEEKDAY_MON[(rowDate.getDay() + 6) % 7]}, {fmtDMY(row.workDate)}</div>
                    <div className="text-sm text-ink-subtle">{row.shiftName} · {formatTime(row.shiftStartTime)} - {formatTime(row.shiftEndTime)}</div>
                    {record?.actualCheckIn && (
                      <div className="text-sm text-ink-subtle">
                        Vào: {formatTime(record.actualCheckIn.slice(11))}
                        {record.actualCheckOut && <> · Ra: {formatTime(record.actualCheckOut.slice(11))} · {hours(record.workedMinutes)}</>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge row={row} />
                    {isToday && (!record || !record.actualCheckIn) && (
                      <button onClick={() => doCheckIn(row.scheduleId)} disabled={busy} className="kv-btn kv-btn-primary h-9">
                        {busy ? 'Đang xử lý…' : 'Vào ca'}
                      </button>
                    )}
                    {isToday && record?.actualCheckIn && !record.actualCheckOut && (
                      <button onClick={() => setConfirmRow(row)} disabled={busy} className="kv-btn kv-btn-outline-primary h-9">
                        {busy ? 'Đang xử lý…' : 'Ra ca'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {confirmRow && (
        <ConfirmCheckoutModal row={confirmRow} busy={busyId === confirmRow.scheduleId}
          onClose={() => setConfirmRow(null)} onConfirm={() => doCheckOut(confirmRow.scheduleId)} />
      )}
    </div>
  )
}

export default MySchedule
