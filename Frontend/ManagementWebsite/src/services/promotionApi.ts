import { apiData } from './apiClient'

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

export const getPromotions = () => apiData<Promotion[]>('/api/promotions')

export const getPromotionById = (id: string) =>
  apiData<Promotion>(`/api/promotions/${id}`)

export const createPromotion = (request: CreatePromotionRequest) =>
  apiData<Promotion>('/api/promotions', {
    method: 'POST',
    body: JSON.stringify(request),
  })

export const updatePromotion = (id: string, request: UpdatePromotionRequest) =>
  apiData<Promotion>(`/api/promotions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(request),
  })

export const deletePromotion = (id: string) =>
  apiData<void>(`/api/promotions/${id}`, {
    method: 'DELETE',
  })
