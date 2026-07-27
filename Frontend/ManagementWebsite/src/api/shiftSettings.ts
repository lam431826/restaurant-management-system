import { api } from '../services/api'
import type { ApiResponse } from '../services/api'

export interface ShiftSettingsDto {
  shiftClosingRequired: boolean
  managerConfirmClosing: boolean
  updatedAt?: string
}

export const getShiftSettings = (): Promise<ShiftSettingsDto> =>
  api.get<ApiResponse<ShiftSettingsDto>>('/api/shifts/settings').then(r => r.data)

export const updateShiftSettings = (req: ShiftSettingsDto): Promise<ShiftSettingsDto> =>
  api.put<ApiResponse<ShiftSettingsDto>>('/api/shifts/settings', req).then(r => r.data)
