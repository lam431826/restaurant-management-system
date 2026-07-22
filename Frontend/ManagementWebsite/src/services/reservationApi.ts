import { api } from './api'
import type { ApiResponse } from './api'

export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'NO_SHOW' | 'CANCELLED' | 'COMPLETED'

export interface ReservationDetail {
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

export const checkInReservation = (id: string): Promise<ReservationDetail> =>
  api.put<ApiResponse<ReservationDetail>>(`/api/reservations/${id}/check-in`).then(r => r.data)

export const cancelStaffReservation = (id: string): Promise<void> =>
  api.del<void>(`/api/reservations/${id}`)
