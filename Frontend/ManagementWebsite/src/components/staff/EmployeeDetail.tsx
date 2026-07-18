import { useEffect, useMemo, useState } from 'react'
import type { Employee } from '../../data/mockData'
import Avatar from '../common/Avatar'
import EmployeeModal, { rateLabel, parseRates } from './EmployeeModal'
import type { OtRates } from './EmployeeModal'
import { updateEmployee, toEmployee, getSalarySetting } from '../../api/employees'
import type { SalarySettingDto } from '../../api/employees'
import { getUser } from '../../api/users'
import { cancelPayslip, fmtDate, fmtDateTime, listEmployeePayslips, money } from '../../api/payroll'
import type { PayslipDetailDto } from '../../api/payroll'
import { ATTENDANCE_STATUS_LABEL, PAYSLIP_PAYMENT_STATUS_LABEL, SALARY_TYPE_LABEL } from '../../api/payroll'
import { formatTime, listSchedules } from '../../api/attendance'
import type { ScheduleDto } from '../../api/attendance'

interface Props {
  employee: Employee
  onSave: (updated: Employee) => void
  onToggleActive: (employee: Employee) => void
}

const TABS = ['Thông tin', 'Lịch làm việc', 'Thiết lập lương', 'Phiếu lương'] as const
type Tab = (typeof TABS)[number]

const PauseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="9" y1="9" x2="9" y2="15" /><line x1="15" y1="9" x2="15" y2="15" />
  </svg>
)
const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
  </svg>
)
const KeyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
)
const PencilIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted shrink-0">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

const ChevronL = () => (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>)
const ChevronR = () => (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>)
const CheckMark = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-primary inline-block"><polyline points="20 6 9 17 4 12" /></svg>)
/* ── work-schedule (Lịch làm việc) tab ─────────────────────────────────────── */
const WEEKDAY_MON = ['Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy', 'Chủ nhật']
const stripTime = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d: Date, n: number) => { const r = stripTime(d); r.setDate(r.getDate() + n); return r }
const startOfWeek = (d: Date) => { const day = d.getDay(); return addDays(d, (day === 0 ? -6 : 1) - day) }
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const weekOfMonth = (d: Date) => Math.ceil(d.getDate() / 7)
const toYMD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

interface ScheduleRow { shiftId: string; name: string; startTime: string; endTime: string; days: Set<string> }

const ScheduleTab = ({ employee }: { employee: Employee }) => {
  const today = useMemo(() => stripTime(new Date()), [])
  const [cursor, setCursor] = useState(today)
  const weekStart = useMemo(() => startOfWeek(cursor), [cursor])
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const step = (n: number) => setCursor(c => addDays(startOfWeek(c), n * 7))

  const [entries, setEntries] = useState<ScheduleDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true); setError('')
    listSchedules(toYMD(weekStart), toYMD(addDays(weekStart, 6)), employee.id)
      .then(res => setEntries(res.data.data))
      .catch(() => setError('Không tải được lịch làm việc.'))
      .finally(() => setLoading(false))
  }, [employee.id, weekStart])

  // One row per shift the employee is scheduled into this week.
  const rows = useMemo(() => {
    const byShift = new Map<string, ScheduleRow>()
    for (const e of entries) {
      const row = byShift.get(e.shiftId) ?? {
        shiftId: e.shiftId, name: e.shiftName ?? '', startTime: e.shiftStartTime ?? '', endTime: e.shiftEndTime ?? '', days: new Set<string>(),
      }
      row.days.add(e.workDate)
      byShift.set(e.shiftId, row)
    }
    return Array.from(byShift.values()).sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [entries])

  return (
    <div className="p-6">
      {/* week navigation (no "Xem theo bảng" dropdown) */}
      <div className="flex items-center gap-1 mb-4">
        <button onClick={() => step(-1)} className="w-9 h-9 flex items-center justify-center border border-line-default rounded-md bg-card text-ink-subtle hover:border-primary hover:text-primary cursor-pointer" aria-label="Tuần trước"><ChevronL /></button>
        <div className="h-10 px-4 flex items-center border border-line-default rounded-md bg-card text-md text-ink whitespace-nowrap">Tuần {weekOfMonth(weekStart)} - Th. {weekStart.getMonth() + 1} {weekStart.getFullYear()}</div>
        <button onClick={() => step(1)} className="w-9 h-9 flex items-center justify-center border border-line-default rounded-md bg-card text-ink-subtle hover:border-primary hover:text-primary cursor-pointer" aria-label="Tuần sau"><ChevronR /></button>
      </div>

      <div className="border border-line rounded-lg overflow-x-auto">
        <table className="w-full border-collapse min-w-[58rem]">
          <thead>
            <tr>
              <th className="text-left px-4 py-3 border-b border-r border-line w-[13rem] text-md font-bold text-ink">Ca</th>
              {days.map((d, i) => {
                const isToday = sameDay(d, today)
                return (
                  <th key={i} className="text-center px-3 py-3 border-b border-line">
                    <span className={`text-md font-semibold ${isToday ? 'text-primary' : 'text-ink'}`}>{WEEKDAY_MON[i]}</span>{' '}
                    <span className={isToday ? 'inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-sm font-semibold ml-1' : 'text-ink ml-1'}>{d.getDate()}</span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-8 text-md text-ink-subtle">Đang tải…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-8 text-md text-ink-subtle">Chưa có lịch làm việc trong tuần này</td></tr>
            ) : rows.map(row => (
              <tr key={row.shiftId} className="border-t border-line">
                <td className="px-4 py-4 border-r border-line align-top">
                  <div className="text-md font-bold text-ink">{row.name}</div>
                  <div className="text-sm text-ink-subtle">{formatTime(row.startTime)} - {formatTime(row.endTime)}</div>
                </td>
                {days.map((d, i) => (
                  <td key={i} className="text-center px-3 py-4 border-l border-line align-middle">{row.days.has(toYMD(d)) && <CheckMark />}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <div className="mt-3 text-md text-danger">{error}</div>}
    </div>
  )
}

/* ── salary-setup (Thiết lập lương) tab ────────────────────────────────────── */
const SALARY_WAGE_SUFFIX: Record<string, string> = { SHIFT: '/ca', HOURLY: '/giờ', FIXED: '/kỳ lương' }
const ADVANCED_TABLE_LABELS: Record<string, { firstCol: string; wageCol: string }> = {
  SHIFT: { firstCol: 'Ca', wageCol: 'Lương/ca' },
  HOURLY: { firstCol: 'Mức lương', wageCol: 'Lương/giờ' },
  FIXED: { firstCol: 'Ca', wageCol: 'Lương/ca' }, // FIXED never has advanced rates (modal hides the toggle)
}

const SalarySetupTab = ({ employee, onSave }: { employee: Employee; onSave: (updated: Employee) => void }) => {
  const [setting, setSetting] = useState<SalarySettingDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)

  const load = () => {
    setLoading(true)
    getSalarySetting(employee.id)
      .then(res => setSetting(res.data.data))
      .catch(() => setSetting(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [employee.id])

  const hasSetting = !!setting?.id
  const def = hasSetting ? parseRates(setting!.mainAdvancedRatesJson) : null
  const ot = hasSetting ? (parseRates(setting!.overtimeRatesJson) as OtRates | null) : null
  // "Nâng cao" = the manager set an explicit Sat/Sun rate (off/holiday default to 100% even
  // in simple mode, so they alone aren't a reliable signal — mirrors EmployeeModal's heuristic).
  const hasAdvanced = !!def && (def.sat !== null || def.sun !== null)
  const showOt = hasSetting && setting!.mainSalaryType === 'SHIFT' && setting!.overtimeEnabled && !!ot
  const tableLabels = hasSetting ? ADVANCED_TABLE_LABELS[setting!.mainSalaryType] : ADVANCED_TABLE_LABELS.SHIFT

  return (
    <div className="p-6 flex flex-col gap-4">
      {loading ? (
        <div className="text-md text-ink-subtle">Đang tải…</div>
      ) : !hasSetting ? (
        <div className="text-md text-ink-subtle">Nhân viên chưa được thiết lập lương.</div>
      ) : (
        <>
          <div className="border border-line rounded-lg p-5">
            <div className="text-md mb-3"><span className="font-bold text-ink">Loại lương:</span> <span className="text-ink">{SALARY_TYPE_LABEL[setting!.mainSalaryType]}</span></div>

            {!hasAdvanced ? (
              <div className="text-md"><span className="font-bold text-ink">Mức lương:</span> <span className="text-ink">{money(setting!.mainBaseWage)}{SALARY_WAGE_SUFFIX[setting!.mainSalaryType]}</span></div>
            ) : (
              <>
                <div className="text-md font-bold text-ink mb-2">Mức lương:</div>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-fill text-sm font-semibold text-ink-subtle">
                      <th className="text-left px-4 py-2.5">{tableLabels.firstCol}</th>
                      <th className="text-right px-4 py-2.5">{tableLabels.wageCol}</th>
                      <th className="text-right px-4 py-2.5">Thứ 7</th>
                      <th className="text-right px-4 py-2.5">Chủ nhật</th>
                      <th className="text-right px-4 py-2.5">Ngày nghỉ</th>
                      <th className="text-right px-4 py-2.5">Ngày lễ tết</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-line">
                      <td className="px-4 py-3 text-md text-ink">Mặc định</td>
                      <td className="px-4 py-3 text-md text-ink text-right">{money(setting!.mainBaseWage)}{SALARY_WAGE_SUFFIX[setting!.mainSalaryType]}</td>
                      <td className="px-4 py-3 text-md text-ink text-right">{rateLabel(def!.sat) || '—'}</td>
                      <td className="px-4 py-3 text-md text-ink text-right">{rateLabel(def!.sun) || '—'}</td>
                      <td className="px-4 py-3 text-md text-ink text-right">{rateLabel(def!.off) || '—'}</td>
                      <td className="px-4 py-3 text-md text-ink text-right">{rateLabel(def!.holiday) || '—'}</td>
                    </tr>
                  </tbody>
                </table>
              </>
            )}
          </div>

          <div className="border border-line rounded-lg p-5">
            <div className="text-md font-bold text-ink mb-3">Lương làm thêm giờ:</div>
            {showOt && ot ? (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-fill text-sm font-semibold text-ink-subtle">
                    <th className="w-[16rem]" />
                    <th className="text-right px-4 py-2.5">Ngày thường</th>
                    <th className="text-right px-4 py-2.5">Thứ 7</th>
                    <th className="text-right px-4 py-2.5">Chủ nhật</th>
                    <th className="text-right px-4 py-2.5">Ngày nghỉ</th>
                    <th className="text-right px-4 py-2.5">Ngày lễ tết</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-line">
                    <td className="px-4 py-3 text-md text-ink">Hệ số lương trên giờ</td>
                    <td className="px-4 py-3 text-md text-ink text-right">{rateLabel(ot.normal) || '—'}</td>
                    <td className="px-4 py-3 text-md text-ink text-right">{rateLabel(ot.sat) || '—'}</td>
                    <td className="px-4 py-3 text-md text-ink text-right">{rateLabel(ot.sun) || '—'}</td>
                    <td className="px-4 py-3 text-md text-ink text-right">{rateLabel(ot.off) || '—'}</td>
                    <td className="px-4 py-3 text-md text-ink text-right">{rateLabel(ot.holiday) || '—'}</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <div className="text-md text-ink-muted">Không áp dụng</div>
            )}
          </div>

          <div className="border border-line rounded-lg p-5">
            <div className="text-md font-bold text-ink">Mẫu áp dụng:</div>
            <div className="text-md text-ink-muted mt-1">{setting!.salaryTemplate || 'Không áp dụng'}</div>
          </div>

          <div className="border border-line rounded-lg p-5">
            <div className="text-md font-bold text-ink">Giảm trừ:</div>
            <div className="text-md text-ink-muted mt-1">Không áp dụng — khấu trừ (tiền phạt vi phạm) được tính tự động khi tạo bảng lương</div>
          </div>
        </>
      )}

      <div className="flex justify-end">
        <button className="kv-btn kv-btn-primary h-10" onClick={() => setShowEditModal(true)}>Cập nhật</button>
      </div>

      {showEditModal && (
        <EmployeeModal
          employee={employee}
          initialTab="salary"
          onClose={() => { setShowEditModal(false); load() }}
          onSave={async payload => {
            const res = await updateEmployee(employee.id, payload)
            onSave(toEmployee(res.data.data))
            return res.data.data
          }}
        />
      )}
    </div>
  )
}

/* ── payslip (Phiếu lương) tab ─────────────────────────────────────────────── */
const ChevronDownIcon = () => (<svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-ink-muted"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>)
const CloseIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>)
const ExportIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>)
const PrintIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>)
const TrashSmall = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>)

const PAYSLIP_FILTERS = ['ALL', 'UNPAID', 'PARTIAL', 'PAID', 'CANCELLED'] as const
type PayslipFilter = (typeof PAYSLIP_FILTERS)[number]
const PAYSLIP_FILTER_LABEL: Record<PayslipFilter, string> = {
  ALL: 'Tất cả trạng thái',
  UNPAID: 'Chưa thanh toán',
  PARTIAL: 'Thanh toán một phần',
  PAID: 'Đã thanh toán',
  CANCELLED: 'Đã hủy',
}
const payslipFilterKey = (p: PayslipDetailDto): PayslipFilter => p.status === 'CANCELLED' ? 'CANCELLED' : p.paymentStatus

const errMsg = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback

const PayLine = ({ label, value, sub, strong, blue }: { label: string; value: string; sub?: string; strong?: boolean; blue?: boolean }) => (
  <div className="flex items-start justify-between gap-4 py-2.5 border-b border-line">
    <div>
      <span className="text-md text-ink">{label}</span>
      {sub && <div className="text-xs text-ink-muted">{sub}</div>}
    </div>
    <span className={`text-md ${blue ? 'text-primary' : strong ? 'text-ink font-bold' : 'text-ink'}`}>{value}</span>
  </div>
)

const PayslipDetailModal = ({ payslip, onClose, onChanged }: { payslip: PayslipDetailDto; onClose: () => void; onChanged: () => void }) => {
  const [t, setT] = useState<'pay' | 'attendance'>('pay')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const canCancel = payslip.status === 'ACTIVE' && payslip.paidAmount === 0

  const doCancel = async () => {
    if (!window.confirm(`Hủy phiếu lương ${payslip.code}?`)) return
    setBusy(true)
    try {
      await cancelPayslip(payslip.id)
      onChanged()
    } catch (err) {
      setError(errMsg(err, 'Không thể hủy phiếu lương'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center p-4 overflow-y-auto bg-black/50" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-[76rem] my-[5vh] bg-card rounded-xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-7 pt-5 pb-3">
          <h2 className="text-xl font-bold text-ink">Phiếu lương cá nhân {payslip.code}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-ink-muted hover:bg-fill hover:text-ink cursor-pointer"><CloseIcon /></button>
        </div>
        <div className="px-7 flex items-center gap-7 border-b border-line">
          {([['pay', 'Thanh toán'], ['attendance', 'Chấm công chi tiết']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setT(id)} className={`relative pb-3 pt-1 text-md cursor-pointer ${t === id ? 'text-primary font-semibold' : 'text-ink-subtle hover:text-ink'}`}>
              {label}{t === id && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary rounded-full" />}
            </button>
          ))}
        </div>

        {error && <div className="px-7 pt-3 text-sm text-danger">{error}</div>}

        {t === 'pay' ? (
          <div className="px-7 py-5 grid grid-cols-2 gap-x-12">
            <div>
              <PayLine label={`${payslip.employeeCode} :`} value={payslip.employeeName} strong />
              <PayLine label="Loại lương chính :" value={payslip.salaryType ? SALARY_TYPE_LABEL[payslip.salaryType] : 'Chưa thiết lập'} />
              <PayLine label="Trạng thái :" value={payslip.status === 'CANCELLED' ? 'Đã hủy' : PAYSLIP_PAYMENT_STATUS_LABEL[payslip.paymentStatus]} />
              <PayLine label="Bảng lương :" value={payslip.sheetName} />
              <PayLine label="Kỳ làm việc :" value={`${fmtDate(payslip.periodStart)} - ${fmtDate(payslip.periodEnd)}`} />
              <PayLine label="Số ca làm :" value={String(payslip.shiftCount)} strong />
              <PayLine label="Giờ công :" value={`${Math.round(payslip.workedMinutes / 6) / 10} giờ`} />
            </div>
            <div>
              <PayLine label="Lương chính :" value={money(payslip.mainSalary)} blue />
              <PayLine label="Lương làm thêm giờ :" value={money(payslip.overtimeSalary)} blue />
              <PayLine label="Tổng thu nhập (I) :" value={money(payslip.mainSalary + payslip.overtimeSalary)} strong />
              <PayLine label="Giảm trừ (II) :" value={money(payslip.deduction)} blue />
              <PayLine label="Lương thực nhận (III) :" sub="(III) = (I) - (II)" value={money(payslip.total)} />
              <PayLine label="Đã trả nhân viên :" value={money(payslip.paidAmount)} />
              <PayLine label="Còn cần trả :" value={money(payslip.remaining)} strong />
            </div>
          </div>
        ) : payslip.attendance.length === 0 ? (
          <div className="px-7 py-10 text-center text-md text-ink-subtle">Chưa có dữ liệu chấm công chi tiết</div>
        ) : (
          <div className="px-7 py-5">
            <div className="max-h-[24rem] overflow-y-auto border border-line rounded-md">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-fill text-sm font-semibold text-ink-subtle">
                    <th className="sticky top-0 bg-fill text-left px-4 py-3">Ngày</th>
                    <th className="sticky top-0 bg-fill text-left px-4 py-3">Ca</th>
                    <th className="sticky top-0 bg-fill text-left px-4 py-3">Trạng thái</th>
                    <th className="sticky top-0 bg-fill text-left px-4 py-3">Vào - Ra</th>
                    <th className="sticky top-0 bg-fill text-right px-4 py-3">Giờ công</th>
                    <th className="sticky top-0 bg-fill text-right px-4 py-3">OT (phút)</th>
                    <th className="sticky top-0 bg-fill text-right px-4 py-3">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {payslip.attendance.map((a, i) => (
                    <tr key={i} className="border-t border-line">
                      <td className="px-4 py-3 text-md text-ink whitespace-nowrap">{fmtDate(a.date)}</td>
                      <td className="px-4 py-3 text-md text-ink">{a.shiftName || '—'}</td>
                      <td className="px-4 py-3 text-md text-ink">{ATTENDANCE_STATUS_LABEL[a.status] || a.status}</td>
                      <td className="px-4 py-3 text-md text-ink whitespace-nowrap">
                        {a.checkInAt ? fmtDateTime(a.checkInAt).slice(11) : '--'} - {a.checkOutAt ? fmtDateTime(a.checkOutAt).slice(11) : '--'}
                      </td>
                      <td className="px-4 py-3 text-md text-ink text-right">{a.workedMinutes != null ? `${Math.round(a.workedMinutes / 6) / 10}h` : ''}</td>
                      <td className="px-4 py-3 text-md text-ink text-right">{a.otMinutes || ''}</td>
                      <td className="px-4 py-3 text-md text-ink text-right">{money(a.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 px-7 py-4 border-t border-line">
          {canCancel
            ? <button onClick={() => void doCancel()} disabled={busy} className="kv-btn kv-btn-outline-neutral h-10"><TrashSmall /> Hủy</button>
            : <span />}
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="kv-btn kv-btn-outline-neutral h-10">Bỏ qua</button>
            <button className="kv-btn kv-btn-outline-neutral h-10"><ExportIcon /> Xuất file</button>
            <button className="kv-btn kv-btn-outline-neutral h-10"><PrintIcon /> In</button>
          </div>
        </div>
      </div>
    </div>
  )
}

const PayslipTab = ({ employee }: { employee: Employee }) => {
  const [filter, setFilter] = useState<PayslipFilter>('ALL')
  const [selected, setSelected] = useState<PayslipDetailDto | null>(null)
  const [rows, setRows] = useState<PayslipDetailDto[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    listEmployeePayslips(employee.id)
      .then(res => setRows(res.data.data))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [employee.id])

  const filtered = rows.filter(p => filter === 'ALL' || payslipFilterKey(p) === filter)

  return (
    <div className="p-6">
      <div className="mb-4">
        <div className="relative w-[16rem]">
          <select value={filter} onChange={e => setFilter(e.target.value as PayslipFilter)} className="w-full h-10 pl-3 pr-9 bg-card border border-line-default rounded-md text-md text-ink appearance-none cursor-pointer focus:border-primary outline-none">
            {PAYSLIP_FILTERS.map(s => <option key={s} value={s}>{PAYSLIP_FILTER_LABEL[s]}</option>)}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"><ChevronDownIcon /></span>
        </div>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-fill text-sm font-semibold text-ink-subtle">
            <th className="text-left px-4 py-3">Mã phiếu</th>
            <th className="text-left px-4 py-3">Kỳ làm việc</th>
            <th className="text-right px-4 py-3">Tổng lương</th>
            <th className="text-right px-4 py-3">Đã trả</th>
            <th className="text-right px-4 py-3">Còn cần trả</th>
            <th className="text-left px-4 py-3">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(p => (
            <tr key={p.id} className={`border-b border-line hover:bg-[var(--kv-state-hover-bg)] ${p.status === 'CANCELLED' ? 'opacity-50' : ''}`}>
              <td className="px-4 py-3.5"><button onClick={() => setSelected(p)} className="text-md text-primary hover:underline cursor-pointer">{p.code}</button></td>
              <td className="px-4 py-3.5 text-md text-ink">{fmtDate(p.periodStart)} - {fmtDate(p.periodEnd)}</td>
              <td className="px-4 py-3.5 text-md text-ink text-right">{money(p.total)}</td>
              <td className="px-4 py-3.5 text-md text-ink text-right">{money(p.paidAmount)}</td>
              <td className="px-4 py-3.5 text-md text-ink text-right">{money(p.remaining)}</td>
              <td className="px-4 py-3.5 text-md text-ink">{p.status === 'CANCELLED' ? 'Đã hủy' : PAYSLIP_PAYMENT_STATUS_LABEL[p.paymentStatus]}</td>
            </tr>
          ))}
          {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-md text-ink-subtle">{loading ? 'Đang tải…' : 'Không có phiếu lương'}</td></tr>}
        </tbody>
      </table>
      <div className="flex justify-end mt-4">
        <button className="kv-btn kv-btn-outline-neutral h-10 bg-card"><ExportIcon /> Xuất file</button>
      </div>
      {selected && <PayslipDetailModal payslip={selected} onClose={() => setSelected(null)} onChanged={() => { setSelected(null); load() }} />}
    </div>
  )
}

const InfoField = ({
  label, value, placeholder,
}: { label: string; value: string; placeholder?: string }) => (
  <div className="flex flex-col gap-1">
    <span className="text-sm text-ink-subtle">{label}</span>
    <span className={`text-md py-1 ${value ? 'text-ink' : 'text-ink-muted'}`}>{value || placeholder || '—'}</span>
  </div>
)

const EmployeeDetail = ({ employee, onSave, onToggleActive }: Props) => {
  const [tab, setTab] = useState<Tab>('Thông tin')
  const [showEditModal, setShowEditModal] = useState(false)
  const [linkedUsername, setLinkedUsername] = useState('')

  useEffect(() => {
    if (!employee.userId) { setLinkedUsername(''); return }
    let cancelled = false
    getUser(employee.userId)
      .then(res => { if (!cancelled) setLinkedUsername(res.data.data.username) })
      .catch(() => { if (!cancelled) setLinkedUsername('') })
    return () => { cancelled = true }
  }, [employee.userId])

  return (
    <div className="bg-card border-t border-line">
      <div className="flex items-center gap-8 px-6 border-b border-line overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative h-11 text-md font-semibold cursor-pointer whitespace-nowrap transition-colors ${tab === t ? 'text-primary' : 'text-ink-subtle hover:text-ink'}`}
          >
            {t}
            {tab === t && <span className="absolute left-0 right-0 -bottom-px h-[0.2rem] bg-primary rounded-full" />}
          </button>
        ))}
      </div>

      {tab === 'Thông tin' ? (
        <>
          <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <Avatar size="lg" className="w-20 h-20" />
              <div>
                <h3 className="text-h3 font-bold text-ink">{employee.name}</h3>
                <p className="text-md text-ink-subtle">Mã nhân viên: {employee.code}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-x-10 gap-y-5">
              <InfoField label="Số điện thoại" value={employee.phone} />
              <InfoField label="Tài khoản" value={linkedUsername} placeholder="Chưa liên kết" />

              <InfoField label="Số CMND/CCCD" value={employee.idNumber} placeholder="Chưa cập nhật" />
              <InfoField label="Ngày sinh" value={employee.birthday} placeholder="Chưa cập nhật" />
              <InfoField label="Giới tính" value={employee.gender} placeholder="Chưa cập nhật" />

              <InfoField label="Địa chỉ" value={employee.address} placeholder="Chưa cập nhật" />
              <InfoField label="Ngày bắt đầu làm việc" value={employee.startDate} placeholder="Chưa cập nhật" />
              <InfoField label="Mã chấm công" value={employee.timekeepCode} placeholder="Chưa cập nhật" />
            </div>

            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-sm text-ink-subtle"><PencilIcon /> Ghi chú:</span>
              <p className={`text-md py-1 ${employee.note ? 'text-ink' : 'text-ink-muted'}`}>{employee.note || 'Chưa có ghi chú'}</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 px-6 py-3 border-t border-line">
            <button className="kv-btn kv-btn-outline-neutral h-10 text-danger" onClick={() => onToggleActive(employee)}>
              {employee.status === 'ACTIVE' ? <PauseIcon /> : <PlayIcon />} {employee.status === 'ACTIVE' ? 'Ngừng làm việc' : 'Cho phép làm việc'}
            </button>
            <div className="flex items-center gap-2">
              <button className="kv-btn kv-btn-outline-neutral h-10" onClick={() => window.alert(`Đã gửi mã xác nhận cho ${employee.name}.`)}>
                <KeyIcon /> Lấy mã xác nhận
              </button>
              <button className="kv-btn kv-btn-primary h-10" onClick={() => setShowEditModal(true)}>Cập nhật</button>
            </div>
          </div>

          {showEditModal && (
            <EmployeeModal
              employee={employee}
              onClose={() => setShowEditModal(false)}
              onSave={async payload => {
                const res = await updateEmployee(employee.id, payload)
                onSave(toEmployee(res.data.data))
                return res.data.data
              }}
            />
          )}
        </>
      ) : tab === 'Lịch làm việc' ? (
        <ScheduleTab employee={employee} />
      ) : tab === 'Thiết lập lương' ? (
        <SalarySetupTab employee={employee} onSave={onSave} />
      ) : tab === 'Phiếu lương' ? (
        <PayslipTab employee={employee} />
      ) : (
        <div className="flex items-center justify-center py-16 text-md text-ink-subtle">
          {tab} đang được phát triển
        </div>
      )}
    </div>
  )
}

export default EmployeeDetail
