import apiClient from './apiClient'
import type { PageMeta } from './employees'

/* ── enums (string unions mirroring backend) ─────────────────────────────── */
export type PayrollTerm = 'MONTHLY' | 'CUSTOM'
export type PayrollScope = 'ALL' | 'CUSTOM'
export type PayrollSheetStatus = 'GENERATING' | 'DRAFT' | 'FINALIZED' | 'CANCELLED'
export type SalaryPaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID'
export type PayslipStatus = 'ACTIVE' | 'CANCELLED'
export type SalaryPaymentMethod = 'CASH' | 'TRANSFER'
export type SalaryType = 'SHIFT' | 'HOURLY' | 'FIXED'
export type ReloadMode = 'FULL' | 'BY_WORKDAY'

export const SHEET_STATUS_LABEL: Record<PayrollSheetStatus, string> = {
  GENERATING: 'Đang tạo',
  DRAFT: 'Tạm tính',
  FINALIZED: 'Đã chốt lương',
  CANCELLED: 'Đã hủy',
}
export const TERM_LABEL: Record<PayrollTerm, string> = { MONTHLY: 'Hàng tháng', CUSTOM: 'Tùy chọn' }
export const SCOPE_LABEL: Record<PayrollScope, string> = { ALL: 'Tất cả nhân viên', CUSTOM: 'Tùy chọn' }
export const METHOD_LABEL: Record<SalaryPaymentMethod, string> = { CASH: 'Tiền mặt', TRANSFER: 'Chuyển khoản' }
export const SALARY_TYPE_LABEL: Record<SalaryType, string> = {
  SHIFT: 'Theo ca làm việc',
  HOURLY: 'Theo giờ làm việc',
  FIXED: 'Cố định',
}
export const ATTENDANCE_STATUS_LABEL: Record<string, string> = {
  // SRS_AT attendance types (current attendance source)
  PRESENT: 'Đi làm', LEAVE_APPROVED: 'Nghỉ có phép', LEAVE_UNAPPROVED: 'Nghỉ không phép',
  // Legacy roster statuses — kept so historical payslip snapshots still render
  SCHEDULED: 'Chưa diễn ra', CHECKED_IN: 'Đang làm', CHECKED_OUT: 'Hoàn thành',
  NO_SHOW: 'Vắng mặt', LEAVE: 'Nghỉ phép', EARLY_LEAVE: 'Về sớm', MISSING_CLOCKOUT: 'Thiếu chấm công ra',
}
export const PAYSLIP_PAYMENT_STATUS_LABEL: Record<SalaryPaymentStatus, string> = {
  UNPAID: 'Chưa thanh toán',
  PARTIAL: 'Thanh toán một phần',
  PAID: 'Đã thanh toán',
}

/* ── DTOs ────────────────────────────────────────────────────────────────── */
export interface PayrollSheetDto {
  id: string
  code: string
  name: string
  term: PayrollTerm
  periodStart: string
  periodEnd: string
  scope: PayrollScope
  status: PayrollSheetStatus
  paymentStatus: SalaryPaymentStatus
  employeeCount: number
  total: number
  paid: number
  remaining: number
  note: string | null
  createdBy: string | null
  finalizedBy: string | null
  finalizedAt: string | null
  dataRefreshedAt: string | null
  createdAt: string | null
  updatedAt: string | null
}

export interface PayslipRowDto {
  id: string
  code: string
  employeeId: string
  employeeCode: string
  employeeName: string
  salaryType: SalaryType | null
  mainSalary: number
  overtimeSalary: number
  deduction: number
  total: number
  paidAmount: number
  remaining: number
  paymentStatus: SalaryPaymentStatus
  status: PayslipStatus
  shiftCount: number
  workedMinutes: number
  otMinutes: number
  mainOverridden: boolean
  overtimeOverridden: boolean
  deductionOverridden: boolean
}

export interface AttendanceDetailRowDto {
  date: string
  shiftName: string | null
  status: string
  checkInAt: string | null
  checkOutAt: string | null
  workedMinutes: number | null
  otMinutes: number | null
  dayType: string | null
  rateApplied: string | null
  amount: number
  note: string | null
}

export interface PaymentDto {
  id: string
  voucherCode: string
  payslipId: string
  payslipCode: string | null
  employeeName: string | null
  amount: number
  method: SalaryPaymentMethod
  paidAt: string
  note: string | null
  createdBy: string | null
}

export interface PayslipDetailDto extends Omit<PayslipRowDto, 'mainOverridden' | 'overtimeOverridden' | 'deductionOverridden'> {
  sheetId: string
  sheetCode: string
  sheetName: string
  periodStart: string
  periodEnd: string
  sheetStatus: PayrollSheetStatus
  attendance: AttendanceDetailRowDto[]
  payments: PaymentDto[]
}

export interface SheetsPage {
  data: PayrollSheetDto[]
  pagination: PageMeta
}

export interface CreateSheetPayload {
  name?: string
  term: PayrollTerm
  periodStart: string
  periodEnd: string
  scope: PayrollScope
  employeeIds?: string[]
  note?: string
}

export interface DraftRowPayload {
  payslipId: string
  mainSalary?: number
  overtimeSalary?: number
  deduction?: number
}

export interface PayPayload {
  paidAt: string
  method: SalaryPaymentMethod
  note?: string
  items: { payslipId: string; amount: number }[]
}

/* ── calls ───────────────────────────────────────────────────────────────── */
export const listSheets = (params: {
  search?: string
  term?: PayrollTerm
  statuses?: PayrollSheetStatus[]
  page?: number
  size?: number
  sort?: string
} = {}) =>
  apiClient.get<SheetsPage>('/payroll/sheets', {
    params: { page: 0, size: 15, sort: 'createdAt,desc', ...params },
    paramsSerializer: { indexes: null },
  })

export const createSheet = (req: CreateSheetPayload) =>
  apiClient.post<{ data: PayrollSheetDto }>('/payroll/sheets', req)

export const getSheet = (id: string) =>
  apiClient.get<{ data: PayrollSheetDto }>(`/payroll/sheets/${id}`)

export const listSheetPayslips = (id: string) =>
  apiClient.get<{ data: PayslipRowDto[] }>(`/payroll/sheets/${id}/payslips`)

export const saveDraft = (id: string, rows: DraftRowPayload[]) =>
  apiClient.put<{ data: PayslipRowDto[] }>(`/payroll/sheets/${id}/payslips`, { rows })

export const reloadSheet = (id: string, mode: ReloadMode) =>
  apiClient.post<{ data: PayrollSheetDto }>(`/payroll/sheets/${id}/reload`, { mode })

export const finalizeSheet = (id: string) =>
  apiClient.post<{ data: PayrollSheetDto }>(`/payroll/sheets/${id}/finalize`)

export const cancelSheet = (id: string) =>
  apiClient.post(`/payroll/sheets/${id}/cancel`)

export const paySheet = (id: string, req: PayPayload) =>
  apiClient.post<{ data: PaymentDto[] }>(`/payroll/sheets/${id}/payments`, req)

export const listSheetPayments = (id: string) =>
  apiClient.get<{ data: PaymentDto[] }>(`/payroll/sheets/${id}/payments`)

export const getPayslip = (id: string) =>
  apiClient.get<{ data: PayslipDetailDto }>(`/payroll/payslips/${id}`)

export const cancelPayslip = (id: string) =>
  apiClient.post(`/payroll/payslips/${id}/cancel`)

export const listEmployeePayslips = (employeeId: string) =>
  apiClient.get<{ data: PayslipDetailDto[] }>(`/payroll/employees/${employeeId}/payslips`)

/* ── payroll settings (Thiết lập tính lương) ─────────────────────────────── */
export interface PayrollSettingsDto {
  payrollCutoffDay: number
  autoCreateEnabled: boolean
  autoUpdateEnabled: boolean
  personalIncomeTaxEnabled: boolean
}

export const getPayrollSettings = () =>
  apiClient.get<{ data: PayrollSettingsDto }>('/payroll/settings')

export const updatePayrollSettings = (req: PayrollSettingsDto) =>
  apiClient.put<{ data: PayrollSettingsDto }>('/payroll/settings', req)

/* ── shared formatting helpers ───────────────────────────────────────────── */
export const money = (n: number) => (n ?? 0).toLocaleString('vi-VN')

/** ISO date "2026-08-01" → "01/08/2026" */
export const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

/** ISO datetime → "01/08/2026 14:17" */
export const fmtDateTime = (iso: string | null | undefined) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** "dd/MM/yyyy" → ISO "yyyy-MM-dd" (null when malformed) */
export const parseDMY = (s: string): string | null => {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

export const toIsoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
