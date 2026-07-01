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
  status: 'OPEN' | 'CLOSED' | 'PENDING_RECON' | 'STALE' | 'FORCE_CLOSED' | 'MERGED'
  shiftType: 'NORMAL' | 'FLOATING' | null
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

// ── CS-07: Floating shift & merge (BR-CS-18/19) ──────────────────────────────
export interface OpenShiftBrief {
  shiftId: string
  cashierId: string
  cashierName: string
  openedAt: string
}

// BR-CS-18: open a floating shift to cover while a main shift owner is briefly away.
export const openFloatingShift = (): Promise<ShiftSummary> =>
  api.post<ShiftSummary>('/api/shifts/floating', {})

// CS-07: other cashiers' OPEN normal shifts — the merge targets for a floating shift.
export const getOpenNormalShifts = (): Promise<OpenShiftBrief[]> =>
  api.get<OpenShiftBrief[]>('/api/shifts/open-normal')

// BR-CS-19: merge a floating shift into a main shift (cash re-tagged, cashier_id kept).
export const mergeFloatingShift = (
  floatingId: string,
  mainShiftId: string,
  countedCash: number,
  note?: string,
): Promise<ShiftSummary> =>
  api.post<ShiftSummary>(`/api/shifts/${floatingId}/merge`, {
    mainShiftId, countedCash, note: note ?? null,
  })

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

// BR-CS-15: manager force-closes a stale/open shift the cashier never closed.
export const forceCloseShift = (
  id: string,
  cashActual: number,
  reason: string,
): Promise<ShiftSummary> =>
  api.put<ShiftSummary>(`/api/shifts/${id}/force-close`, { cashActual, reason })

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
  status: 'OPEN' | 'CLOSED' | 'PENDING_RECON' | 'STALE' | 'FORCE_CLOSED'
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
