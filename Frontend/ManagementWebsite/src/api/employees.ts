import apiClient from './apiClient'
import type { Employee } from '../data/mockData'

export type EmployeeStatus = 'ACTIVE' | 'INACTIVE'

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

export const createEmployee = (req: EmployeeFormPayload) =>
  apiClient.post<{ data: EmployeeDto }>('/employees', req)

export const updateEmployee = (id: string, req: Partial<EmployeeFormPayload> & { status?: EmployeeStatus }) =>
  apiClient.put<{ data: EmployeeDto }>(`/employees/${id}`, req)

export const deactivateEmployee = (id: string) =>
  apiClient.post(`/employees/${id}/deactivate`)

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
