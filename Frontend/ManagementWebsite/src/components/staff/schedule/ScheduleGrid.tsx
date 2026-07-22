import type { ScheduleDto, ShiftDto } from '../../../api/attendance'
import { formatTime } from '../../../api/attendance'
import { money } from '../../../api/payroll'
import type { StaffSummary } from './Schedule'
import { WEEKDAY_LABELS, entriesOn, sameDay, type ExpectedSalary } from './scheduleUtils'

interface Props {
  employees: StaffSummary[]
  weekDays: Date[]
  entries: ScheduleDto[]
  shiftTypes: ShiftDto[]
  viewMode: 'employee' | 'shift'
  expectedSalaryByEmployee: Map<string, ExpectedSalary | null>
  onQuickDelete: (entry: ScheduleDto) => void
  onAddClick: (employee: StaffSummary, date: Date) => void
  onAddStaff: (date: Date, shift: ShiftDto) => void
  onEditClick: (employee: StaffSummary, date: Date, entry: ScheduleDto) => void
}

const InfoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted shrink-0">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
)
const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
)

/**
 * Hover tooltip + inline "x" delete shown on a scheduled shift pill (both employee and shift
 * views). `label` is the pill's own text (shift name, or the employee's name in "Xem theo ca");
 * `shiftName`/times always describe the underlying shift, which the tooltip surfaces regardless
 * of which one the pill itself is showing.
 */
const ShiftPill = ({ label, shiftName, startTime, endTime, colorCls, openDown, onOpen, onDelete }: {
  label: string; shiftName: string; startTime: string | null | undefined; endTime: string | null | undefined
  colorCls: string; openDown?: boolean; onOpen: () => void; onDelete: () => void
}) => (
  <div
    onClick={onOpen}
    className={`group/pill relative flex items-center justify-between gap-2 h-9 px-3 rounded-md text-md font-medium cursor-pointer transition-opacity hover:opacity-80 ${colorCls}`}
  >
    <span className="truncate">{label}</span>
    <button
      type="button"
      aria-label="Xóa lịch"
      onClick={e => { e.stopPropagation(); onDelete() }}
      className="shrink-0 opacity-0 group-hover/pill:opacity-100 transition-opacity cursor-pointer text-current"
    >
      <XIcon />
    </button>
    {startTime && endTime && (
      <div
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 z-[var(--kv-z-tooltip)] whitespace-nowrap rounded-lg border border-line bg-card px-4 py-2 text-md font-normal text-ink shadow-lg opacity-0 transition-opacity group-hover/pill:opacity-100 ${openDown ? 'top-[calc(100%+0.4rem)]' : 'bottom-[calc(100%+0.4rem)]'}`}
      >
        {shiftName} ({formatTime(startTime)} - {formatTime(endTime)})
      </div>
    )}
  </div>
)

const SHIFT_PILL_PALETTE = [
  'bg-warning-50 text-warning-700',
  'bg-primary-50 text-primary-700',
  'bg-success-50 text-success-700',
  'bg-danger-50 text-danger-700',
]
const shiftPillCls = (shiftTypes: ShiftDto[], shiftId: string) => {
  const index = shiftTypes.findIndex(s => s.id === shiftId)
  return SHIFT_PILL_PALETTE[index % SHIFT_PILL_PALETTE.length] ?? 'bg-fill text-ink'
}

const ScheduleGrid = ({ employees, weekDays, entries, shiftTypes, viewMode, expectedSalaryByEmployee, onQuickDelete, onAddClick, onAddStaff, onEditClick }: Props) => {
  const today = new Date()
  const totalExpectedSalary = employees.reduce((sum, emp) => sum + (expectedSalaryByEmployee.get(emp.id)?.total ?? 0), 0)

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-card border border-line rounded-t-lg overflow-auto">
      <table className="w-full border-collapse table-fixed min-w-[80rem]">
        <thead>
          <tr>
            <th className="sticky top-0 z-2 bg-primary-25 text-left text-md font-semibold text-ink-strong px-3 py-3 w-[14rem]">
              {viewMode === 'employee' ? 'Nhân viên' : 'Ca làm việc'}
            </th>
            {weekDays.map(d => (
              <th key={d.toISOString()} className="sticky top-0 z-2 bg-primary-25 text-center text-md font-semibold text-ink-strong px-3 py-3">
                <span className="text-ink-subtle font-medium">{WEEKDAY_LABELS[(d.getDay() + 6) % 7]}</span>{' '}
                <span className={sameDay(d, today) ? 'inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white' : ''}>
                  {d.getDate()}
                </span>
              </th>
            ))}
            {viewMode === 'employee' && (
              <th className="sticky top-0 z-2 bg-primary-25 text-right text-md font-semibold text-ink-strong px-3 py-3 whitespace-nowrap">
                <span
                  className="inline-flex items-center justify-end gap-1"
                  title="Ước tính từ mức lương đã thiết lập và lịch làm việc, chưa gồm phụ cấp/khấu trừ. Số liệu chính thức xem tại Bảng lương."
                >
                  Lương dự kiến <InfoIcon />
                </span>
              </th>
            )}
          </tr>
        </thead>

        {viewMode === 'employee' ? (
          <tbody>
            <tr className="border-b border-line bg-fill/40">
              <td className="px-3 py-3" />
              {weekDays.map(d => <td key={d.toISOString()} className="px-3 py-3 border-l border-line" />)}
              <td className="px-3 py-3 border-l border-line text-right text-md font-bold text-ink">{money(totalExpectedSalary)}</td>
            </tr>
            {employees.map((emp, rowIndex) => (
              <tr key={emp.id} className="border-b border-line align-top">
                <td className="px-3 py-3">
                  <div className="text-md font-semibold text-ink">{emp.fullName}</div>
                </td>
                {weekDays.map(d => {
                  const dayEntries = entriesOn(entries, emp.id, d)
                  // Allow adding when the day still has an unassigned shift,
                  // or when no shifts exist yet (the add modal can create one).
                  const hasRoom = shiftTypes.length === 0 || dayEntries.length < shiftTypes.length
                  return (
                    <td key={d.toISOString()} className="group px-1.5 py-2 align-top border-l border-line">
                      <div className="flex flex-col gap-1.5">
                        {dayEntries.map(entry => {
                          const st = shiftTypes.find(s => s.id === entry.shiftId)
                          return (
                            <ShiftPill
                              key={entry.id}
                              label={st?.name ?? entry.shiftName ?? ''}
                              shiftName={st?.name ?? entry.shiftName ?? ''}
                              startTime={st?.startTime ?? entry.shiftStartTime}
                              endTime={st?.endTime ?? entry.shiftEndTime}
                              colorCls={shiftPillCls(shiftTypes, entry.shiftId)}
                              openDown={rowIndex === 0}
                              onOpen={() => onEditClick(emp, d, entry)}
                              onDelete={() => onQuickDelete(entry)}
                            />
                          )
                        })}
                        {hasRoom && (
                          <button
                            onClick={() => onAddClick(emp, d)}
                            className="h-7 px-1 flex items-center gap-1 text-sm font-medium text-primary cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                            Thêm lịch
                          </button>
                        )}
                      </div>
                    </td>
                  )
                })}
                <td className="px-3 py-3 border-l border-line align-top text-right">
                  {(() => {
                    const exp = expectedSalaryByEmployee.get(emp.id)
                    if (!exp) return <span className="text-sm text-ink-muted">Chưa thiết lập lương</span>
                    return (
                      <>
                        <div className="text-md text-ink">{money(exp.total)}</div>
                        {exp.salaryType === 'SHIFT' && <div className="text-sm text-ink-subtle">{exp.shiftCount} ca</div>}
                      </>
                    )
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        ) : (
          <tbody>
            {shiftTypes.map((st, rowIndex) => (
              <tr key={st.id} className="border-b border-line align-top">
                <td className="px-3 py-3">
                  <div className="text-md font-semibold text-ink">{st.name}</div>
                  <div className="text-sm text-ink-subtle">{formatTime(st.startTime)} - {formatTime(st.endTime)}</div>
                </td>
                {weekDays.map(d => {
                  const staff = employees.filter(emp => entriesOn(entries, emp.id, d).some(e => e.shiftId === st.id))
                  return (
                    <td key={d.toISOString()} className="group px-1.5 py-2 align-top border-l border-line">
                      <div className="flex flex-col gap-1.5">
                        {staff.map(emp => {
                          const entry = entriesOn(entries, emp.id, d).find(e => e.shiftId === st.id)!
                          return (
                            <ShiftPill
                              key={emp.id}
                              label={emp.fullName}
                              shiftName={st.name}
                              startTime={st.startTime}
                              endTime={st.endTime}
                              colorCls="text-primary-700 bg-primary-50"
                              openDown={rowIndex === 0}
                              onOpen={() => onEditClick(emp, d, entry)}
                              onDelete={() => onQuickDelete(entry)}
                            />
                          )
                        })}
                        <button
                          onClick={() => onAddStaff(d, st)}
                          className="h-7 px-1 flex items-center gap-1 text-sm font-medium text-primary cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                          Thêm nhân viên
                        </button>
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        )}
      </table>

      {employees.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 py-20">
          <div className="text-lg font-semibold text-ink-strong">Không tìm thấy nhân viên.</div>
          <div className="text-md text-ink-subtle">Thử đổi từ khóa tìm kiếm.</div>
        </div>
      )}
    </div>
  )
}

export default ScheduleGrid
