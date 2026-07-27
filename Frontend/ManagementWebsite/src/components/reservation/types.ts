import type { ReservationStatus } from '../../api/reservations'

export type { ReservationStatus } from '../../api/reservations'

export const reservationStatusMeta: Record<ReservationStatus, { label: string; color: string }> = {
  PENDING: { label: 'Chờ xác nhận', color: 'var(--kv-warning)' },
  CONFIRMED: { label: 'Đã xác nhận', color: 'var(--kv-success)' },
  CHECKED_IN: { label: 'Đã nhận bàn', color: 'var(--kv-primary)' },
  NO_SHOW: { label: 'Không đến', color: 'var(--kv-neutral-400)' },
  CANCELLED: { label: 'Đã hủy', color: 'var(--kv-danger)' },
  COMPLETED: { label: 'Đã hoàn thành', color: 'var(--kv-success-700)' },
}

/** Display model used by the reservation calendar and list views. */
export interface Reservation {
  id: string
  code: string
  arriveTime: string
  datetimeIso: string
  customer: string
  phone: string
  guestEmail: string | null
  guests: number
  table: string
  area: string
  status: ReservationStatus
  note: string
  startHour: number
  durationH: number
}
