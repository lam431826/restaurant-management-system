import { api } from './api'
import type { PageResponse } from './api'

export type OrderStatus = 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'SERVED' | 'CLOSED' | 'CANCELLED'
export type CookingStatus = 'PENDING' | 'COOKING' | 'READY' | 'SERVED' | 'REJECTED'

export interface OrderItemLine {
  orderItemId: string
  menuItemId: string
  menuItemName: string
  quantity: number
  unitPrice: number
  note: string | null
  cookingStatus: CookingStatus
  rejectionNote?: string | null
  isQrOrder?: boolean
  qrOrder?: boolean
}

export interface Order {
  id: string
  tableId: string
  tableName: string
  status: OrderStatus
  items: OrderItemLine[]
  totalAmount: number
  createdAt: string
}

export interface OrderItemInput {
  menuItemId: string
  quantity: number
  note?: string
}

export interface AssistanceRequest {
  id: string
  tableId: string
  tableName: string
  message: string
  resolved: boolean
  resolvedBy: string | null
  resolvedAt: string | null
  createdAt: string
}

// ── Orders ──────────────────────────────────────────────────────────────

export const listOrders = (page = 0, size = 100): Promise<PageResponse<Order>> =>
  api.get<PageResponse<Order>>('/api/orders', { page, size })

export const getOrder = (id: string): Promise<Order> => api.get<Order>(`/api/orders/${id}`)

export const createOrder = (tableId: string, items: OrderItemInput[], note?: string): Promise<Order> =>
  api.post<Order>('/api/orders', { tableId, items, note })

export const addOrderItems = (orderId: string, items: OrderItemInput[]): Promise<Order> =>
  api.put<Order>(`/api/orders/${orderId}/items`, { items })

export const removeOrderItem = (orderId: string, orderItemId: string): Promise<Order> =>
  api.del<Order>(`/api/orders/${orderId}/items/${orderItemId}`)

export const updateOrderItemNote = (
  orderId: string,
  orderItemId: string,
  note: string
): Promise<Order> => api.put<Order>(`/api/orders/${orderId}/items/${orderItemId}/note`, { note })

export const updateOrderItemStatus = (
  orderId: string,
  orderItemId: string,
  status: CookingStatus,
  rejectionNote?: string
): Promise<Order> => api.put<Order>(`/api/orders/${orderId}/items/${orderItemId}/status`, { status, rejectionNote })

export const acceptOrder = (orderId: string): Promise<Order> =>
  api.put<Order>(`/api/orders/${orderId}/accept`, {})

export const closeOrder = (orderId: string): Promise<Order> =>
  api.put<Order>(`/api/orders/${orderId}/close`, {})

export const updateOrderStatus = (orderId: string, status: OrderStatus): Promise<Order> =>
  api.put<Order>(`/api/orders/${orderId}/status`, { status })

export const cancelOrder = (orderId: string, reason: string): Promise<Order> =>
  api.put<Order>(`/api/orders/${orderId}/cancel`, { reason })

// ── Assistance requests ("call waiter") ───────────────────────────────────

export const listPendingAssistance = (): Promise<AssistanceRequest[]> =>
  api.get<AssistanceRequest[]>('/api/orders/assistance/pending')

export const respondAssistance = (id: string): Promise<void> =>
  api.put<void>(`/api/orders/assistance/${id}/respond`, {})
