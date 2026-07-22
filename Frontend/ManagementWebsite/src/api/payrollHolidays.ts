import apiClient from './apiClient'

/* ── Ngày lễ, Tết (BR-PAY-04) — holiday calendar feeding SalaryCalculator's "holiday" rate ── */

export interface PayrollHolidayDto {
  id: string
  name: string
  holidayDate: string // 'YYYY-MM-DD'
  createdAt: string
  updatedAt: string
}

export interface PayrollHolidayPayload {
  name: string
  holidayDate: string
}

export const listPayrollHolidays = () =>
  apiClient.get<{ data: PayrollHolidayDto[] }>('/payroll/holidays')

export const createPayrollHoliday = (req: PayrollHolidayPayload) =>
  apiClient.post<{ data: PayrollHolidayDto }>('/payroll/holidays', req)

export const updatePayrollHoliday = (id: string, req: PayrollHolidayPayload) =>
  apiClient.put<{ data: PayrollHolidayDto }>(`/payroll/holidays/${id}`, req)

export const deletePayrollHoliday = (id: string) =>
  apiClient.delete(`/payroll/holidays/${id}`)
