import { api } from './api'
import type { ApiResponse } from './api'

// ── Types (mirror backend DTOs, module com.rms.restaurant.module.roster) ──

export interface ShiftTemplate {
  id: string
  name: string
  startTime: string // 'HH:mm:ss'
  endTime: string
  breakMinutes: number
  headcountTarget: number
  wage: number
}
export type ShiftTemplateInput = Omit<ShiftTemplate, 'id'>

export interface Assignment {
  id: string
  employeeId: string
  shiftTemplateId: string
  date: string // 'YYYY-MM-DD'
  repeatWeekly: boolean
  repeatDays: number[] // ISO-8601 weekday, 1=Monday..7=Sunday
  repeatEnd: string | null
  holidayWork: boolean
  excludedDates: string[]
}
export interface AssignmentCreateInput {
  employeeIds: string[]
  date: string
  shiftTemplateIds: string[]
  repeatWeekly: boolean
  repeatDays: number[]
  repeatEnd: string | null
  holidayWork: boolean
}
export interface AssignmentUpdateInput {
  repeatWeekly: boolean
  repeatDays: number[]
  repeatEnd: string | null
  holidayWork: boolean
}

export type WeekStatusValue = 'DRAFT' | 'PUBLISHED'
export interface WeekStatus {
  weekStart: string
  status: WeekStatusValue
  version: number
  publishedAt: string | null
}

export type AttendanceStatus =
  | 'SCHEDULED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'NO_SHOW' | 'LEAVE'
  | 'EARLY_LEAVE' | 'MISSING_CLOCKOUT'
export interface Attendance {
  id: string | null
  employeeId: string
  date: string
  shiftTemplateId: string
  assignmentId: string | null
  status: AttendanceStatus
  checkInAt: string | null
  checkOutAt: string | null
  workedMinutes: number | null
  late: boolean
  clockOutReason: string | null
}

export type ShiftRequestType = 'SWAP' | 'LEAVE'
export type ShiftRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export interface ShiftRequest {
  id: string
  type: ShiftRequestType
  requesterId: string
  date: string
  shiftTemplateId: string
  targetEmployeeId: string | null
  reason: string
  status: ShiftRequestStatus
  managerNote: string | null
  createdAt: string
}
export interface RequestCreateInput {
  type: ShiftRequestType
  date: string
  shiftTemplateId: string
  targetEmployeeId?: string | null
  reason: string
}

export interface StaffSummary {
  id: string
  fullName: string
  role: string
}

export interface AttendanceReportRow {
  employeeId: string
  employeeName: string
  shiftCount: number
  workedHours: number
  lateCount: number
  noShowCount: number
}

// ── Staff picker ────────────────────────────────────────────────────────

export const listStaff = (): Promise<StaffSummary[]> =>
  api.get<ApiResponse<StaffSummary[]>>('/api/roster/staff').then(r => r.data)

// ── Shift templates (WS-01) ────────────────────────────────────────────

export const listTemplates = (): Promise<ShiftTemplate[]> =>
  api.get<ApiResponse<ShiftTemplate[]>>('/api/roster/templates').then(r => r.data)

export const createTemplate = (input: ShiftTemplateInput): Promise<ShiftTemplate> =>
  api.post<ApiResponse<ShiftTemplate>>('/api/roster/templates', input).then(r => r.data)

export const updateTemplate = (id: string, input: ShiftTemplateInput): Promise<ShiftTemplate> =>
  api.put<ApiResponse<ShiftTemplate>>(`/api/roster/templates/${id}`, input).then(r => r.data)

export const deleteTemplate = (id: string): Promise<void> =>
  api.del<void>(`/api/roster/templates/${id}`)

// ── Assignments (WS-03, BR-WS-02/05 enforced server-side) ──────────────

export const listAssignments = (): Promise<Assignment[]> =>
  api.get<ApiResponse<Assignment[]>>('/api/roster/assignments').then(r => r.data)

export const createAssignments = (input: AssignmentCreateInput): Promise<Assignment[]> =>
  api.post<ApiResponse<Assignment[]>>('/api/roster/assignments', input).then(r => r.data)

export const updateAssignment = (id: string, input: AssignmentUpdateInput): Promise<Assignment> =>
  api.put<ApiResponse<Assignment>>(`/api/roster/assignments/${id}`, input).then(r => r.data)

export const deleteAssignment = (id: string): Promise<void> =>
  api.del<void>(`/api/roster/assignments/${id}`)

// ── Publish workflow (WS-02, BR-WS-03/04) ──────────────────────────────

export const getWeekStatus = (weekStart: string): Promise<WeekStatus> =>
  api.get<ApiResponse<WeekStatus>>(`/api/roster/weeks/${weekStart}/status`).then(r => r.data)

export const publishWeek = (weekStart: string): Promise<WeekStatus> =>
  api.post<ApiResponse<WeekStatus>>(`/api/roster/weeks/${weekStart}/publish`).then(r => r.data)

// ── Attendance / clock in-out (WS-04/07/08/09, self-service) ──────────

export const listMyAttendance = (from: string, to: string): Promise<Attendance[]> =>
  api.get<ApiResponse<Attendance[]>>('/api/roster/attendance/me', { from, to }).then(r => r.data)

export const clockIn = (date: string, shiftTemplateId: string): Promise<Attendance> =>
  api.post<ApiResponse<Attendance>>('/api/roster/attendance/clock-in', { date, shiftTemplateId }).then(r => r.data)

// BR-WS-11: reason is required when clocking out before the scheduled shift end.
export const clockOut = (date: string, shiftTemplateId: string, reason?: string): Promise<Attendance> =>
  api.post<ApiResponse<Attendance>>('/api/roster/attendance/clock-out',
    { date, shiftTemplateId, reason: reason ?? null }).then(r => r.data)

// BR-WS-14: manager inbox of MISSING_CLOCKOUT records and the resolve action.
export const listMissingClockouts = (from: string, to: string): Promise<Attendance[]> =>
  api.get<ApiResponse<Attendance[]>>('/api/roster/attendance/missing-clockout', { from, to }).then(r => r.data)

export const resolveMissingClockout = (id: string, checkOutAt: string, reason: string): Promise<Attendance> =>
  api.post<ApiResponse<Attendance>>(`/api/roster/attendance/${id}/resolve-clockout`,
    { checkOutAt, reason }).then(r => r.data)

// ── Swap / Leave requests (WS-05/06, BR-WS-06 enforced server-side) ────

export const createRequest = (input: RequestCreateInput): Promise<ShiftRequest> =>
  api.post<ApiResponse<ShiftRequest>>('/api/roster/requests', input).then(r => r.data)

export const listRequests = (): Promise<ShiftRequest[]> =>
  api.get<ApiResponse<ShiftRequest[]>>('/api/roster/requests').then(r => r.data)

export const approveRequest = (id: string, managerNote: string): Promise<ShiftRequest> =>
  api.post<ApiResponse<ShiftRequest>>(`/api/roster/requests/${id}/approve`, { managerNote }).then(r => r.data)

export const rejectRequest = (id: string, managerNote: string): Promise<ShiftRequest> =>
  api.post<ApiResponse<ShiftRequest>>(`/api/roster/requests/${id}/reject`, { managerNote }).then(r => r.data)

// ── Attendance / labor report (WS-09, BR-WS-10) ────────────────────────

export const getAttendanceReport = (from: string, to: string): Promise<AttendanceReportRow[]> =>
  api.get<ApiResponse<AttendanceReportRow[]>>('/api/roster/reports/attendance', { from, to }).then(r => r.data)
