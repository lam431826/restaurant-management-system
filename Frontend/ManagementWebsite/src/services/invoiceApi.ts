import { apiData } from './apiClient'

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
