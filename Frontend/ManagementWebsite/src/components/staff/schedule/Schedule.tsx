import { useCallback, useEffect, useMemo, useState } from 'react'
import ScheduleToolbar from './ScheduleToolbar'
import ScheduleGrid from './ScheduleGrid'
import ScheduleModal from './ScheduleModal'
import type { ScheduleSavePayload } from './ScheduleModal'
import ShiftTemplateModal from './ShiftTemplateModal'
import { startOfWeek, weekDays as buildWeekDays, entriesOn, toYMD } from './scheduleUtils'
import { listShifts, listSchedules, createSchedules, deleteSchedule, cancelScheduleRule, formatTime } from '../../../api/attendance'
import type { ShiftDto, ScheduleDto } from '../../../api/attendance'
import { listEmployees } from '../../../api/employees'
import { ApiError } from '../../../services/api'

/** UI-local employee summary shared by the schedule sub-components. */
export interface StaffSummary { id: string; fullName: string; code: string }

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
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [viewMode, setViewMode] = useState<'employee' | 'shift'>('employee')
  const [modal, setModal] = useState<ModalState | null>(null)
  const [modalError, setModalError] = useState('')
  const [addShiftOpen, setAddShiftOpen] = useState(false)

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
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không tải được dữ liệu lịch làm việc.')
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
      setModalError(err instanceof ApiError ? err.message : 'Không thể lưu lịch làm việc.')
    }
  }

  const handleDeleteOccurrence = async () => {
    if (!modal?.entry) return
    try {
      await deleteSchedule(modal.entry.id)
      await loadStaticData()
      closeModal()
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : 'Không thể xóa lịch làm việc.')
    }
  }

  const handleCancelRule = async () => {
    if (!modal?.entry?.ruleId) return
    try {
      await cancelScheduleRule(modal.entry.ruleId)
      await loadStaticData()
      closeModal()
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : 'Không thể ngừng lặp lịch làm việc.')
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
        onSearch={setSearch}
        weekStart={weekStart}
        onWeekChange={setWeekStart}
        viewMode={viewMode}
        onViewMode={setViewMode}
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
        onAddClick={(employee, date) => setModal({ mode: 'add', employee, date })}
        onAddStaff={(date, shift) => setModal({ mode: 'add', date, lockedShift: shift })}
        onEditClick={(employee, date, entry) => setModal({ mode: 'edit', employee, date, entry })}
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
          onAddShift={() => setAddShiftOpen(true)}
        />
      )}

      {addShiftOpen && (
        <ShiftTemplateModal
          shift={null}
          onClose={() => setAddShiftOpen(false)}
          onSaved={() => { setAddShiftOpen(false); void loadStaticData() }}
        />
      )}
    </div>
  )
}

export default Schedule
