import apiClient from './apiClient'
import type { PageMeta } from './employees'

/* ── enums (string unions mirroring backend) ─────────────────────────────── */
export type CashFlowType = 'RECEIPT' | 'PAYMENT'
export type CashFlowMethod = 'CASH' | 'BANK' | 'EWALLET'
// Manual creation (CashFlowModal) only ever assigns EMPLOYEE/OTHER; CUSTOMER is
// reserved for receipts auto-generated when an invoice gets paid.
export type PartnerGroup = 'EMPLOYEE' | 'OTHER'
export type VoucherPartnerGroup = PartnerGroup | 'CUSTOMER'

export const METHOD_LABEL: Record<CashFlowMethod, string> = {
  CASH: 'Tiền mặt',
  BANK: 'Chuyển khoản',
  EWALLET: 'Ví điện tử',
}

export const CASH_FLOW_METHODS: CashFlowMethod[] = ['CASH', 'BANK', 'EWALLET']

/* ── list/filter UI constants (kept here so react-refresh/only-export-components
   doesn't flag co-located value exports in component files) ─────────────── */
export type FundFilter = 'ALL' | CashFlowMethod
export type TimePreset = 'THIS_MONTH' | 'CUSTOM'
export type StatusFilter = 'PAID' | 'VOIDED'
export type AccountingFilter = 'ALL' | 'YES' | 'NO'
export type PartnerScope = 'ALL' | VoucherPartnerGroup

export interface CashBookFilterState {
  fund: FundFilter
  timePreset: TimePreset
  dateFrom: Date | null
  dateTo: Date | null
  docTypes: CashFlowType[]
  categoryIds: string[]
  statuses: StatusFilter[]
  accounting: AccountingFilter
  createdBy: string
  partnerScope: PartnerScope
  partnerQuery: string
}

export const FUND_LABEL: Record<FundFilter, string> = {
  ALL: 'Tổng quỹ',
  CASH: 'Tiền mặt',
  BANK: 'Tài khoản ngân hàng',
  EWALLET: 'Ví điện tử',
}

export const defaultCashBookFilters: CashBookFilterState = {
  fund: 'ALL',
  timePreset: 'THIS_MONTH',
  dateFrom: null,
  dateTo: null,
  docTypes: [],
  categoryIds: [],
  statuses: ['PAID'],
  accounting: 'ALL',
  createdBy: '',
  partnerScope: 'ALL',
  partnerQuery: '',
}

export type ColumnKey = 'time' | 'category' | 'method' | 'partner' | 'amount'
export const COLUMN_LABEL: Record<ColumnKey, string> = {
  time: 'Thời gian',
  category: 'Loại thu chi',
  method: 'Loại sổ quỹ',
  partner: 'Người nộp/nhận',
  amount: 'Giá trị',
}

/* ── app-facing shapes ───────────────────────────────────────────────────── */
// Present on RECEIPT vouchers auto-created when an invoice got paid, derived from
// sourceType at the API boundary — the backend doesn't persist a separate invoice recap.
export interface SourceInvoice {
  invoiceCode: string
  invoiceTime: string
  voucherValue: number
  prePaid: number
  collected: number
  status: string
}

export interface CashFlowCategory {
  id: string
  code: string | null
  name: string
  type: CashFlowType
  description?: string
  accountingToIncome?: boolean
}

export interface CashFlowVoucher {
  id: string
  code: string
  type: CashFlowType
  createdAt: string // voucher's business date/time (backend field: occurredAt)
  categoryId: string
  method: CashFlowMethod
  partnerGroup: VoucherPartnerGroup
  partnerId: string | null
  partnerName: string
  amount: number
  note: string
  accountingToIncome: boolean
  createdBy: string
  voided: boolean
  sourceInvoice?: SourceInvoice
}

/* ── raw backend DTOs + mappers ──────────────────────────────────────────── */
interface CategoryResponseDto {
  id: string
  code: string | null
  name: string
  type: CashFlowType
  description: string | null
  accountingToIncome: boolean
}

const mapCategory = (dto: CategoryResponseDto): CashFlowCategory => ({
  id: dto.id,
  code: dto.code,
  name: dto.name,
  type: dto.type,
  description: dto.description ?? undefined,
  accountingToIncome: dto.accountingToIncome,
})

interface VoucherResponseDto {
  id: string
  code: string
  type: CashFlowType
  occurredAt: string
  categoryId: string
  method: CashFlowMethod
  partnerGroup: VoucherPartnerGroup
  partnerId: string | null
  partnerName: string
  amount: number
  note: string | null
  accountingToIncome: boolean
  sourceType: 'MANUAL' | 'PAYROLL' | 'INVOICE_PAYMENT'
  createdBy: string | null
  voided: boolean
}

const mapVoucher = (dto: VoucherResponseDto): CashFlowVoucher => ({
  id: dto.id,
  code: dto.code,
  type: dto.type,
  createdAt: dto.occurredAt,
  categoryId: dto.categoryId,
  method: dto.method,
  partnerGroup: dto.partnerGroup,
  partnerId: dto.partnerId,
  partnerName: dto.partnerName,
  amount: dto.amount,
  note: dto.note ?? '',
  accountingToIncome: dto.accountingToIncome,
  createdBy: dto.createdBy ?? '',
  voided: dto.voided,
  sourceInvoice: dto.sourceType === 'INVOICE_PAYMENT' ? {
    invoiceCode: dto.code,
    invoiceTime: dto.occurredAt,
    voucherValue: dto.amount,
    prePaid: 0,
    collected: dto.amount,
    status: dto.voided ? 'Đã hủy' : 'Đã thanh toán',
  } : undefined,
})

/* ── calls ───────────────────────────────────────────────────────────────── */
export interface VouchersPage {
  data: CashFlowVoucher[]
  pagination: PageMeta
}

export interface VoucherListParams {
  search?: string
  fund?: CashFlowMethod
  from?: string
  to?: string
  types?: CashFlowType[]
  categoryIds?: string[]
  voided?: boolean
  accountingToIncome?: boolean
  createdBy?: string
  partnerScope?: VoucherPartnerGroup
  partnerQuery?: string
  page?: number
  size?: number
}

// No pagination UI in the cash book table — fetch a large page and filter/sort client-side,
// same shape as the previous in-memory mock array.
export const listVouchers = async (params: VoucherListParams = {}): Promise<VouchersPage> => {
  const res = await apiClient.get<{ data: VoucherResponseDto[]; pagination: PageMeta }>('/cashbook/vouchers', {
    params: { size: 1000, ...params },
    paramsSerializer: { indexes: null },
  })
  return { data: res.data.data.map(mapVoucher), pagination: res.data.pagination }
}

export const listCategories = async (): Promise<CashFlowCategory[]> => {
  const res = await apiClient.get<{ data: CategoryResponseDto[] }>('/cashbook/categories')
  return res.data.data.map(mapCategory)
}

export interface CategoryPayload {
  name: string
  type: CashFlowType
  description?: string
  accountingToIncome: boolean
}

export const createCategory = async (payload: CategoryPayload): Promise<CashFlowCategory> => {
  const res = await apiClient.post<{ data: CategoryResponseDto }>('/cashbook/categories', payload)
  return mapCategory(res.data.data)
}

export const updateCategory = async (id: string, payload: CategoryPayload): Promise<CashFlowCategory> => {
  const res = await apiClient.put<{ data: CategoryResponseDto }>(`/cashbook/categories/${id}`, payload)
  return mapCategory(res.data.data)
}

export const deleteCategory = (id: string) => apiClient.delete(`/cashbook/categories/${id}`)

export interface CreateVoucherPayload {
  type: CashFlowType
  occurredAt: string
  categoryId: string
  method: CashFlowMethod
  partnerGroup: PartnerGroup
  partnerId?: string | null
  partnerName: string
  amount: number
  note?: string
  accountingToIncome: boolean
}

export const createVoucher = async (payload: CreateVoucherPayload): Promise<CashFlowVoucher> => {
  const res = await apiClient.post<{ data: VoucherResponseDto }>('/cashbook/vouchers', payload)
  return mapVoucher(res.data.data)
}

export const voidVoucher = async (id: string): Promise<CashFlowVoucher> => {
  const res = await apiClient.put<{ data: VoucherResponseDto }>(`/cashbook/vouchers/${id}/void`)
  return mapVoucher(res.data.data)
}

export interface SummaryDto {
  openingBalance: number
  totalIncome: number
  totalExpense: number
  closingBalance: number
}

export const getSummary = async (params: { fund?: CashFlowMethod } = {}): Promise<SummaryDto> => {
  const res = await apiClient.get<{ data: SummaryDto }>('/cashbook/summary', { params })
  return res.data.data
}
