import type { ScheduleDto, ShiftDto } from '../../../api/attendance'
import { formatTime } from '../../../api/attendance'
import type { StaffSummary } from './Schedule'
import { WEEKDAY_LABELS, entriesOn, sameDay } from './scheduleUtils'

interface Props {
  employees: StaffSummary[]
  weekDays: Date[]
  entries: ScheduleDto[]
  shiftTypes: ShiftDto[]
  viewMode: 'employee' | 'shift'
  onAddClick: (employee: StaffSummary, date: Date) => void
  onAddStaff: (date: Date, shift: ShiftDto) => void
  onEditClick: (employee: StaffSummary, date: Date, entry: ScheduleDto) => void
}

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

const ScheduleGrid = ({ employees, weekDays, entries, shiftTypes, viewMode, onAddClick, onAddStaff, onEditClick }: Props) => {
  const today = new Date()

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
          </tr>
        </thead>

        {viewMode === 'employee' ? (
          <tbody>
            {employees.map(emp => (
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
                            <button
                              key={entry.id}
                              onClick={() => onEditClick(emp, d, entry)}
                              className={`h-9 px-3 rounded-md text-md font-medium text-left cursor-pointer transition-opacity hover:opacity-80 ${shiftPillCls(shiftTypes, entry.shiftId)}`}
                            >
                              {st?.name ?? entry.shiftName}
                            </button>
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
              </tr>
            ))}
          </tbody>
        ) : (
          <tbody>
            {shiftTypes.map(st => (
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
                            <button
                              key={emp.id}
                              onClick={() => onEditClick(emp, d, entry)}
                              className="h-9 px-3 rounded-md text-md font-medium text-left text-primary-700 bg-primary-50 cursor-pointer transition-opacity hover:opacity-80"
                            >
                              {emp.fullName}
                            </button>
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
