import { useEffect, useState } from 'react'
import type { StaffSummary, Assignment, ShiftTemplate } from '../../../services/rosterService'
import { WEEKDAY_LABELS, WEEKDAY_PILLS, formatTime, toYMD } from './scheduleUtils'

export interface ScheduleSavePayload {
  shiftIds: string[]
  repeatWeekly: boolean
  repeatDays: number[]
  repeatEnd: string | null
  holidayWork: boolean
  applyToEmployeeIds: string[]
}

interface Props {
  mode: 'add' | 'edit'
  employee: StaffSummary
  date: Date
  entry?: Assignment
  shiftTypes: ShiftTemplate[]
  availableShiftTypes: ShiftTemplate[]
  otherEmployees: StaffSummary[]
  error?: string
  onClose: () => void
  onSave: (payload: ScheduleSavePayload) => void
  onDelete?: () => void
  onManageTemplates: () => void
}

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
)
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`relative w-11 h-6 rounded-full shrink-0 transition-colors cursor-pointer ${checked ? 'bg-primary' : 'bg-fill-strong'}`}
  >
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
  </button>
)

const ScheduleModal = ({
  mode, employee, date, entry, shiftTypes, availableShiftTypes, otherEmployees, error, onClose, onSave, onDelete, onManageTemplates,
}: Props) => {
  const [selectedShiftIds, setSelectedShiftIds] = useState<Set<string>>(new Set())
  const [repeatWeekly, setRepeatWeekly] = useState(entry?.repeatWeekly ?? false)
  const [repeatDays, setRepeatDays] = useState<number[]>(entry?.repeatDays.length ? entry.repeatDays : WEEKDAY_PILLS.map(p => p.value))
  const [repeatEnd, setRepeatEnd] = useState(entry?.repeatEnd ?? '')
  const [holidayWork, setHolidayWork] = useState(entry?.holidayWork ?? false)
  const [applyToOthers, setApplyToOthers] = useState(false)
  const [otherIds, setOtherIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const toggleShift = (id: string) =>
    setSelectedShiftIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })

  const toggleDay = (value: number) =>
    setRepeatDays(prev => (prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]))

  const toggleOther = (id: string) =>
    setOtherIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })

  const editingShift = entry ? shiftTypes.find(s => s.id === entry.shiftTemplateId) : undefined

  const canSave = mode === 'edit' ? true : selectedShiftIds.size > 0

  const handleSave = () => {
    if (!canSave) return
    onSave({
      shiftIds: mode === 'edit' ? [entry!.shiftTemplateId] : Array.from(selectedShiftIds),
      repeatWeekly,
      repeatDays: repeatWeekly ? repeatDays : [],
      repeatEnd: repeatWeekly ? (repeatEnd || null) : null,
      holidayWork,
      applyToEmployeeIds: mode === 'add' && applyToOthers ? Array.from(otherIds) : [],
    })
  }

  return (
    <div
      className="fixed inset-0 z-[var(--kv-z-modal)] flex items-start justify-center p-6 overflow-y-auto"
      style={{ background: 'rgba(var(--kv-black-rgb), 0.45)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-[42rem] my-6 bg-card rounded-lg shadow-lg flex flex-col max-h-[calc(100vh-6rem)]">
        <div className="flex items-center justify-between px-6 pt-5 shrink-0">
          <h2 className="text-h3 font-bold text-ink">{mode === 'add' ? 'Thêm lịch làm việc' : 'Cập nhật lịch làm việc'}</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-md text-ink-subtle cursor-pointer transition-colors hover:bg-fill hover:text-ink" aria-label="Đóng">
            <CloseIcon />
          </button>
        </div>
        <div className="flex items-center gap-2 px-6 pb-4 text-md text-ink-subtle">
          <span>{employee.fullName}</span>
          <span className="w-px h-4 bg-line" />
          <span>{WEEKDAY_LABELS[(date.getDay() + 6) % 7]}, {String(date.getDate()).padStart(2, '0')}/{String(date.getMonth() + 1).padStart(2, '0')}/{date.getFullYear()}</span>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 flex flex-col gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-md font-semibold text-ink">Chọn ca làm việc</span>
              {mode === 'add' && (
                <button
                  className="w-6 h-6 flex items-center justify-center rounded-full bg-fill text-ink-subtle cursor-pointer hover:bg-fill-strong"
                  onClick={onManageTemplates}
                  aria-label="Quản lý ca làm việc"
                >
                  <PlusIcon />
                </button>
              )}
            </div>

            {mode === 'edit' && editingShift ? (
              <div className="bg-fill rounded-md p-4">
                <div className="text-md font-semibold text-ink">{editingShift.name}</div>
                <div className="text-sm text-ink-subtle">{formatTime(editingShift.startTime)} - {formatTime(editingShift.endTime)}</div>
              </div>
            ) : (
              <div className="bg-fill rounded-md p-4 grid grid-cols-2 gap-4">
                {availableShiftTypes.length === 0 && (
                  <span className="col-span-2 text-md text-ink-subtle">Đã chọn đủ ca cho ngày này.</span>
                )}
                {availableShiftTypes.map(st => (
                  <label key={st.id} className="kv-check items-start">
                    <input type="checkbox" checked={selectedShiftIds.has(st.id)} onChange={() => toggleShift(st.id)} />
                    <span className="kv-check-box mt-0.5" />
                    <span>
                      <span className="block text-md text-ink">{st.name}</span>
                      <span className="block text-sm text-ink-subtle">{formatTime(st.startTime)} - {formatTime(st.endTime)}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-line pt-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-md font-semibold text-ink">Lặp lại hàng tuần</div>
                <p className="text-sm text-ink-subtle mt-0.5">Lịch làm việc sẽ được tự động lặp lại vào các ngày trong tuần</p>
              </div>
              <Toggle checked={repeatWeekly} onChange={setRepeatWeekly} />
            </div>

            {repeatWeekly && (
              <div className="flex flex-col gap-3 mt-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {WEEKDAY_PILLS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => toggleDay(p.value)}
                      className={`h-8 px-3 rounded-full text-sm font-medium cursor-pointer transition-colors ${repeatDays.includes(p.value) ? 'bg-primary text-white' : 'bg-fill text-ink-subtle hover:bg-fill-strong'}`}
                    >
                      {p.label}
                    </button>
                  ))}
                  <button className="text-sm font-medium text-primary hover:underline" onClick={() => setRepeatDays(WEEKDAY_PILLS.map(p => p.value))}>
                    Chọn tất cả
                  </button>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-md text-ink-subtle">Kết thúc</span>
                    <input
                      type="date"
                      className="h-9 px-3 bg-field border border-line-default rounded-md text-md text-ink focus:outline-none focus:border-primary"
                      value={repeatEnd}
                      min={toYMD(date)}
                      onChange={e => setRepeatEnd(e.target.value)}
                    />
                  </div>
                  <label className="kv-check">
                    <input type="checkbox" checked={holidayWork} onChange={() => setHolidayWork(v => !v)} />
                    <span className="kv-check-box" />
                    <span className="kv-check-text">Làm việc cả ngày lễ tết</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {mode === 'add' && otherEmployees.length > 0 && (
            <div className="border-t border-line pt-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-md font-semibold text-ink">Thêm lịch tương tự cho nhân viên khác</div>
                  <p className="text-sm text-ink-subtle mt-0.5">Lịch làm việc sẽ được áp dụng cho các nhân viên được chọn</p>
                </div>
                <Toggle checked={applyToOthers} onChange={setApplyToOthers} />
              </div>
              {applyToOthers && (
                <div className="flex flex-col gap-1 mt-3 max-h-[12rem] overflow-y-auto">
                  {otherEmployees.map(e => (
                    <label key={e.id} className="kv-check py-1">
                      <input type="checkbox" checked={otherIds.has(e.id)} onChange={() => toggleOther(e.id)} />
                      <span className="kv-check-box" />
                      <span className="kv-check-text">{e.fullName}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="px-6 pb-2 shrink-0">
            <p className="text-md text-danger">{error}</p>
          </div>
        )}
        <div className="flex items-center justify-between gap-4 px-6 py-4 mt-2 shrink-0">
          {mode === 'edit' ? (
            <button className="flex items-center gap-2 text-md font-medium text-danger cursor-pointer hover:underline" onClick={onDelete}>
              <TrashIcon /> Xóa
            </button>
          ) : <span />}
          <div className="flex items-center gap-2">
            <button className="kv-btn kv-btn-outline-neutral h-10" onClick={onClose}>Bỏ qua</button>
            <button className="kv-btn kv-btn-primary h-10" disabled={!canSave} onClick={handleSave}>Lưu</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ScheduleModal
