import { useCallback, useEffect, useMemo, useState } from 'react'
import ScheduleToolbar from './ScheduleToolbar'
import ScheduleGrid from './ScheduleGrid'
import ScheduleModal from './ScheduleModal'
import type { ScheduleSavePayload } from './ScheduleModal'
import DeleteScheduleModal from './DeleteScheduleModal'
import type { DeleteScope } from './DeleteScheduleModal'
import ShiftTemplateModal from './ShiftTemplateModal'
import { startOfWeek, weekDays as buildWeekDays, entriesOn, toYMD, computeExpectedSalary } from './scheduleUtils'
import { listShifts, listSchedules, createSchedules, deleteSchedule, cancelScheduleRule, formatTime } from '../../../api/attendance'
import type { ShiftDto, ScheduleDto } from '../../../api/attendance'
import { listEmployees, getSalarySetting } from '../../../api/employees'
import type { SalarySettingDto } from '../../../api/employees'

/** UI-local employee summary shared by the schedule sub-components. */
export interface StaffSummary { id: string; fullName: string; code: string }

/** apiClient (axios) rejects with an AxiosError, not services/api's fetch-based ApiError —
 * pull the backend's message straight off the response body, same as the rest of the app. */
const errMsg = (err: unknown, fallback: string): string =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback

interface ModalState {
  mode: 'add' | 'edit'
  employee?: StaffSummary
  date: Date
  entry?: ScheduleDto
  // Shift-first add ("Xem theo ca" → Thêm nhân viên): the shift the chosen staff are added to.
  lockedShift?: ShiftDto
}

const Schedule = () => {
  const [employees, setEmployees] = useState<StaffSummary[]>([])
  const [shiftTypes, setShiftTypes] = useState<ShiftDto[]>([])
  const [entries, setEntries] = useState<ScheduleDto[]>([])
  const [salarySettings, setSalarySettings] = useState<Map<string, SalarySettingDto>>(new Map())
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [viewMode, setViewMode] = useState<'employee' | 'shift'>('employee')
  const [modal, setModal] = useState<ModalState | null>(null)
  const [modalError, setModalError] = useState('')
  const [addShiftOpen, setAddShiftOpen] = useState(false)
  // "x" quick-delete on a card — recurring entries go through a scope picker first.
  const [quickDeleteEntry, setQuickDeleteEntry] = useState<ScheduleDto | null>(null)
  const [quickDeleteError, setQuickDeleteError] = useState('')
  const [quickDeleteBusy, setQuickDeleteBusy] = useState(false)

  const weekDaysList = useMemo(() => buildWeekDays(weekStart), [weekStart])
  const weekStartKey = toYMD(weekStart)
  const weekEndKey = toYMD(weekDaysList[6])

  const loadStaticData = useCallback(async () => {
    try {
      const [empRes, shiftRes, scheduleRes] = await Promise.all([
        listEmployees({ status: 'ACTIVE', size: 500 }),
        listShifts({ status: 'ACTIVE' }),
        listSchedules(weekStartKey, weekEndKey),
      ])
      setEmployees(empRes.data.data.map(e => ({ id: e.id, fullName: e.name, code: e.code })))
      setShiftTypes(shiftRes.data.data)
      setEntries(scheduleRes.data.data)

      const empList = empRes.data.data
      const salaryResults = await Promise.allSettled(empList.map(e => getSalarySetting(e.id)))
      const salaryMap = new Map<string, SalarySettingDto>()
      salaryResults.forEach((r, i) => { if (r.status === 'fulfilled') salaryMap.set(empList[i].id, r.value.data.data) })
      setSalarySettings(salaryMap)
    } catch (err) {
      setError(errMsg(err, 'Không tải được dữ liệu lịch làm việc.'))
    }
  }, [weekStartKey, weekEndKey])

  useEffect(() => { void loadStaticData() }, [loadStaticData])

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return employees
    return employees.filter(e => e.fullName.toLowerCase().includes(q))
  }, [employees, search])

  const closeModal = () => { setModal(null); setModalError('') }

  const handleSave = async (payload: ScheduleSavePayload) => {
    if (!modal) return
    try {
      if (modal.lockedShift) {
        // Shift-first add: the chosen staff are all added to the locked shift.
        await createSchedules({
          employeeIds: payload.staffIds ?? [],
          date: toYMD(modal.date),
          shiftIds: [modal.lockedShift.id],
          repeatWeekly: payload.repeatWeekly,
          repeatDays: payload.repeatDays,
          repeatEnd: payload.repeatEnd,
          workOnHolidays: payload.workOnHolidays,
        })
      } else if (modal.employee) {
        await createSchedules({
          employeeIds: [modal.employee.id, ...payload.applyToEmployeeIds],
          date: toYMD(modal.date),
          shiftIds: payload.shiftIds,
          repeatWeekly: payload.repeatWeekly,
          repeatDays: payload.repeatDays,
          repeatEnd: payload.repeatEnd,
          workOnHolidays: payload.workOnHolidays,
        })
      }
      await loadStaticData()
      closeModal()
    } catch (err) {
      setModalError(errMsg(err, 'Không thể lưu lịch làm việc.'))
    }
  }

  const handleDeleteOccurrence = async () => {
    if (!modal?.entry) return
    try {
      await deleteSchedule(modal.entry.id)
      await loadStaticData()
      closeModal()
    } catch (err) {
      setModalError(errMsg(err, 'Không thể xóa lịch làm việc.'))
    }
  }

  // "x" on a schedule card — a one-off entry deletes immediately; a recurring one asks
  // which occurrences to apply the change to first (Google Calendar-style scope picker).
  const handleQuickDeleteClick = (entry: ScheduleDto) => {
    setError('')
    if (entry.ruleId) {
      setQuickDeleteEntry(entry)
      setQuickDeleteError('')
    } else {
      void runQuickDelete(entry, 'single')
    }
  }

  const runQuickDelete = async (entry: ScheduleDto, scope: DeleteScope) => {
    setQuickDeleteBusy(true)
    setQuickDeleteError('')
    try {
      if (scope === 'single') {
        await deleteSchedule(entry.id)
      } else if (scope === 'from') {
        await cancelScheduleRule(entry.ruleId!, entry.workDate)
      } else {
        await cancelScheduleRule(entry.ruleId!, entry.ruleStartDate ?? entry.workDate)
      }
      await loadStaticData()
      setQuickDeleteEntry(null)
    } catch (err) {
      const message = errMsg(err, 'Không thể xóa lịch làm việc.')
      if (entry.ruleId) setQuickDeleteError(message); else setError(message)
    } finally {
      setQuickDeleteBusy(false)
    }
  }

  const handleCancelRule = async () => {
    if (!modal?.entry?.ruleId) return
    try {
      await cancelScheduleRule(modal.entry.ruleId)
      await loadStaticData()
      closeModal()
    } catch (err) {
      setModalError(errMsg(err, 'Không thể ngừng lặp lịch làm việc.'))
    }
  }

  const handleExport = () => {
    const header = ['Mã nhân viên', 'Tên nhân viên', 'Ngày', 'Ca làm việc', 'Giờ làm']
    const rows = filteredEmployees.flatMap(emp =>
      weekDaysList.flatMap(d =>
        entriesOn(entries, emp.id, d).map(e => [
          emp.code, emp.fullName, toYMD(d), e.shiftName ?? '',
          e.shiftStartTime ? `${formatTime(e.shiftStartTime)} - ${formatTime(e.shiftEndTime)}` : '',
        ])
      )
    )
    const csv = [header, ...rows]
      .map(line => line.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lich-lam-viec-${weekStartKey}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const expectedSalaryByEmployee = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeExpectedSalary>>()
    filteredEmployees.forEach(emp => map.set(emp.id, computeExpectedSalary(entries, emp.id, salarySettings.get(emp.id))))
    return map
  }, [filteredEmployees, entries, salarySettings])

  // Any other click the manager makes elsewhere on the screen dismisses a stale top banner —
  // it described the last action, not this new one.
  const openModal = (m: ModalState) => { setError(''); setModal(m) }

  const dayEntriesForModal = modal?.employee ? entriesOn(entries, modal.employee.id, modal.date) : []
  const availableShiftTypes = shiftTypes.filter(st => !dayEntriesForModal.some(e => e.shiftId === st.id))
  // Shift-first add: only offer staff not already on this shift that day.
  const lockedShiftStaffOptions = modal?.lockedShift
    ? employees.filter(emp => !entriesOn(entries, emp.id, modal.date).some(e => e.shiftId === modal.lockedShift!.id))
    : []

  return (
    <div className="flex flex-col h-[calc(100vh-var(--kv-header-height))] bg-surface overflow-hidden p-5 gap-4">
      <ScheduleToolbar
        employees={employees}
        search={search}
        onSearch={v => { setError(''); setSearch(v) }}
        weekStart={weekStart}
        onWeekChange={v => { setError(''); setWeekStart(v) }}
        viewMode={viewMode}
        onViewMode={v => { setError(''); setViewMode(v) }}
        onImport={() => window.alert('Import lịch làm việc đang được phát triển')}
        onExport={handleExport}
      />

      {error && (
        <div className="px-4 py-2 rounded-md bg-danger-50 text-danger text-md border border-danger/30">{error}</div>
      )}

      <ScheduleGrid
        employees={filteredEmployees}
        weekDays={weekDaysList}
        entries={entries}
        shiftTypes={shiftTypes}
        viewMode={viewMode}
        expectedSalaryByEmployee={expectedSalaryByEmployee}
        onQuickDelete={handleQuickDeleteClick}
        onAddClick={(employee, date) => openModal({ mode: 'add', employee, date })}
        onAddStaff={(date, shift) => openModal({ mode: 'add', date, lockedShift: shift })}
        onEditClick={(employee, date, entry) => openModal({ mode: 'edit', employee, date, entry })}
      />

      {modal && (
        <ScheduleModal
          mode={modal.mode}
          employee={modal.employee}
          date={modal.date}
          entry={modal.entry}
          shiftTypes={shiftTypes}
          availableShiftTypes={availableShiftTypes}
          otherEmployees={employees.filter(e => e.id !== modal.employee?.id)}
          lockedShift={modal.lockedShift}
          staffOptions={lockedShiftStaffOptions}
          error={modalError}
          onClose={closeModal}
          onSave={handleSave}
          onDeleteOccurrence={modal.mode === 'edit' ? handleDeleteOccurrence : undefined}
          onCancelRule={modal.mode === 'edit' ? handleCancelRule : undefined}
          onAddShift={() => { setError(''); setAddShiftOpen(true) }}
        />
      )}

      {addShiftOpen && (
        <ShiftTemplateModal
          shift={null}
          onClose={() => setAddShiftOpen(false)}
          onSaved={() => { setAddShiftOpen(false); void loadStaticData() }}
        />
      )}

      {quickDeleteEntry && (
        <DeleteScheduleModal
          entry={quickDeleteEntry}
          error={quickDeleteError}
          busy={quickDeleteBusy}
          onClose={() => setQuickDeleteEntry(null)}
          onConfirm={scope => void runQuickDelete(quickDeleteEntry, scope)}
        />
      )}
    </div>
  )
}

export default Schedule
