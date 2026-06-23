import apiClient from './apiClient'

export interface AuditLogDto {
  id: string
  actorId: string | null
  actorUsername: string
  action: string
  targetEntity: string | null
  targetId: string | null
  detail: string | null
  ipAddress: string | null
  createdAt: string
}

interface AuditLogPage {
  data: AuditLogDto[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export const listAuditLogs = (params?: {
  actorUsername?: string
  action?: string
  targetEntity?: string
  targetId?: string
  from?: string
  to?: string
  page?: number
  size?: number
}) =>
  apiClient.get<AuditLogPage>('/audit-logs', { params: { size: 30, ...params } })
