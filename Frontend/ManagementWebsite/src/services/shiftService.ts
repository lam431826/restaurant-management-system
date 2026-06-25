import { api, ApiError } from './api'
import type { ApiResponse } from './api'

export type PaymentMethodKey = 'CASH' | 'CARD' | 'QR' | 'E_WALLET'

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodKey, string> = {
  CASH: 'Tiền mặt',
  CARD: 'Thẻ',
  QR: 'QR',
  E_WALLET: 'Ví điện tử',
}

export interface PaymentBreakdown {
  method: PaymentMethodKey
  expectedAmount: number
  actualAmount: number
  variance: number
}

export interface CashMovementDetail {
  id: string
  type: 'CASH_IN' | 'CASH_OUT'
  amount: number
  reason: string | null
  operatorId: string
  createdAt: string
}

export interface ShiftSummary {
  id: string
  cashierId: string
  closedBy: string | null
  status: 'OPEN' | 'CLOSED'
  openedAt: string
  closedAt: string | null
  openingCash: number
  handoverAmount: number | null
  totalCashIn: number
  totalCashOut: number
  totalRevenue: number
  totalVariance: number
  paymentBreakdown: PaymentBreakdown[]
  cashMovements: CashMovementDetail[]
  closingNote: string | null
}

export interface PaymentActualAmount {
  method: PaymentMethodKey
  amount: number
}

// Returns the caller's own open shift, or null if none.
export const getMyShift = async (): Promise<ShiftSummary | null> => {
  try {
    return await api.get<ShiftSummary>('/api/shifts/current')
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

export const openShift = (openingCash: number): Promise<ShiftSummary> =>
  api.post<ShiftSummary>('/api/shifts', { openingCash })

export const closeShift = (
  id: string,
  actualAmounts: PaymentActualAmount[],
  handoverAmount: number,
  closingNote?: string,
): Promise<ShiftSummary> =>
  api.put<ShiftSummary>(`/api/shifts/${id}/close`, {
    actualAmounts,
    handoverAmount,
    closingNote: closingNote ?? null,
  })

export const addCashMovement = (
  id: string,
  type: 'CASH_IN' | 'CASH_OUT',
  amount: number,
  reason?: string,
): Promise<void> =>
  api.post<ApiResponse<void>>(`/api/shifts/${id}/cash`, { type, amount, reason }).then(() => undefined)
