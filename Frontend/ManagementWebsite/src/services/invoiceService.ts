import { api } from './api'
import type { ApiResponse } from './api'

// ── Types (mirror backend DTOs) ────────────────────────────────────────

export interface InvoiceListItem {
  id: string
  createdAt: string | null
  tableName: string | null
  subtotal: number
  discountAmount: number | null
  totalAmount: number
  paid: boolean
  paymentMethod: string | null
  paymentStatus: string | null
  note: string | null
  cashierName: string | null
  itemsText: string | null
}

export interface InvoiceLine {
  name: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface InvoicePayment {
  method: string
  amount: number
  status: string | null
  createdAt: string | null
}

export interface InvoiceDetail {
  id: string
  orderId: string
  createdAt: string | null
  tableName: string | null
  subtotal: number
  discountAmount: number | null
  totalAmount: number
  paid: boolean
  lines: InvoiceLine[]
  payments: InvoicePayment[]
}

// ── Display helpers ────────────────────────────────────────────────────

/** Maps a backend PaymentMethod enum to a Vietnamese label. */
export const paymentMethodLabel = (method: string | null): string => {
  switch (method) {
    case 'CASH': return 'Tiền mặt'
    case 'CARD': return 'Thẻ'
    case 'QR': return 'QR'
    case 'E_WALLET': return 'Ví điện tử'
    default: return '—'
  }
}

export const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Tiền mặt' },
  { value: 'CARD', label: 'Thẻ' },
  { value: 'QR', label: 'QR' },
  { value: 'E_WALLET', label: 'Ví điện tử' },
]

const pad = (n: number) => String(n).padStart(2, '0')

export const formatDateTime = (iso: string | null): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const isToday = (iso: string | null): boolean => {
  if (!iso) return false
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return false
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

// ── Time-range presets ─────────────────────────────────────────────────

export type TimeRange =
  | 'all' | 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'last7days'
  | 'thisMonth' | 'lastMonth' | 'last30days' | 'thisQuarter' | 'lastQuarter'
  | 'thisYear' | 'lastYear'

export const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  today: 'Hôm nay',
  yesterday: 'Hôm qua',
  thisWeek: 'Tuần này',
  lastWeek: 'Tuần trước',
  last7days: '7 ngày qua',
  thisMonth: 'Tháng này',
  lastMonth: 'Tháng trước',
  last30days: '30 ngày qua',
  thisQuarter: 'Quý này',
  lastQuarter: 'Quý trước',
  thisYear: 'Năm nay',
  lastYear: 'Năm trước',
  all: 'Toàn thời gian',
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
const startOfWeek = (d: Date) => {
  const day = (d.getDay() + 6) % 7 // Monday = 0
  const f = startOfDay(d)
  f.setDate(d.getDate() - day)
  return f
}

export const computeRange = (range: TimeRange): { from: Date | null; to: Date | null } => {
  const now = new Date()
  switch (range) {
    case 'all': return { from: null, to: null }
    case 'today': return { from: startOfDay(now), to: endOfDay(now) }
    case 'yesterday': {
      const y = new Date(now); y.setDate(now.getDate() - 1)
      return { from: startOfDay(y), to: endOfDay(y) }
    }
    case 'last7days': {
      const f = new Date(now); f.setDate(now.getDate() - 6)
      return { from: startOfDay(f), to: endOfDay(now) }
    }
    case 'last30days': {
      const f = new Date(now); f.setDate(now.getDate() - 29)
      return { from: startOfDay(f), to: endOfDay(now) }
    }
    case 'thisWeek': {
      const f = startOfWeek(now); const t = new Date(f); t.setDate(f.getDate() + 6)
      return { from: f, to: endOfDay(t) }
    }
    case 'lastWeek': {
      const tw = startOfWeek(now); const f = new Date(tw); f.setDate(tw.getDate() - 7)
      const t = new Date(f); t.setDate(f.getDate() + 6)
      return { from: f, to: endOfDay(t) }
    }
    case 'thisMonth':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)) }
    case 'lastMonth':
      return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)) }
    case 'thisQuarter': {
      const q = Math.floor(now.getMonth() / 3)
      return { from: new Date(now.getFullYear(), q * 3, 1), to: endOfDay(new Date(now.getFullYear(), q * 3 + 3, 0)) }
    }
    case 'lastQuarter': {
      let q = Math.floor(now.getMonth() / 3) - 1; let y = now.getFullYear()
      if (q < 0) { q = 3; y -= 1 }
      return { from: new Date(y, q * 3, 1), to: endOfDay(new Date(y, q * 3 + 3, 0)) }
    }
    case 'thisYear':
      return { from: new Date(now.getFullYear(), 0, 1), to: endOfDay(new Date(now.getFullYear(), 11, 31)) }
    case 'lastYear':
      return { from: new Date(now.getFullYear() - 1, 0, 1), to: endOfDay(new Date(now.getFullYear() - 1, 11, 31)) }
  }
}

export const inCustomRange = (iso: string | null, from: Date | null, to: Date | null): boolean => {
  if (!from && !to) return true
  if (!iso) return false
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return false
  if (from && t < startOfDay(from).getTime()) return false
  if (to && t > endOfDay(to).getTime()) return false
  return true
}

export const inTimeRange = (iso: string | null, range: TimeRange): boolean => {
  if (range === 'all') return true
  if (!iso) return false
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return false
  const { from, to } = computeRange(range)
  if (from && t < from.getTime()) return false
  if (to && t > to.getTime()) return false
  return true
}

// ── API ────────────────────────────────────────────────────────────────

export const listInvoices = (): Promise<InvoiceListItem[]> =>
  api.get<ApiResponse<InvoiceListItem[]>>('/api/invoices').then(r => r.data)

export const getInvoiceDetail = (id: string): Promise<InvoiceDetail> =>
  api.get<ApiResponse<InvoiceDetail>>(`/api/invoices/${id}`).then(r => r.data)
