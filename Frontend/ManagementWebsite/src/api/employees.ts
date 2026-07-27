import apiClient from './apiClient'

export type EmployeeStatus = 'ACTIVE' | 'INACTIVE'

/** Frontend employee shape after nullable API fields have been normalized for forms and tables. */
export interface Employee {
  id: string
  code: string
  timekeepCode: string
  name: string
  phone: string
  idNumber: string
  note: string
  status: EmployeeStatus
  birthday: string
  gender: string
  address: string
  email: string
  startDate: string
  userId: string
}

export interface EmployeeDto {
  id: string
  code: string
  name: string
  phone: string
  status: EmployeeStatus
  startDate: string | null
  timekeepCode: string | null
  note: string | null
  idNumber: string | null
  birthday: string | null
  gender: string | null
  address: string | null
  email: string | null
  userId: string | null
}

export interface PageMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface EmployeesPage {
  data: EmployeeDto[]
  pagination: PageMeta
}

export interface EmployeeFormPayload {
  name: string
  phone: string
  idNumber?: string
  note?: string
  birthday?: string
  gender?: string
  address?: string
  startDate?: string
  userId?: string
}

export const listEmployees = (params: { page?: number; size?: number; sort?: string; status?: EmployeeStatus } = {}) =>
  apiClient.get<EmployeesPage>('/employees', { params: { page: 0, size: 20, sort: 'code,asc', ...params } })

export const updateEmployee = (id: string, req: Partial<EmployeeFormPayload> & { status?: EmployeeStatus }) =>
  apiClient.put<{ data: EmployeeDto }>(`/employees/${id}`, req)

export const deactivateEmployee = (id: string, acknowledgeWarnings = false) =>
  apiClient.post(`/employees/${id}/deactivate`, null, { params: { acknowledgeWarnings } })

/* ── Deactivation eligibility check (SRS §9 gap #2) ──────────────────────── */
export interface FutureScheduleItem {
  scheduleId: string
  workDate: string
  shiftId: string
  shiftName: string | null
}

export interface UnfinalizedPayslipItem {
  payslipId: string
  payslipCode: string
  payrollSheetId: string
  payrollSheetCode: string | null
  payrollSheetName: string | null
  payrollSheetStatus: string | null
}

export interface OpenPosShiftInfo {
  shiftId: string
  openedAt: string
}

export interface OpenAttendanceInfo {
  scheduleId: string
  shiftName: string | null
  checkInTime: string
}

export interface DeactivationCheckDto {
  blocked: boolean
  futureSchedules: FutureScheduleItem[]
  unfinalizedPayslips: UnfinalizedPayslipItem[]
  hasOpenPosShift: boolean
  openPosShiftInfo: OpenPosShiftInfo | null
  hasOpenAttendanceToday: boolean
  openAttendanceInfo: OpenAttendanceInfo | null
}

export const getDeactivationCheck = (id: string) =>
  apiClient.get<{ data: DeactivationCheckDto }>(`/employees/${id}/deactivation-check`)

/* ── Self-service ("Hồ sơ của tôi") ──────────────────────────────────────── */
// id/code are null until the employee's first save — everything else is EmployeeDto-shaped.
export interface MyEmployeeProfileDto {
  id: string | null
  code: string | null
  name: string
  phone: string
  status: EmployeeStatus | null
  startDate: string | null
  note: string | null
  idNumber: string | null
  birthday: string | null
  gender: string | null
  address: string | null
  email: string | null
  userId: string | null
}

export const getMyEmployeeProfile = () =>
  apiClient.get<{ data: MyEmployeeProfileDto }>('/employees/me')

export const saveMyEmployeeProfile = (req: EmployeeFormPayload & { email?: string }) =>
  apiClient.post<{ data: MyEmployeeProfileDto }>('/employees/me', req)

/* ── Thiết lập lương (UC-EMP-07 / UC-PAY-01) ─────────────────────────────── */
export type SalaryType = 'SHIFT' | 'HOURLY' | 'FIXED'

export interface SalarySettingDto {
  id: string | null // null = employee has no salary setting yet (server default)
  employeeId: string
  mainSalaryType: SalaryType
  mainBaseWage: number
  mainAdvancedRatesJson: string | null
  overtimeEnabled: boolean
  overtimeRatesJson: string | null
  salaryTemplate: string | null
}

export interface SalarySettingPayload {
  mainSalaryType: SalaryType
  mainBaseWage: number
  mainAdvancedRatesJson?: string | null
  overtimeEnabled: boolean
  overtimeRatesJson?: string | null
  salaryTemplate?: string | null
}

export const getSalarySetting = (employeeId: string) =>
  apiClient.get<{ data: SalarySettingDto }>(`/employees/${employeeId}/salary-setting`)

export const putSalarySetting = (employeeId: string, req: SalarySettingPayload) =>
  apiClient.put<{ data: SalarySettingDto }>(`/employees/${employeeId}/salary-setting`, req)

/** Adapts a server DTO to the app's local Employee shape. */
export const toEmployee = (dto: EmployeeDto): Employee => ({
  id: dto.id,
  code: dto.code,
  timekeepCode: dto.timekeepCode ?? '',
  name: dto.name,
  phone: dto.phone,
  idNumber: dto.idNumber ?? '',
  note: dto.note ?? '',
  status: dto.status,
  birthday: dto.birthday ?? '',
  gender: dto.gender ?? '',
  address: dto.address ?? '',
  email: dto.email ?? '',
  startDate: dto.startDate ?? '',
  userId: dto.userId ?? '',
})
