import apiClient from './apiClient'

export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'BILLING' | 'CLEANING'

export interface TableDto {
  id: string
  name: string
  capacity: number
  area: string
  status: TableStatus
  qrToken: string
  activeOrderId?: string | null
  upcomingReservation?: {
    id: string
    guestName: string
    phone: string
    partySize: number
    datetime: string
  } | null
  /** Set only when this table's OCCUPIED status came from a walk-in check-in (no reservation).
   * Null for reservation-driven occupancy. */
  occupiedSince?: string | null
}

// size is large so callers that need the full table list (no UI pagination) get everything in one page.
export const listTables = (status?: TableStatus) =>
  apiClient.get<{ data: TableDto[] }>('/tables', { params: { size: 1000, ...(status ? { status } : {}) } })

export const updateTableStatus = (id: string, status: TableStatus) =>
  apiClient.put<{ data: TableDto }>(`/tables/${id}/status`, { status })
