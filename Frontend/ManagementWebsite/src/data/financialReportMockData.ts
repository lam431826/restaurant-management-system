// Báo cáo tài chính (P&L / "Báo cáo kết quả hoạt động kinh doanh") — frontend-only, cloned
// from a saved KiotViet "Báo cáo > Tài chính" export. No backend financial-report API exists
// yet, so period figures are generated deterministically (same year/granularity -> same
// numbers across re-renders) instead of coming from a real query. Most expense/other-income
// sub-lines are hardcoded to 0 because those concepts (asset depreciation, delivery-partner
// fees, QR transaction fees, loyalty-point redemption, goods write-off) don't exist anywhere
// else in this app's domain either — only sales revenue, invoice discount, COGS and staff
// payroll cost have a real counterpart to eventually wire up.

export const BRANCHES = ['Chi nhánh trung tâm']

export type FinancialGranularity = 'month' | 'quarter' | 'year'

export interface FinancialFilterState {
  year: number
  granularity: FinancialGranularity
}

const now = new Date()
export const CURRENT_YEAR = now.getFullYear()
const CURRENT_MONTH = now.getMonth() + 1 // 1-12
const CURRENT_QUARTER = Math.ceil(CURRENT_MONTH / 3)

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

/* ── deterministic seeded RNG: same period label always renders the same mock figures ──── */
const seedFromString = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h >>> 0
}
const mulberry32 = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5)
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const between = (rnd: () => number, min: number, max: number) => Math.round((min + rnd() * (max - min)) / 1000) * 1000

const computePeriodValues = (periodKey: string, scale: number): Record<FinLineKey, number> => {
  const rnd = mulberry32(seedFromString(periodKey))

  const salesRevenue = between(rnd, 22_000_000, 55_000_000) * scale
  const invoiceDiscount = Math.round(salesRevenue * (0.001 + rnd() * 0.004) / 1000) * 1000
  const returnedGoods = 0
  const discountReduction = invoiceDiscount + returnedGoods
  const netRevenue = salesRevenue - discountReduction
  const cogs = Math.round(netRevenue * (0.62 + rnd() * 0.15) / 1000) * 1000
  const grossProfit = netRevenue - cogs

  // Only staff payroll cost has a real backend counterpart today — everything else in
  // "Chi phí" (CCDC leasing, asset depreciation, delivery-partner fees, QR transaction fees,
  // goods write-off, loyalty-point redemption) has no tracked concept anywhere in this app.
  const expCCDC = 0
  const expDepreciation = 0
  const expDeliveryFee = 0
  const expQRFee = 0
  const expWriteOff = 0
  const expPointRedeem = 0
  const expPayroll = between(rnd, 6_000_000, 12_000_000) * scale
  const expenses = expCCDC + expDepreciation + expDeliveryFee + expQRFee + expWriteOff + expPointRedeem + expPayroll

  const operatingProfit = grossProfit - expenses

  const incReturnFee = 0
  const incSalaryAdvanceReturn = 0
  const otherIncome = incReturnFee + incSalaryAdvanceReturn

  const otherExpense = 0

  const netProfit = (operatingProfit + otherIncome) - otherExpense

  return {
    salesRevenue, discountReduction, invoiceDiscount, returnedGoods,
    netRevenue, cogs, grossProfit,
    expenses, expCCDC, expDepreciation, expDeliveryFee, expQRFee, expWriteOff, expPointRedeem, expPayroll,
    operatingProfit,
    otherIncome, incReturnFee, incSalaryAdvanceReturn,
    otherExpense,
    netProfit,
  }
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

/** Periods run most-recent-first within the selected year, and never include periods that
 * haven't happened yet — matches the reference (viewed in Q3.2026, it only lists Q3 and Q2). */
export const buildFinancialPeriods = (year: number, granularity: FinancialGranularity): FinancialPeriod[] => {
  if (granularity === 'year') {
    return [{ key: `${year}`, label: `${year}`, values: computePeriodValues(`${year}`, 12) }]
  }
  if (granularity === 'quarter') {
    const lastQuarter = year === CURRENT_YEAR ? CURRENT_QUARTER : year < CURRENT_YEAR ? 4 : 0
    const quarters = Array.from({ length: lastQuarter }, (_, i) => lastQuarter - i)
    return quarters.map(q => {
      const key = `${year}-Q${q}`
      return { key, label: `Q${q}.${year}`, values: computePeriodValues(key, 3) }
    })
  }
  const lastMonth = year === CURRENT_YEAR ? CURRENT_MONTH : year < CURRENT_YEAR ? 12 : 0
  const months = Array.from({ length: lastMonth }, (_, i) => lastMonth - i)
  return months.map(m => {
    const key = `${year}-${String(m).padStart(2, '0')}`
    return { key, label: `T${m}.${year}`, values: computePeriodValues(key, 1) }
  })
}
