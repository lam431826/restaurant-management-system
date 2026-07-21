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

/** One period row of "Báo cáo tài chính" (P&L). Sub-lines with no domain counterpart yet
 * (returnedGoods, expCCDC, expDepreciation, expDeliveryFee, expQRFee, expWriteOff,
 * expPointRedeem, incReturnFee, incSalaryAdvanceReturn, otherExpense) are always 0 — the
 * backend has nothing tracked for them anywhere else in the app. */
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
  expCCDC: number
  expDepreciation: number
  expDeliveryFee: number
  expQRFee: number
  expWriteOff: number
  expPointRedeem: number
  expPayroll: number
  operatingProfit: number
  otherIncome: number
  incReturnFee: number
  incSalaryAdvanceReturn: number
  otherExpense: number
  netProfit: number
}

export const getFinancialReport = (year: number, granularity: FinancialGranularityParam) =>
  apiClient.get<{ data: FinancialPeriodRow[] }>('/reports/financial', { params: { year, granularity } })
