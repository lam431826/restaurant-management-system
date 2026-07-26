import { api, type ApiResponse } from './api'

export type InvoiceStatus = 'ACTIVE' | 'MERGED' | 'SPLIT'

export interface InvoiceSummary {
  id: string
  code: string
  orderId: string
  orderCode: string
  subtotal: number
  discountAmount: number
  totalAmount: number
  paid: boolean
  promotionId: string | null
  createdAt: string
  status: InvoiceStatus
  mergedIntoInvoiceId: string | null
  mergedIntoInvoiceCode: string | null
  splitFromInvoiceId: string | null
  splitFromInvoiceCode: string | null
}

export interface InvoiceItem {
  menuItemId: string
  menuItemCode: string | null
  menuItemName: string
  quantity: number
  unitPrice: number
  lineTotal: number
  note: string | null
  orderItemId: string
  allocationId: string
}

export interface InvoiceDetail extends InvoiceSummary {
  createdBy: string | null
  promotionCode: string | null
  items: InvoiceItem[]
  splitChildInvoiceIds: string[]
  splitChildInvoiceCodes: string[]
  mergedSourceInvoiceIds: string[]
  mergedSourceInvoiceCodes: string[]
}

export interface InvoiceMutationResponse {
  id: string
  code: string
  orderId: string
  subtotal: number
  discountAmount: number
  totalAmount: number
  paid: boolean
  createdAt: string
  status: InvoiceStatus
  mergedIntoInvoiceId: string | null
  splitFromInvoiceId: string | null
}

/** Take `quantity` units off the source allocation. Whole units only. */
export interface SplitInvoiceItemRequest {
  allocationId: string
  quantity: number
}

export interface SplitInvoiceGroupRequest {
  items: SplitInvoiceItemRequest[]
}

/**
 * Each group becomes one new child invoice peeled off the source. The source keeps whatever
 * is not listed here and must retain at least one unit, so one group is a valid split.
 */
export interface SplitInvoiceRequest {
  groups: SplitInvoiceGroupRequest[]
}

export interface SplitInvoiceChildResponse {
  invoiceId: string
  invoiceCode: string
  subtotal: number
  totalAmount: number
  sourceAllocationIds: string[]
  newAllocationIds: string[]
}

export interface SplitInvoiceResponse {
  sourceInvoiceId: string
  sourceInvoiceCode: string
  sourceStatus: InvoiceStatus
  sourceSubtotal: number
  sourceTotal: number
  children: SplitInvoiceChildResponse[]
}

export interface MergeInvoiceRequest {
  invoiceIds: string[]
}

export interface MergeInvoiceResponse {
  orderId: string
  sourceInvoiceIds: string[]
  targetInvoice: InvoiceSummary
}

export interface InvoiceFilters {
  paid?: boolean
  orderId?: string
  /** Lifecycle scope. Omitted means every status, which the Cashier view relies on. */
  status?: InvoiceStatus[]
}

export interface GenerateInvoiceRequest {
  orderId: string
  promotionCode: string | null
}

export interface SendInvoiceResponse {
  invoiceId: string
  orderId: string
  totalAmount: number
  paid: boolean
  sentAt: string
  deliveryMethod: string
  message: string
}

export const getInvoices = (filters: InvoiceFilters = {}) => {
  const params = new URLSearchParams()
  if (typeof filters.paid === 'boolean') params.set('paid', String(filters.paid))
  if (filters.orderId) params.set('orderId', filters.orderId)
  if (filters.status?.length) params.set('status', filters.status.join(','))
  const query = params.toString()
  return api.get<ApiResponse<InvoiceSummary[]>>(`/api/invoices${query ? `?${query}` : ''}`).then(response => response.data)
}

export const getInvoiceById = (id: string) =>
  api.get<ApiResponse<InvoiceDetail>>(`/api/invoices/${id}`).then(response => response.data)

export const generateInvoice = (request: GenerateInvoiceRequest) =>
  api.post<ApiResponse<InvoiceMutationResponse>>('/api/invoices', request).then(response => response.data)

export const applyInvoiceDiscount = (invoiceId: string, promotionCode: string) =>
  api.put<ApiResponse<InvoiceMutationResponse>>(`/api/invoices/${invoiceId}/discount`, { promotionCode }).then(response => response.data)

export const sendInvoice = (invoiceId: string) =>
  api.post<ApiResponse<SendInvoiceResponse>>(`/api/invoices/${invoiceId}/send`).then(response => response.data)

export const splitInvoice = (invoiceId: string, request: SplitInvoiceRequest) =>
  api.post<ApiResponse<SplitInvoiceResponse>>(`/api/invoices/${invoiceId}/split`, request).then(response => response.data)

export const mergeInvoices = (request: MergeInvoiceRequest) =>
  api.post<ApiResponse<MergeInvoiceResponse>>('/api/invoices/merge', request).then(response => response.data)
