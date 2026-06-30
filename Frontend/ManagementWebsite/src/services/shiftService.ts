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
  status: 'OPEN' | 'CLOSED' | 'PENDING_RECON'
  openedAt: string
  closedAt: string | null
  openingCash: number
  handoverAmount: number | null
  totalCashIn: number
  totalCashOut: number
  totalRevenue: number
  totalVariance: number
  cardBatchTotal: number | null
  paymentBreakdown: PaymentBreakdown[]
  cashMovements: CashMovementDetail[]
  closingNote: string | null
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

// BR-CS-09/11: the suggested opening float = the cashier's last handover amount.
export const getSuggestedOpeningFloat = (): Promise<number> =>
  api.get<number>('/api/shifts/suggested-float')

// CS-04: cashier submits only the counted physical cash. The three online
// channels are auto-recorded server-side (actual = recorded). cardBatchTotal is
// an optional informational cross-check (BR-CS-12).
export const closeShift = (
  id: string,
  cashActual: number,
  handoverAmount: number,
  cardBatchTotal?: number,
  closingNote?: string,
): Promise<ShiftSummary> =>
  api.put<ShiftSummary>(`/api/shifts/${id}/close`, {
    cashActual,
    handoverAmount,
    cardBatchTotal: cardBatchTotal ?? null,
    closingNote: closingNote ?? null,
  })

// ── CS-05: Manager daily summary ────────────────────────────────────────────
export interface DailyMethodTotal {
  method: PaymentMethodKey
  expected: number
  actual: number
  variance: number
}

export interface DailyCashierShiftRow {
  shiftId: string
  cashierId: string
  cashierName: string
  status: 'OPEN' | 'CLOSED' | 'PENDING_RECON'
  openedAt: string
  closedAt: string | null
  openingCash: number
  handoverAmount: number | null
  totalRevenue: number
  totalCashIn: number
  totalCashOut: number
  totalVariance: number
  paymentBreakdown: PaymentBreakdown[]
}

export interface DailySummary {
  date: string
  incomplete: boolean
  shiftCount: number
  totalRevenue: number
  totalCashIn: number
  totalCashOut: number
  totalVariance: number
  methodTotals: DailyMethodTotal[]
  shifts: DailyCashierShiftRow[]
}

export const getDailySummary = (date: string): Promise<DailySummary> =>
  api.get<DailySummary>('/api/shifts/daily-summary', { date })

export const addCashMovement = (
  id: string,
  type: 'CASH_IN' | 'CASH_OUT',
  amount: number,
  reason?: string,
): Promise<void> =>
  api.post<ApiResponse<void>>(`/api/shifts/${id}/cash`, { type, amount, reason }).then(() => undefined)
