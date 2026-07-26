import { api, type ApiResponse } from './api'

export interface Promotion {
  id: string
  code: string
  description: string
  discountPercent: number | null
  discountAmount: number | null
  validFrom: string | null
  validTo: string | null
  active: boolean
  usageLimit: number | null
  usedCount: number
  remainingUses: number | null
}

export interface CreatePromotionRequest {
  code: string
  description: string
  discountPercent: number | null
  discountAmount: number | null
  validFrom: string | null
  validTo: string | null
  usageLimit: number | null
}

export interface UpdatePromotionRequest extends CreatePromotionRequest {
  active: boolean
}

export const getPromotions = () =>
  api.get<ApiResponse<Promotion[]>>('/api/promotions').then(response => response.data)

export const getPromotionById = (id: string) =>
  api.get<ApiResponse<Promotion>>(`/api/promotions/${id}`).then(response => response.data)

export const createPromotion = (request: CreatePromotionRequest) =>
  api.post<ApiResponse<Promotion>>('/api/promotions', request).then(response => response.data)

export const updatePromotion = (id: string, request: UpdatePromotionRequest) =>
  api.put<ApiResponse<Promotion>>(`/api/promotions/${id}`, request).then(response => response.data)

export const deletePromotion = (id: string) =>
  api.del<void>(`/api/promotions/${id}`)
