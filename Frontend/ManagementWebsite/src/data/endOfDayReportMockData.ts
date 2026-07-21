// Báo cáo cuối ngày (end-of-day sales report) — filter-state shape shared between
// EndOfDayFilters/EndOfDayReport/EndOfDayPreview. Row data itself now comes from the real
// GET /api/reports/end-of-day endpoint (see api/reports.ts), not mock data.

export const BRANCHES = ['Chi nhánh trung tâm']

export interface EndOfDayFilterState {
  date: string // YYYY-MM-DD — Ngày bán
  timeFrom: string // HH:mm
  timeTo: string // HH:mm
  useCustomRange: boolean
  customFrom: string
  customTo: string
  staffNames: string[] // Người nhận đơn — display names; resolved to ids before calling the API
  createdBy: string // Người tạo — same underlying field as staffNames (there's only one
  // "cashier who took the order" concept in the domain), kept as a separate control to match
  // the reference UI; the two are combined (OR'd) into one staffIds request param.
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
  staffNames: [],
  createdBy: '',
  paymentMethod: '',
  areaName: '',
  tableName: '',
})
