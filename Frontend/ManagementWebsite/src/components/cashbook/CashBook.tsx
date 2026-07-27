import { useCallback, useEffect, useMemo, useState } from 'react'
import CashBookFilters from './CashBookFilters'
import CashBookSummary from './CashBookSummary'
import CashBookTable from './CashBookTable'
import CashBookToolbar from './CashBookToolbar'
import CashFlowModal from './CashFlowModal'
import {
  listVouchers, listCategories, getSummary, exportVouchersUnpaged,
  createCategory as apiCreateCategory, updateCategory as apiUpdateCategory, deleteCategory as apiDeleteCategory,
  createVoucher as apiCreateVoucher, updateVoucher as apiUpdateVoucher, voidVoucher as apiVoidVoucher,
  METHOD_LABEL, FUND_LABEL, defaultCashBookFilters,
} from '../../api/cashbook'
import type {
  CashBookFilterState, CashFlowCategory, CashFlowMethod, CashFlowType, CashFlowVoucher, ColumnKey,
  CreateVoucherPayload, VoucherListParams,
} from '../../api/cashbook'

type ModalState =
  | { mode: 'create'; type: CashFlowType; method: CashFlowMethod }
  | { mode: 'edit'; voucher: CashFlowVoucher }
  | null

const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = {
  time: true, category: true, method: true, partner: true, amount: true,
}

const PAGE_SIZE = 20

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)

// Wall-clock time as-is, no UTC round-trip — the backend's LocalDateTime parsing expects
// no timezone offset (see CashFlowModal.tsx's toBackendDateTime for the same constraint).
const toBackendDateTime = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// null means the filter combination can never match anything (no status selected) —
// callers should skip the request entirely rather than send it.
const buildVoucherParams = (
  filters: CashBookFilterState,
  search: string,
): Omit<VoucherListParams, 'page' | 'size'> | null => {
  if (filters.statuses.length === 0) return null
  const params: Omit<VoucherListParams, 'page' | 'size'> = {}
  if (search.trim()) params.search = search.trim()
  if (filters.fund !== 'ALL') params.fund = filters.fund
  if (filters.docTypes.length > 0) params.types = filters.docTypes
  if (filters.categoryIds.length > 0) params.categoryIds = filters.categoryIds
  if (filters.statuses.length === 1) params.voided = filters.statuses[0] === 'VOIDED'
  if (filters.accounting !== 'ALL') params.accountingToIncome = filters.accounting === 'YES'
  if (filters.createdBy) params.createdBy = filters.createdBy
  if (filters.partnerScope !== 'ALL') params.partnerScope = filters.partnerScope
  if (filters.partnerQuery) params.partnerQuery = filters.partnerQuery
  const now = new Date()
  const rangeFrom = filters.timePreset === 'THIS_MONTH' ? startOfMonth(now) : filters.dateFrom
  const rangeTo = filters.timePreset === 'THIS_MONTH' ? endOfMonth(now) : filters.dateTo
  if (rangeFrom) params.from = toBackendDateTime(rangeFrom)
  if (rangeTo) params.to = toBackendDateTime(rangeTo)
  return params
}

const errMsg = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback

const exportCsv = (vouchers: CashFlowVoucher[], categories: CashFlowCategory[]) => {
  const categoryName = (id: string) => categories.find(c => c.id === id)?.name ?? ''
  const header = ['Mã phiếu', 'Thời gian', 'Loại thu chi', 'Loại sổ quỹ', 'Người nộp/nhận', 'Giá trị', 'Trạng thái']
  const rows = vouchers.map(v => [
    v.code,
    v.createdAt,
    categoryName(v.categoryId),
    METHOD_LABEL[v.method],
    v.partnerName,
    v.type === 'RECEIPT' ? v.amount : -v.amount,
    v.voided ? 'Đã hủy' : 'Đã thanh toán',
  ])
  const csv = [header, ...rows]
    .map(line => line.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `so-quy-${new Date().toISOString().slice(0, 10)}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

const CashBook = () => {
  const [categories, setCategories] = useState<CashFlowCategory[]>([])
  const [vouchers, setVouchers] = useState<CashFlowVoucher[]>([])
  const [openingBalance, setOpeningBalance] = useState(0)
  const [filters, setFilters] = useState<CashBookFilterState>(defaultCashBookFilters)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<ModalState>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(DEFAULT_VISIBLE_COLUMNS)
  const [vouchersLoading, setVouchersLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const loadVouchers = useCallback(
    async (nextPage: number, nextFilters: CashBookFilterState, nextSearch: string) => {
      setVouchersLoading(true)
      try {
        const params = buildVoucherParams(nextFilters, nextSearch)
        if (params === null) {
          // No status selected can never match anything — skip the request.
          setVouchers([])
          setPage(0)
          setTotal(0)
          setTotalPages(0)
          return
        }
        const result = await listVouchers({ ...params, page: nextPage, size: PAGE_SIZE })
        setVouchers(result.data)
        setPage(nextPage)
        setTotal(result.pagination.total)
        setTotalPages(result.pagination.totalPages)
      } catch {
        // keep the previously loaded list on a transient fetch failure
      } finally {
        setVouchersLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    void loadVouchers(0, filters, debouncedSearch)
  }, [filters, debouncedSearch, loadVouchers])

  const changePage = (nextPage: number) => {
    void loadVouchers(nextPage, filters, debouncedSearch)
  }

  useEffect(() => {
    listCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    const fund = filters.fund === 'ALL' ? undefined : filters.fund
    getSummary({ fund }).then(s => setOpeningBalance(s.openingBalance)).catch(() => {})
  }, [filters.fund])

  // Only reflects creators on the currently loaded page — same limitation as the
  // Employees screen's in-page search, now that vouchers are paginated server-side.
  const createdByOptions = useMemo(
    () => Array.from(new Set(vouchers.map(v => v.createdBy))),
    [vouchers],
  )

  // Totals now describe only the current page, not the whole filtered result set —
  // an unavoidable consequence of real pagination (see plan's "Rủi ro" note).
  const { totalIncome, totalExpense } = useMemo(() => {
    return vouchers.reduce(
      (sum, v) => {
        if (v.voided) return sum
        if (v.type === 'RECEIPT') sum.totalIncome += v.amount
        else sum.totalExpense += v.amount
        return sum
      },
      { totalIncome: 0, totalExpense: 0 },
    )
  }, [vouchers])

  const saveVoucher = async (payload: CreateVoucherPayload) => {
    await apiCreateVoucher(payload)
    await loadVouchers(0, filters, debouncedSearch)
    setModal(null)
  }

  const updateVoucher = async (id: string, payload: CreateVoucherPayload) => {
    await apiUpdateVoucher(id, payload)
    await loadVouchers(page, filters, debouncedSearch)
    setModal(null)
  }

  const addCategory = async (type: CashFlowType, data: { name: string; description: string; accountingToIncome: boolean }) => {
    const created = await apiCreateCategory({ name: data.name, type, description: data.description, accountingToIncome: data.accountingToIncome })
    setCategories(list => [...list, created])
    return created
  }
  const updateCategory = async (id: string, data: { name: string; description: string; accountingToIncome: boolean }) => {
    const existing = categories.find(c => c.id === id)
    if (!existing) return
    const updated = await apiUpdateCategory(id, { name: data.name, type: existing.type, description: data.description, accountingToIncome: data.accountingToIncome })
    setCategories(list => list.map(c => (c.id === id ? updated : c)))
  }
  const deleteCategory = async (id: string) => {
    await apiDeleteCategory(id)
    setCategories(list => list.filter(c => c.id !== id))
  }

  const voidVoucher = async (voucherId: string) => {
    if (!window.confirm('Hủy phiếu này?')) return
    try {
      await apiVoidVoucher(voucherId)
      // Refetch rather than update in place — a voucher that no longer matches the
      // active status filter (e.g. "chỉ Đã thanh toán") must disappear from view.
      await loadVouchers(page, filters, debouncedSearch)
    } catch (err) {
      window.alert(errMsg(err, 'Không thể hủy phiếu'))
    }
  }

  const handleExport = async () => {
    const params = buildVoucherParams(filters, debouncedSearch)
    if (params === null) return
    try {
      const all = await exportVouchersUnpaged(params)
      exportCsv(all, categories)
    } catch (err) {
      window.alert(errMsg(err, 'Không thể xuất file'))
    }
  }

  const toggleColumn = (key: ColumnKey) => setVisibleColumns(cols => ({ ...cols, [key]: !cols[key] }))

  return (
    <div className="flex h-[calc(100vh-var(--kv-header-height))] bg-surface overflow-hidden">
      <aside className="w-[24rem] shrink-0 flex flex-col px-4 pt-5 pb-4 overflow-y-auto border-r border-line bg-card">
        <CashBookFilters categories={categories} createdByOptions={createdByOptions} value={filters} onChange={setFilters} />
      </aside>

      <section className="flex-1 min-w-0 flex flex-col p-5 gap-2">
        <CashBookToolbar
          title={FUND_LABEL[filters.fund]}
          search={search}
          onSearchChange={setSearch}
          onCreate={(type, method) => setModal({ mode: 'create', type, method })}
          onExport={() => void handleExport()}
          visibleColumns={visibleColumns}
          onToggleColumn={toggleColumn}
        />

        <CashBookSummary openingBalance={openingBalance} totalIncome={totalIncome} totalExpense={totalExpense} />

        <CashBookTable
          vouchers={vouchers}
          categories={categories}
          visibleColumns={visibleColumns}
          expandedId={expandedId}
          loading={vouchersLoading}
          onToggleExpand={voucher => setExpandedId(id => (id === voucher.id ? null : voucher.id))}
          onVoid={voidVoucher}
          onEdit={voucher => setModal({ mode: 'edit', voucher })}
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={changePage}
        />
      </section>

      {modal && modal.mode === 'create' && (
        <CashFlowModal
          type={modal.type}
          defaultMethod={modal.method}
          categories={categories}
          onClose={() => setModal(null)}
          onSave={saveVoucher}
          onAddCategory={addCategory}
          onUpdateCategory={updateCategory}
          onDeleteCategory={deleteCategory}
        />
      )}

      {modal && modal.mode === 'edit' && (
        <CashFlowModal
          type={modal.voucher.type}
          defaultMethod={modal.voucher.method}
          categories={categories}
          editingVoucher={modal.voucher}
          onClose={() => setModal(null)}
          onSave={saveVoucher}
          onUpdate={updateVoucher}
          onAddCategory={addCategory}
          onUpdateCategory={updateCategory}
          onDeleteCategory={deleteCategory}
        />
      )}
    </div>
  )
}

export default CashBook
