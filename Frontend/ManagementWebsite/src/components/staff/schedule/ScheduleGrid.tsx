import type { StaffSummary, Assignment, ShiftTemplate } from '../../../services/rosterService'
import { WEEKDAY_LABELS, entriesOn, formatTime, sameDay } from './scheduleUtils'

interface Props {
  employees: StaffSummary[]
  weekDays: Date[]
  entries: Assignment[]
  shiftTypes: ShiftTemplate[]
  viewMode: 'employee' | 'shift'
  onAddClick: (employee: StaffSummary, date: Date) => void
  onEditClick: (employee: StaffSummary, date: Date, entry: Assignment) => void
}

const SHIFT_PILL_PALETTE = [
  'bg-warning-50 text-warning-700',
  'bg-primary-50 text-primary-700',
  'bg-success-50 text-success-700',
  'bg-danger-50 text-danger-700',
]
const shiftPillCls = (shiftTypes: ShiftTemplate[], shiftTemplateId: string) => {
  const index = shiftTypes.findIndex(s => s.id === shiftTemplateId)
  return SHIFT_PILL_PALETTE[index % SHIFT_PILL_PALETTE.length] ?? 'bg-fill text-ink'
}

const weeklyTotal = (entries: Assignment[], shiftTypes: ShiftTemplate[], employeeId: string, days: Date[]) => {
  const wageById = new Map(shiftTypes.map(s => [s.id, s.wage]))
  let total = 0
  let count = 0
  for (const day of days) {
    for (const e of entriesOn(entries, employeeId, day)) {
      total += wageById.get(e.shiftTemplateId) ?? 0
      count += 1
    }
  }
  return { total, count }
}

const ScheduleGrid = ({ employees, weekDays, entries, shiftTypes, viewMode, onAddClick, onEditClick }: Props) => {
  const today = new Date()

  const grandTotal = employees.reduce((sum, e) => sum + weeklyTotal(entries, shiftTypes, e.id, weekDays).total, 0)

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
              <th className="sticky top-0 z-2 bg-primary-25 text-right text-md font-semibold text-ink-strong px-3 py-3 w-[12rem]">
                <span className="inline-flex items-center gap-1 justify-end">
                  Lương dự kiến
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </span>
              </th>
            )}
          </tr>
        </thead>

        {viewMode === 'employee' ? (
          <tbody>
            <tr className="border-b border-line">
              <td className="px-3 py-3" />
              {weekDays.map(d => <td key={d.toISOString()} className="px-3 py-3" />)}
              <td className="px-3 py-3 text-right text-md font-bold text-ink">{grandTotal.toLocaleString('vi-VN')}</td>
            </tr>
            {employees.map(emp => {
              const { total, count } = weeklyTotal(entries, shiftTypes, emp.id, weekDays)
              return (
                <tr key={emp.id} className="border-b border-line align-top">
                  <td className="px-3 py-3">
                    <div className="text-md font-semibold text-ink">{emp.fullName}</div>
                  </td>
                  {weekDays.map(d => {
                    const dayEntries = entriesOn(entries, emp.id, d)
                    const hasRoom = dayEntries.length < shiftTypes.length
                    return (
                      <td key={d.toISOString()} className="group px-1.5 py-2 align-top border-l border-line">
                        <div className="flex flex-col gap-1.5">
                          {shiftTypes
                            .filter(st => dayEntries.some(e => e.shiftTemplateId === st.id))
                            .map(st => {
                              const entry = dayEntries.find(e => e.shiftTemplateId === st.id)!
                              return (
                                <button
                                  key={st.id}
                                  onClick={() => onEditClick(emp, d, entry)}
                                  className={`h-9 px-3 rounded-md text-md font-medium text-left cursor-pointer transition-opacity hover:opacity-80 ${shiftPillCls(shiftTypes, st.id)}`}
                                >
                                  {st.name}
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
                  <td className="px-3 py-3 text-right border-l border-line">
                    <div className="text-md font-semibold text-ink">{total.toLocaleString('vi-VN')}</div>
                    {count > 0 && <div className="text-sm text-ink-subtle">{count} ca</div>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        ) : (
          <tbody>
            {shiftTypes.map(st => (
              <tr key={st.id} className="border-b border-line align-top">
                <td className="px-3 py-3">
                  <div className={`inline-flex items-center h-7 px-3 rounded-md text-md font-medium ${shiftPillCls(shiftTypes, st.id)}`}>{st.name}</div>
                  <div className="text-sm text-ink-subtle mt-1">{formatTime(st.startTime)} - {formatTime(st.endTime)}</div>
                </td>
                {weekDays.map(d => {
                  const staff = employees.filter(emp => entriesOn(entries, emp.id, d).some(e => e.shiftTemplateId === st.id))
                  return (
                    <td key={d.toISOString()} className="px-1.5 py-2 align-top border-l border-line">
                      <div className="flex flex-col gap-1">
                        {staff.map(emp => {
                          const entry = entriesOn(entries, emp.id, d).find(e => e.shiftTemplateId === st.id)!
                          return (
                            <button
                              key={emp.id}
                              onClick={() => onEditClick(emp, d, entry)}
                              className="text-left text-sm text-ink px-2 py-1 rounded-md cursor-pointer hover:bg-primary-25"
                            >
                              {emp.fullName}
                            </button>
                          )
                        })}
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
