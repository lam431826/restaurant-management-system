import apiClient from './apiClient'

export type ReportPaymentMethod = 'CASH' | 'CARD' | 'QR' | 'E_WALLET'

export const PAYMENT_METHOD_LABEL: Record<ReportPaymentMethod, string> = {
  CASH: 'Tiền mặt', CARD: 'Thẻ', QR: 'QR', E_WALLET: 'Ví điện tử',
}
export const PAYMENT_METHOD_ABBR: Record<ReportPaymentMethod, string> = {
  CASH: 'TM', CARD: 'Thẻ', QR: 'QR', E_WALLET: 'Ví',
}

/** One invoice line in the "Báo cáo cuối ngày" report. tax/otherRevenue are always 0 — neither
 * concept exists in the domain. staffId/staffName are null for orders with no attributable
 * cashier (e.g. guest QR orders). */
export interface EndOfDaySalesRow {
  id: string
  code: string
  time: string // ISO datetime
  tableName: string | null
  areaName: string | null
  quantity: number
  grossAmount: number
  invoiceDiscount: number
  revenue: number
  otherRevenue: number
  tax: number
  payment: number
  staffId: string | null
  staffName: string | null
  paymentMethod: ReportPaymentMethod | null
}

export interface EndOfDaySalesParams {
  from: string // ISO LocalDateTime, e.g. '2026-07-19T00:00:00'
  to: string
  staffIds?: string[]
  paymentMethod?: ReportPaymentMethod
  areaName?: string
  tableName?: string
}

export const getEndOfDaySalesReport = (params: EndOfDaySalesParams) =>
  apiClient.get<{ data: EndOfDaySalesRow[] }>('/reports/end-of-day', { params })

export type FinancialGranularityParam = 'MONTH' | 'QUARTER' | 'YEAR'

/** One custom line's amount within a single period, keyed by customLineId. */
export interface FinancialCustomLineAmount {
  lineId: string
  amount: number
}

/** One period row of "Báo cáo tài chính" (P&L). returnedGoods/otherExpense are always 0 — the
 * backend has nothing tracked for them anywhere else in the app. The old fixed always-zero
 * expense/other-income sub-lines are now user-managed custom lines, see customLineValues and
 * api/financialCustomLines.ts. */
export interface FinancialPeriodRow {
  key: string
  label: string
  salesRevenue: number
  discountReduction: number
  invoiceDiscount: number
  returnedGoods: number
  netRevenue: number
  cogs: number
  grossProfit: number
  expenses: number
  expPayroll: number
  operatingProfit: number
  otherIncome: number
  otherExpense: number
  netProfit: number
  customLineValues: FinancialCustomLineAmount[]
}

export const getFinancialReport = (year: number, granularity: FinancialGranularityParam) =>
  apiClient.get<{ data: FinancialPeriodRow[] }>('/reports/financial', { params: { year, granularity } })

/* ── Chi phí / Thu nhập khác custom line items (Tài chính settings tab) ──────────────────── */
export type FinancialLineGroupParam = 'EXPENSE' | 'OTHER_INCOME'

export interface FinancialCustomLineRow {
  id: string
  group: FinancialLineGroupParam
  name: string
  sortOrder: number
}

export const listFinancialCustomLines = () =>
  apiClient.get<{ data: FinancialCustomLineRow[] }>('/reports/financial/custom-lines')

export const createFinancialCustomLine = (group: FinancialLineGroupParam, name: string) =>
  apiClient.post<{ data: FinancialCustomLineRow }>('/reports/financial/custom-lines', { group, name })

export const updateFinancialCustomLine = (id: string, group: FinancialLineGroupParam, name: string) =>
  apiClient.put<{ data: FinancialCustomLineRow }>(`/reports/financial/custom-lines/${id}`, { group, name })

export const deleteFinancialCustomLine = (id: string) =>
  apiClient.delete(`/reports/financial/custom-lines/${id}`)

export const upsertFinancialCustomLineValue = (id: string, year: number, month: number, amount: number) =>
  apiClient.put(`/reports/financial/custom-lines/${id}/values`, { year, month, amount })
