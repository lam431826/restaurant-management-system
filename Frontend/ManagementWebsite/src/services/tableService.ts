import JSZip from 'jszip'
import QRCode from 'qrcode'
import { api } from './api'
import type { ApiResponse, PageResponse } from './api'
import { buildQrValue } from '../utils/qr'

// ── Frontend-facing types (seats↔capacity, order↔displayOrder) ─────────

export interface ReservationSummary {
  id: string
  guestName: string
  phone: string
  partySize: number
  datetime: string
}

export interface TableItem {
  id: string
  name: string
  note: string
  area: string
  seats: number
  order: number
  active: boolean
  status: string
  qrToken: string | null
  activeOrderId: string | null
  upcomingReservation: ReservationSummary | null
  /** Set only when this table's OCCUPIED status came from a walk-in check-in (no reservation).
   * Null for reservation-driven occupancy. */
  occupiedSince: string | null
}

export interface TableArea {
  id: string
  name: string
  note: string
}

export interface TableInput {
  name: string
  note?: string
  area?: string
  seats?: number
  order?: number
  active?: boolean
}

// ── Backend wire shapes ────────────────────────────────────────────────

interface TableResponse {
  id: string
  name: string
  note: string | null
  area: string | null
  capacity: number
  displayOrder: number
  active: boolean
  status: string
  qrToken: string | null
  activeOrderId: string | null
  upcomingReservation: ReservationSummary | null
  occupiedSince: string | null
}

const toItem = (t: TableResponse): TableItem => ({
  id: t.id,
  name: t.name,
  note: t.note ?? '',
  area: t.area ?? '',
  seats: t.capacity,
  order: t.displayOrder,
  active: t.active,
  status: t.status,
  qrToken: t.qrToken,
  activeOrderId: t.activeOrderId ?? null,
  upcomingReservation: t.upcomingReservation ?? null,
  occupiedSince: t.occupiedSince ?? null,
})

const toBody = (input: TableInput) => ({
  name: input.name,
  note: input.note,
  area: input.area,
  capacity: input.seats,
  displayOrder: input.order,
  active: input.active,
})

// ── Tables ─────────────────────────────────────────────────────────────

export interface TableSearchParams {
  q?: string
  area?: string
  active?: boolean
  sort?: string // Spring format: "field,asc" | "field,desc"
  page?: number // 1-based
  size?: number
}

export const searchTables = (params: TableSearchParams = {}): Promise<PageResponse<TableItem>> =>
  api.get<PageResponse<TableResponse>>('/api/tables', {
    q: params.q,
    area: params.area,
    active: params.active,
    sort: params.sort,
    // backend Pageable is 0-based
    page: params.page ? params.page - 1 : 0,
    size: params.size ?? 20,
  }).then(r => ({ ...r, data: r.data.map(toItem) }))

/** Fetches every table in one page — for screens that need the full list rather than a paginated slice. */
export const listTables = (): Promise<TableItem[]> =>
  searchTables({ size: 1000 }).then(r => r.data)

export const createTable = (input: TableInput): Promise<TableItem> =>
  api.post<ApiResponse<TableResponse>>('/api/tables', toBody(input)).then(r => toItem(r.data))

export const updateTable = (id: string, input: TableInput): Promise<TableItem> =>
  api.put<ApiResponse<TableResponse>>(`/api/tables/${id}`, toBody(input)).then(r => toItem(r.data))

export const setTableActive = (id: string, active: boolean): Promise<void> =>
  api.patch<void>(`/api/tables/${id}/active`, { active })

// Walk-in check-in: seats a walk-in guest (AVAILABLE → OCCUPIED) without creating an order yet,
// stamping RestaurantTable.occupiedSince server-side. Only AVAILABLE → OCCUPIED is meaningful
// from the Cashier floor view — other transitions (BILLING/CLEANING) belong to other screens.
export const checkInWalkIn = (id: string): Promise<TableItem> =>
  api.patch<ApiResponse<TableResponse>>(`/api/tables/${id}/status`, { status: 'OCCUPIED' }).then(r => toItem(r.data))

// Undo a mistaken walk-in check-in — only meaningful before an order exists (the caller is
// responsible for that check; the backend has no order-awareness at the table-status endpoint).
// Reverts OCCUPIED → AVAILABLE, which also clears occupiedSince server-side.
export const undoWalkInCheckIn = (id: string): Promise<TableItem> =>
  api.patch<ApiResponse<TableResponse>>(`/api/tables/${id}/status`, { status: 'AVAILABLE' }).then(r => toItem(r.data))

export const deleteTable = (id: string): Promise<void> => api.del<void>(`/api/tables/${id}`)

// ── Import / Export ────────────────────────────────────────────────────

export interface ImportResult {
  created: number
  updated: number
  failed: number
  errors: { row: number; reason: string }[]
}

export const importTablesCsv = (file: File): Promise<ImportResult> => {
  const form = new FormData()
  form.append('file', file)
  return api.postForm<ApiResponse<ImportResult>>('/api/tables/import', form).then(r => r.data)
}

export const exportTablesCsv = async (): Promise<void> => {
  const blob = await api.getBlob('/api/tables/export')
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'tables-export.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export const downloadAllQrCodes = async (rooms: TableItem[]): Promise<void> => {
  const targets = rooms.filter((r): r is TableItem & { qrToken: string } => !!r.qrToken)
  if (targets.length === 0) return

  const zip = new JSZip()
  for (const room of targets) {
    const dataUrl = await QRCode.toDataURL(buildQrValue(room.qrToken), { width: 480, margin: 2 })
    zip.file(`QR-${room.name}.png`, dataUrl.split(',')[1], { base64: true })
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'qr-codes.zip'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

// ── Areas ──────────────────────────────────────────────────────────────

export const listAreas = (): Promise<TableArea[]> =>
  api.get<ApiResponse<TableArea[]>>('/api/tables/areas').then(r => r.data)

export const createArea = (name: string, note: string): Promise<TableArea> =>
  api.post<ApiResponse<TableArea>>('/api/tables/areas', { name, note }).then(r => r.data)

export const deleteArea = (id: string): Promise<void> => api.del<void>(`/api/tables/areas/${id}`)
