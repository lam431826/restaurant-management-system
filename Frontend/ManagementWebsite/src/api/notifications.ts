import apiClient from './apiClient'

export interface NotificationLogDto {
  id: string
  type: string
  channel: string
  recipient: string
  template: string
  status: string
  errorMessage: string | null
  referenceId: string | null
  referenceType: string | null
  sentAt: string
}

interface NotifPage {
  data: NotificationLogDto[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export const getNotificationLogs = (params?: {
  type?: string
  status?: string
  referenceId?: string
  size?: number
}) =>
  apiClient.get<NotifPage>('/notifications/log', {
    params: { size: 30, ...params },
  })

export const pollReservationNotifResult = (reservationId: string) =>
  apiClient.get<NotifPage>('/notifications/log', {
    params: { referenceId: reservationId, size: 1 },
  })
