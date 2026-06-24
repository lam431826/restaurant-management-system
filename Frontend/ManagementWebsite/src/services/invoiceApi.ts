import { apiData } from './apiClient'

export interface InvoiceSummary {
  id: string
  orderId: string
  subtotal: number
  discountAmount: number
  totalAmount: number
  paid: boolean
  promotionId: string | null
  createdAt: string
}

export interface InvoiceItem {
  menuItemId: string
  menuItemName: string
  quantity: number
  unitPrice: number
  lineTotal: number
  note: string | null
}

export interface InvoiceDetail extends InvoiceSummary {
  promotionCode: string | null
  items: InvoiceItem[]
}

export interface InvoiceMutationResponse {
  id: string
  orderId: string
  subtotal: number
  discountAmount: number
  totalAmount: number
  paid: boolean
  createdAt: string
}

export interface InvoiceFilters {
  paid?: boolean
  orderId?: string
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
