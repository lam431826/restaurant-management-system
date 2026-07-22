import { apiData } from './apiClient'

// Full method space, kept for safely displaying any historical QR/CARD/E_WALLET
// payment rows. Only CASH and VNPAY are selectable/creatable going forward.
export type PaymentMethod = 'CASH' | 'CARD' | 'QR' | 'E_WALLET' | 'VNPAY'
export type SelectablePaymentMethod = 'CASH' | 'VNPAY'

export type PaymentStatus = 'PENDING' | 'PAID' | 'CANCELLED'

export interface Payment {
  id: string
  invoiceId: string
  method: PaymentMethod
  amount: number
  status: string
  // QR/VNPAY: the gateway's transaction reference. CASH: null.
  gatewayRef: string | null
  receivedAmount: number | null
  changeAmount: number | null
  expiresAt: string | null
  paidAt: string | null
  createdAt: string
  // VNPAY only — null for every other method.
  vnpTransactionNo: string | null
  vnpResponseCode: string | null
  vnpTransactionStatus: string | null
  vnpBankCode: string | null
  vnpCardType: string | null
}

export interface VnpayCreateResult {
  paymentId: string
  txnRef: string
  paymentUrl: string
  amount: number
  expiresAt: string
}

// PENDING/FAILED/CANCELLED leave the invoice unpaid; EXPIRED is a client-facing label for
// a PENDING attempt whose payment window has passed with no gateway confirmation.
export type VnpayStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'EXPIRED'

export interface VnpayStatusResult {
  txnRef: string
  invoiceId: string
  invoiceCode: string | null
  orderId: string | null
  orderCode: string | null
  tableId: string | null
  status: VnpayStatus
  amount: number
  paidAt: string | null
}

// CASH only — immediate PAID. receivedAmount is required and must cover the total.
export const processCashPayment = (invoiceId: string, receivedAmount: number) =>
  apiData<Payment>('/api/payments', {
    method: 'POST',
    body: JSON.stringify({ invoiceId, method: 'CASH', receivedAmount }),
  })

// VNPAY Sandbox — creates (or reuses) a PENDING attempt and returns a signed redirect URL.
// The caller must navigate the browser to paymentUrl; there is no in-app "confirm" step.
export const createVnpayPayment = (invoiceId: string) =>
  apiData<VnpayCreateResult>('/api/payments/vnpay/create', {
    method: 'POST',
    body: JSON.stringify({ invoiceId }),
  })

// Polled by the VNPAY result page after the browser returns from the gateway. Never trust
// the Return URL's own query parameters — this is the only source of truth on the frontend.
export const getVnpayStatus = (txnRef: string) =>
  apiData<VnpayStatusResult>(`/api/payments/vnpay/status/${encodeURIComponent(txnRef)}`)

// Asks the backend to query VNPAY directly (QueryDR) and settle the attempt. Needed because
// VNPAY cannot deliver IPN to localhost, which otherwise leaves a paid transaction stuck
// PENDING locally. Safe to call repeatedly — settlement side effects happen only once.
export const reconcileVnpayPayment = (txnRef: string) =>
  apiData<VnpayStatusResult>(`/api/payments/vnpay/reconcile/${encodeURIComponent(txnRef)}`, {
    method: 'POST',
  })

export const getPayments = (invoiceId?: string) => {
  const params = new URLSearchParams()
  if (invoiceId) params.set('invoiceId', invoiceId)
  const query = params.toString()
  return apiData<Payment[]>(`/api/payments${query ? `?${query}` : ''}`)
}
