import apiClient from './apiClient'
import type { SalaryType } from './employees'

/* ── Mẫu lương (BR-PAY-01) — reusable rate configs, copy-on-apply into SalarySettingPayload ── */

export interface SalaryTemplateDto {
  id: string
  name: string
  mainSalaryType: SalaryType
  mainBaseWage: number
  mainAdvancedRatesJson: string | null
  overtimeEnabled: boolean
  overtimeRatesJson: string | null
  createdAt: string
  updatedAt: string
}

export interface SalaryTemplatePayload {
  name: string
  mainSalaryType: SalaryType
  mainBaseWage: number
  mainAdvancedRatesJson?: string | null
  overtimeEnabled: boolean
  overtimeRatesJson?: string | null
}

export const listSalaryTemplates = () =>
  apiClient.get<{ data: SalaryTemplateDto[] }>('/payroll/salary-templates')

export const createSalaryTemplate = (req: SalaryTemplatePayload) =>
  apiClient.post<{ data: SalaryTemplateDto }>('/payroll/salary-templates', req)

export const updateSalaryTemplate = (id: string, req: SalaryTemplatePayload) =>
  apiClient.put<{ data: SalaryTemplateDto }>(`/payroll/salary-templates/${id}`, req)

export const deleteSalaryTemplate = (id: string) =>
  apiClient.delete(`/payroll/salary-templates/${id}`)
