import apiClient from './apiClient'

export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'NO_SHOW' | 'CANCELLED' | 'COMPLETED'

export interface ReservationDto {
  id: string
  tableId: string | null
  tableName: string | null
  tableArea: string | null
  guestName: string
  phone: string
  guestEmail: string | null
  partySize: number
  datetime: string
  note: string | null
  status: ReservationStatus
  createdAt: string
}

interface ReservationsPage {
  data: ReservationDto[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export const listReservations = (page = 0, size = 100) =>
  apiClient.get<{ data: ReservationsPage }>('/reservations', { params: { page, size } })

export const createReservation = (body: {
  guestName: string
  phone: string
  partySize: number
  datetime: string
  tableId?: string | null
  note?: string | null
  guestEmail?: string | null
}) =>
  apiClient.post<{ data: ReservationDto }>('/reservations', body)

export const confirmReservation = (id: string) =>
  apiClient.put<{ data: ReservationDto }>(`/reservations/${id}/confirm`)

export const cancelReservation = (id: string) =>
  apiClient.delete(`/reservations/${id}`)

export const checkInReservation = (id: string) =>
  apiClient.put<{ data: ReservationDto }>(`/reservations/${id}/check-in`)

export const noShowReservation = (id: string) =>
  apiClient.put(`/reservations/${id}/no-show`)

export const updateReservation = (id: string, body: {
  tableId?: string | null
  guestName?: string
  phone?: string
  guestEmail?: string | null
  partySize?: number
  datetime?: string
  note?: string | null
}) =>
  apiClient.put<{ data: ReservationDto }>(`/reservations/${id}`, body)

export const transferTable = (id: string, tableId: string) =>
  apiClient.put<{ data: ReservationDto }>(`/reservations/${id}/transfer-table`, { tableId })
