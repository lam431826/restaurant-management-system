// Báo cáo tài chính (P&L / "Báo cáo kết quả hoạt động kinh doanh") — types/constants shared by
// FinancialReport.tsx/FinancialReportFilters.tsx/FinancialReportPreview.tsx. Period figures now
// come from a real backend endpoint (GET /reports/financial, see api/reports.ts), not mock data.
// The Chi phí (6) and Thu nhập khác (8) sub-lines that used to be fixed always-zero placeholders
// (asset depreciation, delivery-partner fees, QR fees, loyalty-point redemption, goods write-off,
// return fees...) are now user-managed custom line items (see FinancialCustomLine / the "Tài
// chính" tab in Settings) with per-month manually entered amounts — no longer part of FIN_LINES.
// Only sales revenue, invoice discount, COGS and staff payroll cost (expPayroll) have a real,
// automatically computed counterpart.

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
  | 'expenses' | 'expPayroll'
  | 'operatingProfit'
  | 'otherIncome'
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
  { key: 'expPayroll', label: 'Phí chi trả lương Nhân viên', level: 1 },
  { key: 'operatingProfit', label: 'Lợi nhuận từ hoạt động kinh doanh (7=5-6)', level: 0, bold: true },
  { key: 'otherIncome', label: 'Thu nhập khác (8)', level: 0 },
  { key: 'otherExpense', label: 'Chi phí khác (9)', level: 0 },
  { key: 'netProfit', label: 'Lợi nhuận thuần (10=(7+8)-9)', level: 0, bold: true },
]

export type FinancialLineGroup = 'EXPENSE' | 'OTHER_INCOME'

export interface FinancialCustomLine {
  id: string
  group: FinancialLineGroup
  name: string
  sortOrder: number
}

/** Where a FIN_LINES group header's user-managed custom rows (Tài chính settings tab) get
 * spliced in — right after the group header itself (before its one fixed sub-line, if any). */
export const CUSTOM_LINE_INSERT_AFTER: Partial<Record<FinLineKey, FinancialLineGroup>> = {
  expenses: 'EXPENSE',
  otherIncome: 'OTHER_INCOME',
}

export interface FinancialPeriod {
  key: string // stable id, e.g. "2026-Q3"
  label: string // display label, e.g. "Q3.2026"
  values: Record<FinLineKey, number>
  customLineValues: Record<string, number> // customLineId -> amount for this period
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

export const sumCustomLineValues = (periods: FinancialPeriod[]): Record<string, number> =>
  periods.reduce((acc, p) => {
    const next = { ...acc }
    for (const [lineId, amount] of Object.entries(p.customLineValues)) {
      next[lineId] = (next[lineId] ?? 0) + amount
    }
    return next
  }, {} as Record<string, number>)
