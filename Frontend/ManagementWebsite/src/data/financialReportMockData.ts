// Báo cáo tài chính (P&L / "Báo cáo kết quả hoạt động kinh doanh") — types/constants shared by
// FinancialReport.tsx/FinancialReportFilters.tsx/FinancialReportPreview.tsx. Period figures now
// come from a real backend endpoint (GET /reports/financial, see api/reports.ts), not mock data.
// Most expense/other-income sub-lines still come back as 0 from the backend because those
// concepts (asset depreciation, delivery-partner fees, QR transaction fees, loyalty-point
// redemption, goods write-off) don't exist anywhere else in this app's domain either — only
// sales revenue, invoice discount, COGS and staff payroll cost have a real counterpart.

export const BRANCHES = ['Chi nhánh trung tâm']

export type FinancialGranularity = 'month' | 'quarter' | 'year'

export interface FinancialFilterState {
  year: number
  granularity: FinancialGranularity
}

export const CURRENT_YEAR = new Date().getFullYear()

export const YEAR_OPTIONS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2]

export const defaultFinancialFilters = (): FinancialFilterState => ({
  year: CURRENT_YEAR,
  granularity: 'quarter',
})

export type FinLineKey =
  | 'salesRevenue' | 'discountReduction' | 'invoiceDiscount' | 'returnedGoods'
  | 'netRevenue' | 'cogs' | 'grossProfit'
  | 'expenses' | 'expCCDC' | 'expDepreciation' | 'expDeliveryFee' | 'expQRFee' | 'expWriteOff' | 'expPointRedeem' | 'expPayroll'
  | 'operatingProfit'
  | 'otherIncome' | 'incReturnFee' | 'incSalaryAdvanceReturn'
  | 'otherExpense'
  | 'netProfit'

export interface FinLineDef {
  key: FinLineKey
  label: string
  level: 0 | 1
  bold?: boolean
}

export const FIN_LINES: FinLineDef[] = [
  { key: 'salesRevenue', label: 'Doanh thu bán hàng (1)', level: 0 },
  { key: 'discountReduction', label: 'Giảm trừ Doanh thu (2 = 2.1+2.2)', level: 0 },
  { key: 'invoiceDiscount', label: 'Chiết khấu hóa đơn (2.1)', level: 1 },
  { key: 'returnedGoods', label: 'Giá trị hàng bán bị trả lại (2.2)', level: 1 },
  { key: 'netRevenue', label: 'Doanh thu thuần (3=1-2)', level: 0, bold: true },
  { key: 'cogs', label: 'Giá vốn hàng bán (4)', level: 0 },
  { key: 'grossProfit', label: 'Lợi nhuận gộp về bán hàng (5=3-4)', level: 0, bold: true },
  { key: 'expenses', label: 'Chi phí (6)', level: 0 },
  { key: 'expCCDC', label: 'Chi phí CCDC / Dịch vụ CPTT', level: 1 },
  { key: 'expDepreciation', label: 'Chi phí khấu hao TSCĐ', level: 1 },
  { key: 'expDeliveryFee', label: 'Phí giao hàng (trả đối tác)', level: 1 },
  { key: 'expQRFee', label: 'Phí giao dịch (thanh toán Mã QR)', level: 1 },
  { key: 'expWriteOff', label: 'Xuất hủy hàng hóa', level: 1 },
  { key: 'expPointRedeem', label: 'Giá trị thanh toán bằng điểm', level: 1 },
  { key: 'expPayroll', label: 'Phí chi trả lương Nhân viên', level: 1 },
  { key: 'operatingProfit', label: 'Lợi nhuận từ hoạt động kinh doanh (7=5-6)', level: 0, bold: true },
  { key: 'otherIncome', label: 'Thu nhập khác (8)', level: 0 },
  { key: 'incReturnFee', label: 'Phí trả hàng', level: 1 },
  { key: 'incSalaryAdvanceReturn', label: 'Nhân viên hoàn trả tạm ứng lương', level: 1 },
  { key: 'otherExpense', label: 'Chi phí khác (9)', level: 0 },
  { key: 'netProfit', label: 'Lợi nhuận thuần (10=(7+8)-9)', level: 0, bold: true },
]

export interface FinancialPeriod {
  key: string // stable id, e.g. "2026-Q3"
  label: string // display label, e.g. "Q3.2026"
  values: Record<FinLineKey, number>
}

const ZERO_VALUES: Record<FinLineKey, number> = FIN_LINES.reduce(
  (acc, l) => ({ ...acc, [l.key]: 0 }), {} as Record<FinLineKey, number>,
)

export const sumValues = (periods: FinancialPeriod[]): Record<FinLineKey, number> =>
  periods.reduce((acc, p) => {
    const next = { ...acc }
    for (const k of Object.keys(acc) as FinLineKey[]) next[k] = acc[k] + p.values[k]
    return next
  }, { ...ZERO_VALUES })
