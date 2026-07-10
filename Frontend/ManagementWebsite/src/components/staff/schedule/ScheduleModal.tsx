import { useEffect, useRef, useState } from 'react'
import type { StaffSummary, Assignment, ShiftTemplate } from '../../../services/rosterService'
import { WEEKDAY_LABELS, WEEKDAY_PILLS, formatTime, toYMD } from './scheduleUtils'

export interface ScheduleSavePayload {
  shiftIds: string[]
  repeatWeekly: boolean
  repeatDays: number[]
  repeatEnd: string | null
  holidayWork: boolean
  applyToEmployeeIds: string[]
  // Shift-first add ("Xem theo ca" → Thêm nhân viên): the employees chosen for the locked shift.
  staffIds?: string[]
}

interface Props {
  mode: 'add' | 'edit'
  employee?: StaffSummary
  date: Date
  entry?: Assignment
  shiftTypes: ShiftTemplate[]
  availableShiftTypes: ShiftTemplate[]
  otherEmployees: StaffSummary[]
  // When set, the modal adds staff to this fixed shift (shift-first flow).
  lockedShift?: ShiftTemplate
  // Candidate employees for the shift-first picker (those not yet on the shift that day).
  staffOptions?: StaffSummary[]
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
const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted">
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

/* multi-select employee picker: selected show as removable chips, dropdown with checks */
const EmployeeMultiSelect = ({ options, selected, onToggle }: { options: StaffSummary[]; selected: Set<string>; onToggle: (id: string) => void }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const chosen = options.filter(o => selected.has(o.id))
  return (
    <div ref={ref} className="relative mt-3">
      <div onClick={() => setOpen(true)} className={`min-h-[2.75rem] flex flex-wrap items-center gap-2 px-2 py-1.5 bg-card border rounded-md cursor-text transition-colors ${open ? 'border-primary' : 'border-line-default hover:border-line-strong'}`}>
        {chosen.length === 0 && <span className="px-1 text-md text-ink-muted">Tìm kiếm nhân viên</span>}
        {chosen.map(e => (
          <span key={e.id} className="flex items-center gap-1.5 h-7 pl-2 pr-1.5 rounded bg-primary text-white text-sm">
            {e.fullName}
            <button type="button" onClick={ev => { ev.stopPropagation(); onToggle(e.id) }} className="hover:opacity-80 cursor-pointer" aria-label="Bỏ chọn">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </span>
        ))}
      </div>
      {open && (
        <div className="absolute left-0 right-0 bottom-[calc(100%+0.3rem)] bg-card border border-line-default rounded-md shadow-md z-[var(--kv-z-dropdown)] max-h-[16rem] overflow-y-auto py-1">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-md text-ink-muted">Không có nhân viên</div>
          ) : options.map(e => {
            const on = selected.has(e.id)
            return (
              <button key={e.id} type="button" onClick={() => onToggle(e.id)} className={`flex items-center justify-between w-full px-3 py-2.5 text-left cursor-pointer ${on ? 'bg-primary-25' : 'hover:bg-[var(--kv-state-hover-bg)]'}`}>
                <div>
                  <div className="text-md font-semibold text-ink">{e.fullName}</div>
                  <div className="text-sm text-ink-subtle">{e.id}</div>
                </div>
                {on && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0"><polyline points="20 6 9 17 4 12" /></svg>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

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
  mode, employee, date, entry, shiftTypes, availableShiftTypes, otherEmployees, lockedShift, staffOptions = [], error, onClose, onSave, onDelete, onManageTemplates,
}: Props) => {
  const [selectedShiftIds, setSelectedShiftIds] = useState<Set<string>>(new Set())
  const [repeatWeekly, setRepeatWeekly] = useState(entry?.repeatWeekly ?? false)
  const [repeatDays, setRepeatDays] = useState<number[]>(entry?.repeatDays.length ? entry.repeatDays : WEEKDAY_PILLS.map(p => p.value))
  const [repeatEnd, setRepeatEnd] = useState(entry?.repeatEnd ?? '')
  const [holidayWork, setHolidayWork] = useState(entry?.holidayWork ?? false)
  const [applyToOthers, setApplyToOthers] = useState(false)
  const [otherIds, setOtherIds] = useState<Set<string>>(new Set())
  // Shift-first flow: which employees to add to the locked shift.
  const [staffIds, setStaffIds] = useState<Set<string>>(new Set())
  const [staffSearch, setStaffSearch] = useState('')

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

  const toggleStaff = (id: string) =>
    setStaffIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })

  const editingShift = entry ? shiftTypes.find(s => s.id === entry.shiftTemplateId) : undefined

  const canSave = lockedShift
    ? staffIds.size > 0
    : mode === 'edit' ? true : selectedShiftIds.size > 0

  const handleSave = () => {
    if (!canSave) return
    onSave({
      shiftIds: lockedShift ? [lockedShift.id] : mode === 'edit' ? [entry!.shiftTemplateId] : Array.from(selectedShiftIds),
      repeatWeekly,
      repeatDays: repeatWeekly ? repeatDays : [],
      repeatEnd: repeatWeekly ? (repeatEnd || null) : null,
      holidayWork,
      applyToEmployeeIds: !lockedShift && mode === 'add' && applyToOthers ? Array.from(otherIds) : [],
      staffIds: lockedShift ? Array.from(staffIds) : undefined,
    })
  }

  return (
    <div
      className="fixed inset-0 z-[var(--kv-z-modal)] flex items-start justify-center p-6 overflow-y-auto"
      style={{ background: 'rgba(var(--kv-black-rgb), 0.45)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-[72rem] my-6 bg-card rounded-lg shadow-lg flex flex-col max-h-[calc(100vh-6rem)]">
        <div className="flex items-center justify-between px-6 pt-5 shrink-0">
          <h2 className="text-h3 font-bold text-ink">{mode === 'edit' ? 'Cập nhật lịch làm việc' : 'Thêm lịch làm việc'}</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-md text-ink-subtle cursor-pointer transition-colors hover:bg-fill hover:text-ink" aria-label="Đóng">
            <CloseIcon />
          </button>
        </div>
        <div className="flex items-center gap-2 px-6 pb-4 text-md text-ink-subtle">
          <span>{lockedShift ? `${lockedShift.name} (${formatTime(lockedShift.startTime)} - ${formatTime(lockedShift.endTime)})` : employee?.fullName}</span>
          <span className="w-px h-4 bg-line" />
          <span>{WEEKDAY_LABELS[(date.getDay() + 6) % 7]}, {String(date.getDate()).padStart(2, '0')}/{String(date.getMonth() + 1).padStart(2, '0')}/{date.getFullYear()}</span>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 flex flex-col gap-5">
          {lockedShift ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-md font-semibold text-ink">Chọn nhân viên</span>
                <button className="w-6 h-6 flex items-center justify-center rounded-full bg-fill text-ink-subtle cursor-pointer hover:bg-fill-strong" aria-label="Thêm nhân viên"><PlusIcon /></button>
              </div>
              <div className="bg-fill rounded-md p-4">
                <div className="relative mb-3">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2"><SearchIcon /></span>
                  <input value={staffSearch} onChange={e => setStaffSearch(e.target.value)} placeholder="Tìm kiếm nhân viên"
                    className="w-full h-11 pl-9 pr-3 bg-card border border-line-default rounded-md text-md text-ink placeholder:text-ink-muted focus:border-primary outline-none" />
                </div>
                {(() => {
                  const q = staffSearch.trim().toLowerCase()
                  const list = q ? staffOptions.filter(s => s.fullName.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)) : staffOptions
                  if (staffOptions.length === 0) return <span className="text-md text-ink-subtle">Tất cả nhân viên đã được xếp vào ca này.</span>
                  if (list.length === 0) return <span className="text-md text-ink-subtle">Không tìm thấy nhân viên phù hợp.</span>
                  return (
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 max-h-[16rem] overflow-y-auto">
                      {list.map(s => (
                        <label key={s.id} className="flex items-start gap-2 cursor-pointer">
                          <input type="checkbox" checked={staffIds.has(s.id)} onChange={() => toggleStaff(s.id)} className="accent-primary w-4 h-4 mt-0.5" />
                          <div>
                            <div className="text-md font-semibold text-ink">{s.fullName}</div>
                            <div className="text-sm text-ink-subtle">{s.id}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )
                })()}
              </div>
            </div>
          ) : (
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
          )}

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
                      className={`h-9 px-3 rounded-md text-md cursor-pointer transition-colors border ${repeatDays.includes(p.value) ? 'bg-primary text-white border-primary' : 'bg-card text-ink border-line-default hover:border-line-strong'}`}
                    >
                      {p.label}
                    </button>
                  ))}
                  <button className="ml-1 text-md font-medium text-primary hover:underline" onClick={() => setRepeatDays(WEEKDAY_PILLS.map(p => p.value))}>
                    Chọn tất cả
                  </button>
                </div>
                <div className="text-sm text-ink-subtle">
                  Lặp lại {WEEKDAY_PILLS.filter(p => repeatDays.includes(p.value)).map(p => p.label).join(', ') || '...'} hàng tuần
                </div>
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className="text-md text-ink">Kết thúc</span>
                    <div className="relative w-[16rem]">
                      <input
                        type="date"
                        value={repeatEnd}
                        min={toYMD(date)}
                        onChange={e => setRepeatEnd(e.target.value)}
                        className={`w-full h-10 pl-3 pr-9 bg-card border border-line-default rounded-md text-md focus:border-primary outline-none ${repeatEnd ? 'text-ink' : 'text-transparent'} [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer`}
                      />
                      {!repeatEnd && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-md text-ink-muted">Chưa xác định</span>}
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"><CalendarIcon /></span>
                    </div>
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

          {!lockedShift && mode === 'add' && otherEmployees.length > 0 && (
            <div className="border-t border-line pt-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-md font-semibold text-ink">Thêm lịch tương tự cho nhân viên khác</div>
                  <p className="text-sm text-ink-subtle mt-0.5">Lịch làm việc sẽ được áp dụng cho các nhân viên được chọn</p>
                </div>
                <Toggle checked={applyToOthers} onChange={setApplyToOthers} />
              </div>
              {applyToOthers && (
                <EmployeeMultiSelect options={otherEmployees} selected={otherIds} onToggle={toggleOther} />
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
