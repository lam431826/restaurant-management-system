import { apiData } from './apiClient'

// Full method space, kept for safely displaying any historical CARD/E_WALLET
// payment rows. Only CASH and QR are selectable/creatable going forward.
export type PaymentMethod = 'CASH' | 'CARD' | 'QR' | 'E_WALLET'
export type SelectablePaymentMethod = 'CASH' | 'QR'

export type PaymentStatus = 'PENDING' | 'PAID' | 'CANCELLED'

export interface Payment {
  id: string
  invoiceId: string
  method: PaymentMethod
  amount: number
  status: string
  // QR: the simulated external gateway's transaction reference. CASH: null.
  gatewayRef: string | null
  receivedAmount: number | null
  changeAmount: number | null
  expiresAt: string | null
  paidAt: string | null
  createdAt: string
}

// CASH only — immediate PAID. receivedAmount is required and must cover the total.
export const processCashPayment = (invoiceId: string, receivedAmount: number) =>
  apiData<Payment>('/api/payments', {
    method: 'POST',
    body: JSON.stringify({ invoiceId, method: 'CASH', receivedAmount }),
  })

// QR — creates (or returns the existing) simulated external PENDING transaction.
export const initiateQrPayment = (invoiceId: string) =>
  apiData<Payment>('/api/payments/qr/initiate', {
    method: 'POST',
    body: JSON.stringify({ invoiceId }),
  })

// Stands in for the external gateway's success callback/webhook.
export const simulateQrPaymentSuccess = (paymentId: string) =>
  apiData<Payment>(`/api/payments/qr/${paymentId}/simulate-success`, {
    method: 'POST',
  })

export const cancelQrPayment = (paymentId: string) =>
  apiData<Payment>(`/api/payments/qr/${paymentId}/cancel`, {
    method: 'POST',
  })

export const getPayments = (invoiceId?: string) => {
  const params = new URLSearchParams()
  if (invoiceId) params.set('invoiceId', invoiceId)
  const query = params.toString()
  return apiData<Payment[]>(`/api/payments${query ? `?${query}` : ''}`)
}
