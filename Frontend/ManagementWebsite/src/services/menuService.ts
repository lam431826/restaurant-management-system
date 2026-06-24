import { api } from './api'
import type { ApiResponse, PageResponse } from './api'

// ── Types (mirror backend DTOs) ────────────────────────────────────────

export interface MenuItem {
  id: string
  code: string | null
  categoryId: string
  name: string
  price: number
  costPrice: number | null
  description: string | null
  imageUrl: string | null
  menuType: string | null
  itemType: string | null
  tag: string | null
  trackStock: boolean
  available: boolean
}

export interface MenuCategory {
  id: string
  name: string
  displayOrder: number
  icon: string | null
  itemCount: number
}

export interface ImportResult {
  created: number
  updated: number
  failed: number
  errors: { row: number; reason: string }[]
}

export interface ItemSearchParams {
  q?: string
  categoryId?: string
  available?: boolean
  page?: number // 1-based
  size?: number
}

export interface CreateItemInput {
  categoryId: string
  name: string
  price: number
  code?: string
  costPrice?: number
  description?: string
  imageUrl?: string
  menuType?: string
  itemType?: string
  tag?: string
  trackStock?: boolean
  available?: boolean
}

export type UpdateItemInput = Partial<CreateItemInput>

export interface CategoryInput {
  name: string
  displayOrder: number
  icon?: string
}

// ── Items (MM-01 / MM-03) ──────────────────────────────────────────────

export const searchItems = (params: ItemSearchParams = {}): Promise<PageResponse<MenuItem>> =>
  api.get<PageResponse<MenuItem>>('/api/menu/items', {
    q: params.q,
    categoryId: params.categoryId,
    available: params.available,
    // backend Pageable is 0-based
    page: params.page ? params.page - 1 : 0,
    size: params.size ?? 20,
  })

export const createItem = (input: CreateItemInput): Promise<MenuItem> =>
  api.post<ApiResponse<MenuItem>>('/api/menu/items', input).then(r => r.data)

export const updateItem = (id: string, input: UpdateItemInput): Promise<MenuItem> =>
  api.put<ApiResponse<MenuItem>>(`/api/menu/items/${id}`, input).then(r => r.data)

export const setAvailability = (id: string, available: boolean): Promise<void> =>
  api.patch<void>(`/api/menu/items/${id}/availability`, { available })

export const deleteItem = (id: string): Promise<void> => api.del<void>(`/api/menu/items/${id}`)

export const bulkSetAvailability = (ids: string[], available: boolean): Promise<void> =>
  api.patch<void>('/api/menu/items/bulk-availability', { ids, available })

export const bulkDeleteItems = (ids: string[]): Promise<void> =>
  api.post<void>('/api/menu/items/bulk-delete', { ids })

// ── Categories (MM-02) ─────────────────────────────────────────────────

export const listCategories = (): Promise<MenuCategory[]> =>
  api.get<ApiResponse<MenuCategory[]>>('/api/menu/categories').then(r => r.data)

export const createCategory = (input: CategoryInput): Promise<MenuCategory> =>
  api.post<ApiResponse<MenuCategory>>('/api/menu/categories', input).then(r => r.data)

export const updateCategory = (id: string, input: CategoryInput): Promise<MenuCategory> =>
  api.put<ApiResponse<MenuCategory>>(`/api/menu/categories/${id}`, input).then(r => r.data)

export const reorderCategories = (orderedCategoryIds: string[]): Promise<void> =>
  api.put<void>('/api/menu/categories/reorder', { orderedCategoryIds })

export const deleteCategory = (id: string): Promise<void> =>
  api.del<void>(`/api/menu/categories/${id}`)

// ── Import / Export (MM-04) ────────────────────────────────────────────

export const importCsv = (file: File): Promise<ImportResult> => {
  const form = new FormData()
  form.append('file', file)
  return api.postForm<ApiResponse<ImportResult>>('/api/menu/import', form).then(r => r.data)
}

export const uploadImage = (file: File): Promise<string> => {
  const form = new FormData()
  form.append('file', file)
  return api.postForm<ApiResponse<{ url: string }>>('/api/menu/images', form).then(r => r.data.url)
}

export const exportCsv = async (): Promise<void> => {
  const blob = await api.getBlob('/api/menu/export')
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'menu-export.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
