import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import {
  WEEKDAY_LABELS, startOfWeek, weekDays as buildWeekDays, addDays, toYMD, sameDay, formatTime,
} from './scheduleUtils'
import {
  listTemplates, listStaff, listMyAttendance, clockIn, clockOut, createRequest, getWeekStatus,
} from '../../../services/rosterService'
import type { ShiftTemplate, StaffSummary, Attendance, ShiftRequestType, WeekStatus } from '../../../services/rosterService'
import { ApiError } from '../../../services/api'

const statusLabel: Record<string, string> = {
  SCHEDULED: 'Sắp tới',
  CHECKED_IN: 'Đang làm việc',
  CHECKED_OUT: 'Đã hoàn thành',
  NO_SHOW: 'Vắng không báo',
  LEAVE: 'Đã nghỉ',
}
const statusCls: Record<string, string> = {
  SCHEDULED: 'bg-fill text-ink-subtle',
  CHECKED_IN: 'bg-primary-50 text-primary-700',
  CHECKED_OUT: 'bg-success-50 text-success-700',
  NO_SHOW: 'bg-danger-50 text-danger-700',
  LEAVE: 'bg-warning-50 text-warning-700',
}

const defaultRouteForRole = (role?: string) => {
  if (role === 'MANAGER' || role === 'ADMIN') return '/manager/dashboard'
  if (role === 'CASHIER') return '/cashier'
  return '/waiter'
}

/** UI-only hint for whether a request would still be outside the server-enforced freeze window. */
const hoursUntilShiftStart = (shift: ShiftTemplate, date: Date) => {
  const [h, m] = shift.startTime.split(':').map(Number)
  const start = new Date(date)
  start.setHours(h, m, 0, 0)
  return (start.getTime() - Date.now()) / 3_600_000
}

interface RequestModalState { date: Date; shiftTemplateId: string }

const MySchedule = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [shiftTypes, setShiftTypes] = useState<ShiftTemplate[]>([])
  const [colleagues, setColleagues] = useState<StaffSummary[]>([])
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [weekPub, setWeekPub] = useState<WeekStatus | null>(null)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [clockOutOpenShift, setClockOutOpenShift] = useState(false)

  const [reqModal, setReqModal] = useState<RequestModalState | null>(null)
  const [reqType, setReqType] = useState<ShiftRequestType>('LEAVE')
  const [reqReason, setReqReason] = useState('')
  const [reqTarget, setReqTarget] = useState('')
  const [reqError, setReqError] = useState('')

  const weekDaysList = useMemo(() => buildWeekDays(weekStart), [weekStart])
  const weekStartKey = toYMD(weekStart)
  const weekEndKey = toYMD(addDays(weekStart, 6))
  const today = new Date()

  useEffect(() => {
    if (!user) return
    void Promise.all([listTemplates(), listStaff()])
      .then(([templates, staff]) => {
        setShiftTypes(templates)
        setColleagues(staff.filter(s => s.id !== user.id))
      })
      .catch(err => setLoadError(err instanceof ApiError ? err.message : 'Không tải được dữ liệu.'))
  }, [user])

  const loadWeek = useCallback(async () => {
    if (!user) return
    try {
      const [pub, records] = await Promise.all([
        getWeekStatus(weekStartKey),
        listMyAttendance(weekStartKey, weekEndKey),
      ])
      setWeekPub(pub)
      setAttendance(records)
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Không tải được lịch làm việc.')
    }
  }, [user, weekStartKey, weekEndKey])

  useEffect(() => { void loadWeek() }, [loadWeek])

  const closeReqModal = () => { setReqModal(null); setReqReason(''); setReqTarget(''); setReqError(''); setReqType('LEAVE') }

  const submitRequest = async () => {
    if (!reqModal) return
    if (reqType === 'SWAP' && !reqTarget) { setReqError('Vui lòng chọn đồng nghiệp để đổi ca.'); return }
    if (!reqReason.trim()) { setReqError('Vui lòng nhập lý do.'); return }
    try {
      await createRequest({
        type: reqType,
        date: toYMD(reqModal.date),
        shiftTemplateId: reqModal.shiftTemplateId,
        targetEmployeeId: reqType === 'SWAP' ? reqTarget : null,
        reason: reqReason.trim(),
      })
      closeReqModal()
      await loadWeek()
    } catch (err) {
      setReqError(err instanceof ApiError ? err.message : 'Không thể gửi yêu cầu.')
    }
  }

  const handleClockIn = async (date: Date, shiftTemplateId: string) => {
    try {
      await clockIn(toYMD(date), shiftTemplateId)
      await loadWeek()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Không thể chấm công vào.')
    }
  }

  const handleClockOut = async (date: Date, shiftTemplateId: string) => {
    setClockOutOpenShift(false)
    try {
      await clockOut(toYMD(date), shiftTemplateId)
      await loadWeek()
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CLOCK_OUT_OPEN_SHIFT') {
        setClockOutOpenShift(true)
      } else {
        setActionError(err instanceof ApiError ? err.message : 'Không thể chấm công ra.')
      }
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
          <h1 className="text-h3 font-bold text-ink">Lịch làm việc của tôi</h1>
        </div>
        <span className="text-md text-ink-subtle">{user.fullName}</span>
      </header>

      <div className="flex-1 p-5 flex flex-col gap-4 max-w-[60rem] w-full mx-auto">
        <div className="flex items-center gap-2">
          <button className="kv-btn kv-btn-outline-neutral h-9" onClick={() => setWeekStart(addDays(weekStart, -7))}>‹ Tuần trước</button>
          <button className="kv-btn kv-btn-outline-neutral h-9" onClick={() => setWeekStart(startOfWeek(new Date()))}>Tuần này</button>
          <button className="kv-btn kv-btn-outline-neutral h-9" onClick={() => setWeekStart(addDays(weekStart, 7))}>Tuần sau ›</button>
        </div>

        {loadError && <div className="px-4 py-2 rounded-md bg-danger-50 text-danger text-md border border-danger/30">{loadError}</div>}
        {actionError && <div className="px-4 py-2 rounded-md bg-danger-50 text-danger text-md border border-danger/30">{actionError}</div>}
        {clockOutOpenShift && (
          <div className="px-4 py-3 rounded-md bg-danger-50 text-danger text-md border border-danger/30 flex items-center justify-between gap-3">
            <span>Bạn còn ca thu ngân đang mở. Vui lòng đóng ca thu ngân trước khi chấm công ra.</span>
            <button
              className="kv-btn kv-btn-primary h-9 shrink-0"
              onClick={() => navigate('/cashier')}
            >
              Đóng ca thu ngân →
            </button>
          </div>
        )}

        {weekPub && weekPub.status !== 'PUBLISHED' ? (
          <div className="px-4 py-3 rounded-md bg-fill text-ink-subtle text-md text-center">Lịch tuần này chưa được quản lý xuất bản.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {weekDaysList.map(day => {
              const dayKey = toYMD(day)
              const dayRecords = attendance.filter(a => a.date === dayKey)
              return (
                <div key={day.toISOString()} className="bg-card border border-line rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-md font-semibold text-ink">{WEEKDAY_LABELS[(day.getDay() + 6) % 7]}</span>
                    <span className="text-md text-ink-subtle">{String(day.getDate()).padStart(2, '0')}/{String(day.getMonth() + 1).padStart(2, '0')}</span>
                    {sameDay(day, today) && <span className="text-sm font-medium text-primary">Hôm nay</span>}
                  </div>
                  {dayRecords.length === 0 ? (
                    <p className="text-md text-ink-muted">Không có ca làm việc.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {dayRecords.map(record => {
                        const shift = shiftTypes.find(s => s.id === record.shiftTemplateId)
                        if (!shift) return null
                        const hoursUntilStart = hoursUntilShiftStart(shift, day)

                        return (
                          <div key={shift.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-md bg-fill">
                            <div>
                              <div className="text-md font-medium text-ink">{shift.name} <span className="text-ink-subtle">({formatTime(shift.startTime)} - {formatTime(shift.endTime)})</span></div>
                              {record.late && <div className="text-sm text-danger">Đi muộn</div>}
                              {record.workedMinutes != null && <div className="text-sm text-ink-subtle">Đã làm {Math.round(record.workedMinutes / 60 * 10) / 10} giờ</div>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`inline-flex items-center text-sm font-medium rounded-full px-2.5 py-1 ${statusCls[record.status]}`}>{statusLabel[record.status]}</span>
                              {sameDay(day, today) && record.status === 'SCHEDULED' && (
                                <button className="kv-btn kv-btn-primary h-9" onClick={() => handleClockIn(day, shift.id)}>Chấm công vào</button>
                              )}
                              {record.status === 'CHECKED_IN' && (
                                <button className="kv-btn kv-btn-outline-primary h-9" onClick={() => handleClockOut(day, shift.id)}>Chấm công ra</button>
                              )}
                              {record.status === 'SCHEDULED' && hoursUntilStart >= 12 && (
                                <button className="kv-btn kv-btn-outline-neutral h-9" onClick={() => setReqModal({ date: day, shiftTemplateId: shift.id })}>
                                  Đổi ca / Xin nghỉ
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {reqModal && (
        <div
          className="fixed inset-0 z-[var(--kv-z-modal)] flex items-center justify-center p-6"
          style={{ background: 'rgba(var(--kv-black-rgb), 0.45)' }}
          onMouseDown={e => { if (e.target === e.currentTarget) closeReqModal() }}
        >
          <div className="w-full max-w-[28rem] bg-card rounded-lg shadow-lg flex flex-col">
            <div className="flex items-center justify-between px-6 h-14 border-b border-line">
              <h2 className="text-h3 font-bold text-ink">Đổi ca / Xin nghỉ</h2>
              <button onClick={closeReqModal} className="w-8 h-8 flex items-center justify-center rounded-md text-ink-subtle hover:bg-fill" aria-label="Đóng">✕</button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="flex gap-2">
                {([['LEAVE', 'Xin nghỉ'], ['SWAP', 'Đổi ca']] as const).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setReqType(id)}
                    className={`flex-1 h-9 rounded-md text-md font-medium cursor-pointer transition-colors ${reqType === id ? 'bg-primary text-white' : 'bg-fill text-ink-subtle hover:bg-fill-strong'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {reqType === 'SWAP' && (
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-ink-subtle">Đồng nghiệp</label>
                  <select
                    className="h-10 px-3 bg-field border border-line-default rounded-md text-md text-ink"
                    value={reqTarget}
                    onChange={e => setReqTarget(e.target.value)}
                  >
                    <option value="">Chọn đồng nghiệp</option>
                    {colleagues.map(e => (
                      <option key={e.id} value={e.id}>{e.fullName}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex flex-col gap-1">
                <label className="text-sm text-ink-subtle">Lý do</label>
                <textarea
                  className="h-20 px-3 py-2 bg-field border border-line-default rounded-md text-md text-ink resize-none"
                  value={reqReason}
                  onChange={e => setReqReason(e.target.value)}
                  placeholder="Nhập lý do"
                />
              </div>
              {reqError && <p className="text-md text-danger">{reqError}</p>}
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-line">
              <button className="kv-btn kv-btn-outline-neutral h-10" onClick={closeReqModal}>Bỏ qua</button>
              <button className="kv-btn kv-btn-primary h-10" onClick={submitRequest}>Gửi yêu cầu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MySchedule
