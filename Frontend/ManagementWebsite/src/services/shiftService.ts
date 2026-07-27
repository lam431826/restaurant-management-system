import { api, ApiError } from './api'

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

export interface ShiftSummary {
  id: string
  cashierId: string
  closedBy: string | null
  status: 'OPEN' | 'CLOSED' | 'PENDING_RECON' | 'PENDING_MANAGER_CONFIRM' | 'STALE' | 'FORCE_CLOSED'
  shiftType: 'NORMAL' | null
  openedAt: string
  closedAt: string | null
  openingCash: number
  handoverAmount: number | null
  totalRevenue: number
  totalVariance: number
  cardBatchTotal: number | null
  paymentBreakdown: PaymentBreakdown[]
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

// BR-CS-15: manager force-closes a stale/open shift the cashier never closed.
export const forceCloseShift = (
  id: string,
  cashActual: number,
  reason: string,
): Promise<ShiftSummary> =>
  api.put<ShiftSummary>(`/api/shifts/${id}/force-close`, { cashActual, reason })

// Manager approves a shift sitting in PENDING_MANAGER_CONFIRM.
export const approveCloseShift = (id: string): Promise<ShiftSummary> =>
  api.put<ShiftSummary>(`/api/shifts/${id}/approve-close`, {})

// Manager rejects a shift sitting in PENDING_MANAGER_CONFIRM — it reopens to OPEN.
export const rejectCloseShift = (id: string, reason: string): Promise<ShiftSummary> =>
  api.put<ShiftSummary>(`/api/shifts/${id}/reject-close`, { reason })

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
  status: 'OPEN' | 'CLOSED' | 'PENDING_RECON' | 'PENDING_MANAGER_CONFIRM' | 'STALE' | 'FORCE_CLOSED'
  openedAt: string
  closedAt: string | null
  openingCash: number
  handoverAmount: number | null
  totalRevenue: number
  totalVariance: number
  paymentBreakdown: PaymentBreakdown[]
}

export interface DailySummary {
  date: string
  incomplete: boolean
  shiftCount: number
  totalRevenue: number
  totalVariance: number
  methodTotals: DailyMethodTotal[]
  shifts: DailyCashierShiftRow[]
}

export const getDailySummary = (date: string): Promise<DailySummary> =>
  api.get<DailySummary>('/api/shifts/daily-summary', { date })
