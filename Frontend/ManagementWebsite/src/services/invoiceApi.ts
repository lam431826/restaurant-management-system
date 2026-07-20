import { apiData } from './apiClient'

export type InvoiceStatus = 'ACTIVE' | 'MERGED' | 'SPLIT'

export interface InvoiceSummary {
  id: string
  orderId: string
  subtotal: number
  discountAmount: number
  totalAmount: number
  paid: boolean
  promotionId: string | null
  createdAt: string
  status: InvoiceStatus
  mergedIntoInvoiceId: string | null
  splitFromInvoiceId: string | null
}

export interface InvoiceItem {
  menuItemId: string
  menuItemName: string
  quantity: number
  unitPrice: number
  lineTotal: number
  note: string | null
  orderItemId: string
  allocationId: string
}

export interface InvoiceDetail extends InvoiceSummary {
  promotionCode: string | null
  items: InvoiceItem[]
  splitChildInvoiceIds: string[]
  mergedSourceInvoiceIds: string[]
}

export interface InvoiceMutationResponse {
  id: string
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

export interface SplitInvoiceGroupRequest {
  allocationIds: string[]
}

export interface SplitInvoiceRequest {
  groups: SplitInvoiceGroupRequest[]
}

export interface SplitInvoiceChildResponse {
  invoiceId: string
  subtotal: number
  totalAmount: number
  sourceAllocationIds: string[]
  newAllocationIds: string[]
}

export interface SplitInvoiceResponse {
  sourceInvoiceId: string
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
  return apiData<InvoiceSummary[]>(`/api/invoices${query ? `?${query}` : ''}`)
}

export const getInvoiceById = (id: string) =>
  apiData<InvoiceDetail>(`/api/invoices/${id}`)

export const generateInvoice = (request: GenerateInvoiceRequest) =>
  apiData<InvoiceMutationResponse>('/api/invoices', {
    method: 'POST',
    body: JSON.stringify(request),
  })

export const applyInvoiceDiscount = (invoiceId: string, promotionCode: string) =>
  apiData<InvoiceMutationResponse>(`/api/invoices/${invoiceId}/discount`, {
    method: 'PUT',
    body: JSON.stringify({ promotionCode }),
  })

export const sendInvoice = (invoiceId: string) =>
  apiData<SendInvoiceResponse>(`/api/invoices/${invoiceId}/send`, {
    method: 'POST',
  })

export const splitInvoice = (invoiceId: string, request: SplitInvoiceRequest) =>
  apiData<SplitInvoiceResponse>(`/api/invoices/${invoiceId}/split`, {
    method: 'POST',
    body: JSON.stringify(request),
  })

export const mergeInvoices = (request: MergeInvoiceRequest) =>
  apiData<MergeInvoiceResponse>('/api/invoices/merge', {
    method: 'POST',
    body: JSON.stringify(request),
  })
