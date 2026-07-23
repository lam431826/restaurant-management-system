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

/** One Cashbook category's Chi phí(6)/Thu nhập khác(8) amount within a single period. */
export interface FinancialCategoryLineAmount {
  categoryId: string
  amount: number
}

/** One period row of "Báo cáo tài chính" (P&L). returnedGoods/otherExpense are always 0 — the
 * backend has nothing tracked for them anywhere else in the app. The expense/other-income
 * sub-lines are derived live from Sổ quỹ (Cashbook) categories/vouchers — see categoryLineValues
 * and getFinancialReportLines below. */
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
  categoryLineValues: FinancialCategoryLineAmount[]
}

export const getFinancialReport = (year: number, granularity: FinancialGranularityParam) =>
  apiClient.get<{ data: FinancialPeriodRow[] }>('/reports/financial', { params: { year, granularity } })

/* ── Chi phí / Thu nhập khác lines, read-only — derived from Sổ quỹ (Cashbook) categories ─── */
export type FinancialLineGroupParam = 'EXPENSE' | 'OTHER_INCOME'

export interface FinancialCategoryLineRow {
  id: string
  group: FinancialLineGroupParam
  name: string
}

export const getFinancialReportLines = () =>
  apiClient.get<{ data: FinancialCategoryLineRow[] }>('/reports/financial/lines')
