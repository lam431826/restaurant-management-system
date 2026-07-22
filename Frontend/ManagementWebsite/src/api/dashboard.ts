import apiClient from './apiClient'

// Mirrors backend PaymentMethod. CASH and VNPAY are the live methods; CARD/QR/E_WALLET remain
// for historical rows so an older payment never renders as "unknown".
export type DashboardPaymentMethod = 'CASH' | 'CARD' | 'QR' | 'E_WALLET' | 'VNPAY'

export const PAYMENT_METHOD_LABEL: Record<DashboardPaymentMethod, string> = {
  CASH: 'Tiền mặt',
  VNPAY: 'VNPAY',
  CARD: 'Thẻ',
  QR: 'QR',
  E_WALLET: 'Ví điện tử',
}

export type DashboardGranularity = 'HOUR' | 'DAY'

export interface DashboardRevenue {
  grossRevenue: number
  totalDiscount: number
  netRevenue: number
  // Number of distinct invoices with one authoritative PAID payment settled in [from, to).
  // Deliberately NOT an order-completion count: Order has no authoritative closedAt timestamp,
  // and a split order's invoices can settle in different periods, which would otherwise make the
  // same order look "completed" in more than one period once its (mutable, current) status is
  // CLOSED. See DashboardOverviewResponse.Revenue on the backend for the full rationale.
  paidInvoiceCount: number
  // netRevenue / paidInvoiceCount (0 when paidInvoiceCount is 0).
  averageInvoiceValue: number
}

export interface DashboardRevenuePoint {
  bucketStart: string // ISO LocalDateTime
  revenue: number
  invoiceCount: number
}

export interface DashboardPaymentBreakdownRow {
  method: DashboardPaymentMethod
  amount: number
  count: number
}

export interface DashboardMenuItemStat {
  menuItemId: string
  name: string
  quantity: number
  revenue: number
}

export interface DashboardOverview {
  revenue: DashboardRevenue
  revenueSeries: DashboardRevenuePoint[]
  paymentBreakdown: DashboardPaymentBreakdownRow[]
  topItems: DashboardMenuItemStat[]
}

export interface DashboardOverviewParams {
  from: string // ISO LocalDateTime, e.g. '2026-07-22T00:00:00'
  to: string
  granularity: DashboardGranularity
}

/** All figures come from PAID invoices only — the same revenue basis as the P&L / end-of-day
 *  reports — so the dashboard can never disagree with them. */
export const getDashboardOverview = (params: DashboardOverviewParams) =>
  apiClient
    .get<{ data: DashboardOverview }>('/reports/dashboard', { params })
    .then(r => r.data.data)
