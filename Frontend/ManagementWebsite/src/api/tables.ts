import apiClient from './apiClient'

export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'BILLING' | 'CLEANING'

export interface TableDto {
  id: string
  name: string
  capacity: number
  area: string
  status: TableStatus
  qrToken: string
}

// size is large so callers that need the full table list (no UI pagination) get everything in one page.
export const listTables = (status?: TableStatus) =>
  apiClient.get<{ data: TableDto[] }>('/tables', { params: { size: 1000, ...(status ? { status } : {}) } })

export const updateTableStatus = (id: string, status: TableStatus) =>
  apiClient.put<{ data: TableDto }>(`/tables/${id}/status`, { status })
