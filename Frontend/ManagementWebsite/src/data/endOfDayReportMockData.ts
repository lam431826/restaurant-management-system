// Báo cáo cuối ngày (end-of-day sales report) — frontend-only, cloned from a saved
// KiotViet "Báo cáo > Cuối ngày" export. No backend report/invoice-aggregation API exists
// yet, so invoice rows are generated deterministically per date (same date -> same rows
// across re-renders) instead of coming from a real query.

import { rooms as mockRooms } from './mockData'

export const BRANCHES = ['Chi nhánh trung tâm']
export const PAYMENT_METHODS = ['Tiền mặt', 'Chuyển khoản', 'Thẻ', 'Ví điện tử']
export const PAYMENT_METHOD_ABBR: Record<string, string> = {
  'Tiền mặt': 'TM', 'Chuyển khoản': 'CK', 'Thẻ': 'Thẻ', 'Ví điện tử': 'Ví',
}
export const STAFF_NAMES = ['Hoàng - Kinh Doanh', 'Hương - Kế Toán', 'Nguyễn Đức Lâm']

export interface EndOfDayInvoiceRow {
  id: string
  code: string // Mã chứng từ
  time: string // ISO datetime — Thời gian
  roomTable: string | null // Phòng/Bàn
  areaName: string | null
  quantity: number // SLSP
  grossAmount: number // Tổng tiền hàng (before invoice-level discount)
  invoiceDiscount: number // Giảm giá HĐ
  revenue: number // Doanh thu (= grossAmount - invoiceDiscount)
  otherRevenue: number // Thu khác
  tax: number // Thuế
  payment: number // Thanh toán
  staffName: string // Người nhận đơn
  createdBy: string // Người tạo
  paymentMethod: string
  paymentMethodAbbr: string // T.Toán
  customerName: string
  customerPhone: string
}

export interface EndOfDayFilterState {
  date: string // YYYY-MM-DD — Ngày bán
  timeFrom: string // HH:mm
  timeTo: string // HH:mm
  useCustomRange: boolean
  customFrom: string
  customTo: string
  customerQuery: string
  staffNames: string[] // Người nhận đơn
  createdBy: string // Người tạo
  paymentMethod: string
  areaName: string
  tableName: string
}

const todayYMD = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const defaultEndOfDayFilters = (): EndOfDayFilterState => ({
  date: todayYMD(),
  timeFrom: '00:00',
  timeTo: '',
  useCustomRange: false,
  customFrom: '',
  customTo: '',
  customerQuery: '',
  staffNames: [...STAFF_NAMES],
  createdBy: '',
  paymentMethod: '',
  areaName: '',
  tableName: '',
})

/* ── deterministic seeded RNG: same date always renders the same mock rows ──────────── */
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

const UNIT_PRICES = [15_000, 25_000, 35_000, 45_000, 65_000, 85_000, 125_000]

/** Plausible day of invoices for the given YYYY-MM-DD — stable across re-renders/filter changes. */
export const generateInvoicesForDate = (dateYMD: string): EndOfDayInvoiceRow[] => {
  const seed = seedFromString(dateYMD)
  const rand = mulberry32(seed)
  const invoiceCount = 1 + Math.floor(rand() * 4) // 1..4 invoices/day
  const rows: EndOfDayInvoiceRow[] = []

  for (let i = 0; i < invoiceCount; i++) {
    const hour = 7 + Math.floor(rand() * 15) // 07:00–21:59
    const minute = Math.floor(rand() * 60)
    const quantity = 4 + Math.floor(rand() * 40)
    const unitPrice = UNIT_PRICES[Math.floor(rand() * UNIT_PRICES.length)]
    const grossAmount = quantity * unitPrice
    const invoiceDiscount = 0
    const revenue = grossAmount - invoiceDiscount
    const staffName = STAFF_NAMES[Math.floor(rand() * STAFF_NAMES.length)]
    const hasRoom = rand() >= 0.15
    const room = hasRoom ? mockRooms[Math.floor(rand() * mockRooms.length)] : null
    const paymentMethod = PAYMENT_METHODS[Math.floor(rand() * PAYMENT_METHODS.length)]

    rows.push({
      id: `${dateYMD}-${i}`,
      code: `HD${String(1000 + (seed % 8000) + i * 7).padStart(6, '0')}`,
      time: `${dateYMD}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`,
      roomTable: room?.name ?? null,
      areaName: room?.area ?? null,
      quantity,
      grossAmount,
      invoiceDiscount,
      revenue,
      otherRevenue: 0,
      tax: 0,
      payment: revenue,
      staffName,
      createdBy: staffName,
      paymentMethod,
      paymentMethodAbbr: PAYMENT_METHOD_ABBR[paymentMethod] ?? paymentMethod,
      customerName: rand() < 0.6 ? 'Khách lẻ' : 'Khách quen',
      customerPhone: rand() < 0.6 ? '' : `09${Math.floor(10_000_000 + rand() * 89_999_999)}`,
    })
  }

  return rows.sort((a, b) => a.time.localeCompare(b.time))
}
