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

export const listTables = (status?: TableStatus) =>
  apiClient.get<{ data: TableDto[] }>('/tables', { params: status ? { status } : undefined })

export const updateTableStatus = (id: string, status: TableStatus) =>
  apiClient.put<{ data: TableDto }>(`/tables/${id}/status`, { status })
