import { apiData } from './apiClient'

export type PaymentMethod = 'CASH' | 'CARD' | 'QR' | 'E_WALLET'

export interface Payment {
  id: string
  invoiceId: string
  method: PaymentMethod
  amount: number
  status: string
  gatewayRef: string | null
  createdAt: string
}

export const processPayment = (invoiceId: string, method: PaymentMethod) =>
  apiData<Payment>('/api/payments', {
    method: 'POST',
    body: JSON.stringify({ invoiceId, method }),
  })

export const getPayments = (invoiceId?: string) => {
  const params = new URLSearchParams()
  if (invoiceId) params.set('invoiceId', invoiceId)
  const query = params.toString()
  return apiData<Payment[]>(`/api/payments${query ? `?${query}` : ''}`)
}
