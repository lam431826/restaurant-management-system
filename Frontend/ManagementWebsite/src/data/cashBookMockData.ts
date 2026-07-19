// Sổ quỹ (cash book) mock data — frontend-only module, no backend yet.
// payslip_payments (PC%06d) in the payroll module is meant to feed this ledger
// once the real Cash Book API exists; see rms-payroll-module memory (BR-PAY-17/19).

export type CashFlowType = 'RECEIPT' | 'PAYMENT'
export type CashFlowMethod = 'CASH' | 'BANK' | 'EWALLET'
export type PartnerGroup = 'EMPLOYEE' | 'OTHER'

export interface CashFlowCategory {
  id: string
  name: string
  type: CashFlowType
}

export interface CashFlowVoucher {
  id: string
  code: string
  type: CashFlowType
  createdAt: string // ISO datetime
  categoryId: string
  method: CashFlowMethod
  partnerGroup: PartnerGroup
  partnerId: string | null
  partnerName: string
  amount: number
  note: string
  accountingToIncome: boolean
  createdBy: string
  voided: boolean
}

export const METHOD_LABEL: Record<CashFlowMethod, string> = {
  CASH: 'Tiền mặt',
  BANK: 'Chuyển khoản',
  EWALLET: 'Ví điện tử',
}

export const CASH_FLOW_METHODS: CashFlowMethod[] = ['CASH', 'BANK', 'EWALLET']

export const OPENING_BALANCE = 4_803_000

// ── Sổ quỹ list/filter UI constants (kept here, not in a component file, so
// react-refresh/only-export-components doesn't flag co-located value exports) ──
export type FundFilter = 'ALL' | CashFlowMethod
export type TimePreset = 'THIS_MONTH' | 'CUSTOM'
export type StatusFilter = 'PAID' | 'VOIDED'
export type AccountingFilter = 'ALL' | 'YES' | 'NO'
export type PartnerScope = 'ALL' | PartnerGroup

export interface CashBookFilterState {
  fund: FundFilter
  timePreset: TimePreset
  dateFrom: Date | null
  dateTo: Date | null
  docTypes: CashFlowType[]
  categoryIds: string[]
  statuses: StatusFilter[]
  accounting: AccountingFilter
  createdBy: string
  partnerScope: PartnerScope
  partnerQuery: string
}

export const FUND_LABEL: Record<FundFilter, string> = {
  ALL: 'Tổng quỹ',
  CASH: 'Tiền mặt',
  BANK: 'Tài khoản ngân hàng',
  EWALLET: 'Ví điện tử',
}

export const defaultCashBookFilters: CashBookFilterState = {
  fund: 'ALL',
  timePreset: 'THIS_MONTH',
  dateFrom: null,
  dateTo: null,
  docTypes: [],
  categoryIds: [],
  statuses: ['PAID'],
  accounting: 'ALL',
  createdBy: '',
  partnerScope: 'ALL',
  partnerQuery: '',
}

export type ColumnKey = 'time' | 'category' | 'method' | 'partner' | 'amount'
export const COLUMN_LABEL: Record<ColumnKey, string> = {
  time: 'Thời gian',
  category: 'Loại thu chi',
  method: 'Loại sổ quỹ',
  partner: 'Người nộp/nhận',
  amount: 'Giá trị',
}

export const initialCategories: CashFlowCategory[] = [
  { id: 'cat-thu-khach', name: 'Thu tiền khách trả', type: 'RECEIPT' },
  { id: 'cat-thu-khac', name: 'Thu khác', type: 'RECEIPT' },
  { id: 'cat-chi-nguyen-lieu', name: 'Chi phí nguyên liệu', type: 'PAYMENT' },
  { id: 'cat-chi-dien-nuoc', name: 'Chi phí điện nước', type: 'PAYMENT' },
  { id: 'cat-chi-luong', name: 'Trả lương nhân viên', type: 'PAYMENT' },
  { id: 'cat-chi-van-hanh', name: 'Chi phí vận hành khác', type: 'PAYMENT' },
]

const iso = (daysAgo: number, hour: number, minute: number) => {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

export const initialVouchers: CashFlowVoucher[] = [
  {
    id: 'v-1', code: 'PC000001', type: 'PAYMENT', createdAt: iso(6, 9, 15),
    categoryId: 'cat-chi-nguyen-lieu', method: 'CASH', partnerGroup: 'OTHER',
    partnerId: null, partnerName: 'Chợ đầu mối Bình Điền', amount: 3_200_000,
    note: 'Nhập rau củ, hải sản cho tuần', accountingToIncome: true,
    createdBy: 'manager01', voided: false,
  },
  {
    id: 'v-2', code: 'PT000001', type: 'RECEIPT', createdAt: iso(5, 12, 40),
    categoryId: 'cat-thu-khach', method: 'CASH', partnerGroup: 'OTHER',
    partnerId: null, partnerName: 'Khách lẻ', amount: 4_850_000,
    note: 'Thu tiền mặt cuối ca trưa', accountingToIncome: true,
    createdBy: 'manager01', voided: false,
  },
  {
    id: 'v-3', code: 'PC000002', type: 'PAYMENT', createdAt: iso(5, 18, 5),
    categoryId: 'cat-chi-dien-nuoc', method: 'BANK', partnerGroup: 'OTHER',
    partnerId: null, partnerName: 'Công ty Điện lực', amount: 2_150_000,
    note: 'Tiền điện tháng trước', accountingToIncome: true,
    createdBy: 'manager01', voided: false,
  },
  {
    id: 'v-4', code: 'PT000002', type: 'RECEIPT', createdAt: iso(4, 13, 10),
    categoryId: 'cat-thu-khach', method: 'BANK', partnerGroup: 'OTHER',
    partnerId: null, partnerName: 'Khách đặt tiệc', amount: 12_500_000,
    note: 'Đặt cọc tiệc sinh nhật', accountingToIncome: true,
    createdBy: 'manager01', voided: false,
  },
  {
    id: 'v-5', code: 'PC000003', type: 'PAYMENT', createdAt: iso(3, 20, 30),
    categoryId: 'cat-chi-van-hanh', method: 'EWALLET', partnerGroup: 'OTHER',
    partnerId: null, partnerName: 'Grab', amount: 450_000,
    note: 'Phí giao hàng đối tác', accountingToIncome: true,
    createdBy: 'manager01', voided: false,
  },
  {
    id: 'v-6', code: 'PT000003', type: 'RECEIPT', createdAt: iso(2, 11, 0),
    categoryId: 'cat-thu-khac', method: 'CASH', partnerGroup: 'OTHER',
    partnerId: null, partnerName: 'Khác', amount: 800_000,
    note: 'Thanh lý dụng cụ cũ', accountingToIncome: false,
    createdBy: 'manager01', voided: false,
  },
  {
    id: 'v-7', code: 'PC000004', type: 'PAYMENT', createdAt: iso(1, 22, 46),
    categoryId: 'cat-chi-luong', method: 'CASH', partnerGroup: 'EMPLOYEE',
    partnerId: null, partnerName: 'Nguyễn Văn B', amount: 8_000_000,
    note: 'Tạm ứng lương', accountingToIncome: true,
    createdBy: 'manager01', voided: false,
  },
  {
    id: 'v-8', code: 'PT000004', type: 'RECEIPT', createdAt: iso(0, 8, 30),
    categoryId: 'cat-thu-khach', method: 'CASH', partnerGroup: 'OTHER',
    partnerId: null, partnerName: 'Khách lẻ', amount: 3_651_000,
    note: 'Thu tiền mặt ca sáng', accountingToIncome: true,
    createdBy: 'manager01', voided: false,
  },
  {
    id: 'v-9', code: 'PC000005', type: 'PAYMENT', createdAt: iso(0, 10, 5),
    categoryId: 'cat-chi-nguyen-lieu', method: 'BANK', partnerGroup: 'OTHER',
    partnerId: null, partnerName: 'Vissan', amount: 5_600_000,
    note: 'Nhập thịt đông lạnh', accountingToIncome: true,
    createdBy: 'manager01', voided: false,
  },
  {
    id: 'v-10', code: 'PC000006', type: 'PAYMENT', createdAt: iso(0, 14, 20),
    categoryId: 'cat-chi-van-hanh', method: 'CASH', partnerGroup: 'OTHER',
    partnerId: null, partnerName: 'Cửa hàng văn phòng phẩm', amount: 350_000,
    note: 'Mua hoá đơn, giấy in bill', accountingToIncome: true,
    createdBy: 'manager01', voided: true,
  },
]

export const nextVoucherCode = (vouchers: CashFlowVoucher[], type: CashFlowType) => {
  const prefix = type === 'RECEIPT' ? 'PT' : 'PC'
  const maxNo = vouchers
    .filter(v => v.type === type)
    .reduce((max, v) => {
      const m = /^\D+(\d+)$/.exec(v.code)
      return m ? Math.max(max, parseInt(m[1], 10)) : max
    }, 0)
  return `${prefix}${String(maxNo + 1).padStart(6, '0')}`
}
