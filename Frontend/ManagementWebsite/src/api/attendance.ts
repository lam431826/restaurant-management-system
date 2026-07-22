import apiClient from './apiClient'

/* ── enums (string unions mirroring backend) ─────────────────────────────── */
export type WorkShiftStatus = 'ACTIVE' | 'INACTIVE'
export type AttendanceType = 'PRESENT' | 'LEAVE_APPROVED' | 'LEAVE_UNAPPROVED'
export type ManualTimeMode = 'SHIFT_TIME' | 'ACTUAL_TIME'
export type TimesheetStatus = 'SCHEDULED' | 'UNMARKED' | 'OFF' | 'MISSING' | 'LATE_EARLY' | 'ON_TIME'

export const SHIFT_STATUS_LABEL: Record<WorkShiftStatus, string> = { ACTIVE: 'Hoạt động', INACTIVE: 'Ngừng hoạt động' }
export const ATTENDANCE_TYPE_LABEL: Record<AttendanceType, string> = {
  PRESENT: 'Đi làm', LEAVE_APPROVED: 'Nghỉ có phép', LEAVE_UNAPPROVED: 'Nghỉ không phép',
}
export const TIME_MODE_LABEL: Record<ManualTimeMode, string> = {
  SHIFT_TIME: 'Theo giờ bắt đầu/kết thúc ca', ACTUAL_TIME: 'Theo giờ chấm công thực tế',
}
export const TIMESHEET_STATUS_LABEL: Record<TimesheetStatus, string> = {
  SCHEDULED: 'Chưa diễn ra', UNMARKED: 'Chưa chấm công', OFF: 'Nghỉ làm',
  MISSING: 'Chấm công thiếu', LATE_EARLY: 'Đi muộn / Về sớm', ON_TIME: 'Đúng giờ',
}
export const TIMESHEET_STATUS_COLOR: Record<TimesheetStatus, string> = {
  SCHEDULED: '#9AA5B1', UNMARKED: '#F5A623', OFF: '#9AA5B1',
  MISSING: '#F0483E', LATE_EARLY: '#7C4DFF', ON_TIME: '#0070F4',
}

/* ── DTOs ────────────────────────────────────────────────────────────────── */
export interface ShiftDto {
  id: string
  name: string
  startTime: string // 'HH:mm:ss'
  endTime: string
  checkInWindowStart: string | null
  checkInWindowEnd: string | null
  applyScope: string | null
  status: WorkShiftStatus
}

export interface ScheduleDto {
  id: string
  employeeId: string
  employeeCode: string | null
  employeeName: string | null
  shiftId: string
  shiftName: string | null
  shiftStartTime: string | null
  shiftEndTime: string | null
  workDate: string // 'YYYY-MM-DD'
  ruleId: string | null
  ruleStartDate: string | null
  ruleEndDate: string | null
  substituteEmployeeId: string | null
  substituteEmployeeName: string | null
}

export interface AttendanceRecordDto {
  id: string
  scheduleId: string
  type: AttendanceType
  actualCheckIn: string | null
  actualCheckOut: string | null
  workedMinutes: number
  lateMinutes: number
  earlyLeaveMinutes: number
  otMinutes: number
  workCredit: number
  autoFilled: boolean
  note: string | null
}

export interface TimesheetCellDto {
  scheduleId: string
  employeeId: string
  employeeCode: string | null
  employeeName: string | null
  shiftId: string
  shiftName: string | null
  shiftStartTime: string | null
  shiftEndTime: string | null
  workDate: string
  displayStatus: TimesheetStatus
  record: AttendanceRecordDto | null
  violations: ViolationDto[]
  penaltyTotal: number
  substituteEmployeeId: string | null
  substituteEmployeeName: string | null
}

export interface AttendanceSettingsDto {
  halfDayEnabled: boolean
  halfDayMinMinutes: number
  halfDayMaxMinutes: number
  lateEnabled: boolean
  lateGraceMinutes: number
  earlyLeaveEnabled: boolean
  earlyLeaveGraceMinutes: number
  otBeforeEnabled: boolean
  otBeforeMinMinutes: number
  otAfterEnabled: boolean
  otAfterMinMinutes: number
  mergedShiftEnabled: boolean
  mergedShiftMaxCount: number
  mergedShiftMaxBreakMinutes: number
  manualDefaultTimeMode: ManualTimeMode
}

export interface ViolationTypeDto {
  id: string
  name: string
  penaltyAmount: number
}

export interface ViolationDto {
  id: string
  violationTypeId: string
  violationTypeName: string | null
  count: number
  appliedPenalty: number
}

export interface AttendanceSummaryRowDto {
  employeeId: string
  employeeCode: string | null
  employeeName: string | null
  scheduledCount: number
  presentCount: number
  leaveApprovedCount: number
  leaveUnapprovedCount: number
  workCreditTotal: number
  lateMinutesTotal: number
  earlyLeaveMinutesTotal: number
  otMinutesTotal: number
  penaltyTotal: number
}

/* ── payloads ────────────────────────────────────────────────────────────── */
export interface ShiftPayload {
  name: string
  startTime: string // 'HH:mm' or 'HH:mm:ss'
  endTime: string
  checkInWindowStart?: string | null
  checkInWindowEnd?: string | null
  applyScope?: string | null
  status?: WorkShiftStatus
}

/** Mirrors the old roster AssignmentCreate shape so ScheduleModal maps 1:1. */
export interface ScheduleCreatePayload {
  employeeIds: string[]
  shiftIds: string[]
  date: string
  repeatWeekly: boolean
  repeatDays: number[]
  repeatEnd: string | null
  workOnHolidays: boolean
}

export interface AttendanceUpsertPayload {
  type: AttendanceType
  /** 'YYYY-MM-DD'; pins that side to the schedule's work date or the day after. Omit/null falls back to the server's legacy overnight heuristic. */
  checkInDate?: string | null
  checkInTime?: string | null
  checkOutDate?: string | null
  checkOutTime?: string | null
  substituteEmployeeId?: string | null
  note?: string | null
  /** Manual OT override (BR-AT-10); null on either side keeps the automatic calculation. */
  otBeforeMinutes?: number | null
  otAfterMinutes?: number | null
}

export interface BulkAttendancePayload {
  scheduleIds: string[]
  type: AttendanceType
  checkInTime?: string | null
  checkOutTime?: string | null
  merged?: boolean
  substituteEmployeeId?: string | null
  note?: string | null
}

export interface ViolationRowPayload {
  violationTypeId: string
  count: number
  appliedPenalty?: number | null
}

/* ── calls ───────────────────────────────────────────────────────────────── */
export const listShifts = (params: { status?: WorkShiftStatus } = {}) =>
  apiClient.get<{ data: ShiftDto[] }>('/attendance/shifts', { params })

export const createShift = (req: ShiftPayload) =>
  apiClient.post<{ data: ShiftDto }>('/attendance/shifts', req)

export const updateShift = (id: string, req: ShiftPayload) =>
  apiClient.put<{ data: ShiftDto }>(`/attendance/shifts/${id}`, req)

export const deleteShift = (id: string) =>
  apiClient.delete(`/attendance/shifts/${id}`)

export const listSchedules = (start: string, end: string, employeeId?: string) =>
  apiClient.get<{ data: ScheduleDto[] }>('/attendance/schedules', { params: { start, end, employeeId } })

export const createSchedules = (req: ScheduleCreatePayload) =>
  apiClient.post<{ data: ScheduleDto[] }>('/attendance/schedules', req)

export const deleteSchedule = (scheduleId: string) =>
  apiClient.delete(`/attendance/schedules/${scheduleId}`)

export const cancelScheduleRule = (ruleId: string, from?: string) =>
  apiClient.delete(`/attendance/schedules/rules/${ruleId}`, { params: from ? { from } : undefined })

export const getTimesheet = (start: string, end: string) =>
  apiClient.get<{ data: TimesheetCellDto[] }>('/attendance/timesheet', { params: { start, end } })

/* ── Self-service ("Lịch làm việc") ───────────────────────────────────────── */
export const getMyTimesheet = (start: string, end: string) =>
  apiClient.get<{ data: TimesheetCellDto[] }>('/attendance/timesheet/me', { params: { start, end } })

export const checkIn = (scheduleId: string) =>
  apiClient.post<{ data: AttendanceRecordDto }>(`/attendance/schedules/${scheduleId}/check-in`)

export const checkOut = (scheduleId: string) =>
  apiClient.post<{ data: AttendanceRecordDto }>(`/attendance/schedules/${scheduleId}/check-out`)

export const upsertRecord = (scheduleId: string, req: AttendanceUpsertPayload) =>
  apiClient.put<{ data: AttendanceRecordDto }>(`/attendance/schedules/${scheduleId}/record`, req)

export const bulkMark = (req: BulkAttendancePayload) =>
  apiClient.post<{ data: AttendanceRecordDto[] }>('/attendance/records/bulk', req)

export const getRecord = (id: string) =>
  apiClient.get<{ data: AttendanceRecordDto }>(`/attendance/records/${id}`)

export const deleteRecord = (id: string) =>
  apiClient.delete(`/attendance/records/${id}`)

export const listViolations = (recordId: string) =>
  apiClient.get<{ data: ViolationDto[] }>(`/attendance/records/${recordId}/violations`)

export const saveViolations = (recordId: string, rows: ViolationRowPayload[]) =>
  apiClient.put<{ data: ViolationDto[] }>(`/attendance/records/${recordId}/violations`, rows)

export const listViolationTypes = () =>
  apiClient.get<{ data: ViolationTypeDto[] }>('/attendance/violation-types')

export const createViolationType = (name: string, penaltyAmount: number) =>
  apiClient.post<{ data: ViolationTypeDto }>('/attendance/violation-types', { name, penaltyAmount })

export const updateViolationType = (id: string, name: string, penaltyAmount: number) =>
  apiClient.put<{ data: ViolationTypeDto }>(`/attendance/violation-types/${id}`, { name, penaltyAmount })

export const deleteViolationType = (id: string) =>
  apiClient.delete(`/attendance/violation-types/${id}`)

export const getSettings = () =>
  apiClient.get<{ data: AttendanceSettingsDto }>('/attendance/settings')

export const updateSettings = (req: AttendanceSettingsDto) =>
  apiClient.put<{ data: AttendanceSettingsDto }>('/attendance/settings', req)

export const getSummary = (start: string, end: string) =>
  apiClient.get<{ data: AttendanceSummaryRowDto[] }>('/attendance/summary', { params: { start, end } })

/* ── shared helpers ──────────────────────────────────────────────────────── */
/** Backend LocalTime serializes as 'HH:mm:ss' — trim to 'HH:mm' for display/inputs. */
export const formatTime = (t: string | null | undefined) => (t ? t.slice(0, 5) : '')

export const toIsoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
