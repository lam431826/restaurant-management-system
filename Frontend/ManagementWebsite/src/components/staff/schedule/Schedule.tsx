import { useCallback, useEffect, useMemo, useState } from 'react'
import ScheduleToolbar from './ScheduleToolbar'
import ScheduleGrid from './ScheduleGrid'
import ScheduleModal from './ScheduleModal'
import type { ScheduleSavePayload } from './ScheduleModal'
import TemplateManagerModal from './TemplateManagerModal'
import { startOfWeek, weekDays as buildWeekDays, entriesOn, toYMD } from './scheduleUtils'
import {
  listStaff, listTemplates, listAssignments, createAssignments, updateAssignment, deleteAssignment,
  getWeekStatus, publishWeek,
} from '../../../services/rosterService'
import type { StaffSummary, ShiftTemplate, Assignment, WeekStatus } from '../../../services/rosterService'
import { ApiError } from '../../../services/api'

interface ModalState {
  mode: 'add' | 'edit'
  employee?: StaffSummary
  date: Date
  entry?: Assignment
  // Shift-first add ("Xem theo ca" → Thêm nhân viên): the shift the chosen staff are added to.
  lockedShift?: ShiftTemplate
}

const Schedule = () => {
  const [employees, setEmployees] = useState<StaffSummary[]>([])
  const [shiftTypes, setShiftTypes] = useState<ShiftTemplate[]>([])
  const [entries, setEntries] = useState<Assignment[]>([])
  const [weekPub, setWeekPub] = useState<WeekStatus | null>(null)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [viewMode, setViewMode] = useState<'employee' | 'shift'>('employee')
  const [modal, setModal] = useState<ModalState | null>(null)
  const [modalError, setModalError] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)

  const weekDaysList = useMemo(() => buildWeekDays(weekStart), [weekStart])
  const weekStartKey = toYMD(weekStart)

  const loadStaticData = useCallback(async () => {
    try {
      const [staff, templates, assignments] = await Promise.all([listStaff(), listTemplates(), listAssignments()])
      setEmployees(staff)
      setShiftTypes(templates)
      setEntries(assignments)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không tải được dữ liệu lịch làm việc.')
    }
  }, [])

  const loadWeekStatus = useCallback(async () => {
    try {
      setWeekPub(await getWeekStatus(weekStartKey))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không tải được trạng thái xuất bản.')
    }
  }, [weekStartKey])

  useEffect(() => { void loadStaticData() }, [loadStaticData])
  useEffect(() => { void loadWeekStatus() }, [loadWeekStatus])

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return employees
    return employees.filter(e => e.fullName.toLowerCase().includes(q))
  }, [employees, search])

  const closeModal = () => { setModal(null); setModalError('') }

  const handlePublish = async () => {
    try {
      setWeekPub(await publishWeek(weekStartKey))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể xuất bản lịch làm việc.')
    }
  }

  const handleSave = async (payload: ScheduleSavePayload) => {
    if (!modal) return
    try {
      if (modal.mode === 'edit' && modal.entry) {
        await updateAssignment(modal.entry.id, {
          repeatWeekly: payload.repeatWeekly,
          repeatDays: payload.repeatDays,
          repeatEnd: payload.repeatEnd,
          holidayWork: payload.holidayWork,
        })
      } else if (modal.lockedShift) {
        // Shift-first add: the chosen staff are all added to the locked shift.
        await createAssignments({
          employeeIds: payload.staffIds ?? [],
          date: toYMD(modal.date),
          shiftTemplateIds: [modal.lockedShift.id],
          repeatWeekly: payload.repeatWeekly,
          repeatDays: payload.repeatDays,
          repeatEnd: payload.repeatEnd,
          holidayWork: payload.holidayWork,
        })
      } else if (modal.employee) {
        await createAssignments({
          employeeIds: [modal.employee.id, ...payload.applyToEmployeeIds],
          date: toYMD(modal.date),
          shiftTemplateIds: payload.shiftIds,
          repeatWeekly: payload.repeatWeekly,
          repeatDays: payload.repeatDays,
          repeatEnd: payload.repeatEnd,
          holidayWork: payload.holidayWork,
        })
      }
      await loadStaticData()
      closeModal()
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : 'Không thể lưu lịch làm việc.')
    }
  }

  const handleDelete = async () => {
    if (!modal?.entry) return
    try {
      await deleteAssignment(modal.entry.id)
      await loadStaticData()
      closeModal()
    } catch (err) {
      setModalError(err instanceof ApiError ? err.message : 'Không thể xóa lịch làm việc.')
    }
  }

  const handleExport = () => {
    const header = ['Mã nhân viên', 'Tên nhân viên', 'Ngày', 'Ca làm việc', 'Giờ làm']
    const rows = filteredEmployees.flatMap(emp =>
      weekDaysList.flatMap(d =>
        entriesOn(entries, emp.id, d).map(e => {
          const st = shiftTypes.find(s => s.id === e.shiftTemplateId)
          return [emp.id, emp.fullName, toYMD(d), st?.name ?? '', st ? `${st.startTime} - ${st.endTime}` : '']
        })
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
  const availableShiftTypes = shiftTypes.filter(st => !dayEntriesForModal.some(e => e.shiftTemplateId === st.id))
  // Shift-first add: only offer staff not already on this shift that day.
  const lockedShiftStaffOptions = modal?.lockedShift
    ? employees.filter(emp => !entriesOn(entries, emp.id, modal.date).some(e => e.shiftTemplateId === modal.lockedShift!.id))
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

      {weekPub && (weekPub.status === 'DRAFT' ? (
        <div className="flex items-center justify-between gap-4 px-4 py-2.5 rounded-md bg-warning-50 border border-warning/30">
          <span className="text-md text-warning-700 font-medium">Lịch tuần này đang ở trạng thái Nháp — nhân viên chưa thể xem.</span>
          <button className="kv-btn kv-btn-primary h-9" onClick={handlePublish}>Xuất bản</button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4 px-4 py-2.5 rounded-md bg-success-50 border border-success/30">
          <span className="text-md text-success-700 font-medium">Đã xuất bản (phiên bản {weekPub.version}) — nhân viên đã được thông báo.</span>
          <button className="kv-btn kv-btn-outline-neutral h-9" onClick={handlePublish}>Xuất bản lại</button>
        </div>
      ))}

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
          onDelete={modal.mode === 'edit' ? handleDelete : undefined}
          onManageTemplates={() => setShowTemplates(true)}
        />
      )}

      {showTemplates && (
        <TemplateManagerModal
          templates={shiftTypes}
          onClose={() => setShowTemplates(false)}
          onChanged={loadStaticData}
        />
      )}
    </div>
  )
}

export default Schedule
