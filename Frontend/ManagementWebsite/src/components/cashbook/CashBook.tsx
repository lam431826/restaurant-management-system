import { useMemo, useState } from 'react'
import CashBookFilters from './CashBookFilters'
import CashBookSummary from './CashBookSummary'
import CashBookTable from './CashBookTable'
import CashBookToolbar from './CashBookToolbar'
import CashFlowModal from './CashFlowModal'
import {
  OPENING_BALANCE, initialCategories, initialVouchers, METHOD_LABEL, FUND_LABEL, defaultCashBookFilters,
} from '../../data/cashBookMockData'
import type {
  CashBookFilterState, CashFlowCategory, CashFlowMethod, CashFlowType, CashFlowVoucher, ColumnKey,
} from '../../data/cashBookMockData'

type ModalState = { type: CashFlowType; method: CashFlowMethod } | null

const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = {
  time: true, category: true, method: true, partner: true, amount: true,
}

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)

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
  const [categories, setCategories] = useState<CashFlowCategory[]>(initialCategories)
  const [vouchers, setVouchers] = useState<CashFlowVoucher[]>(initialVouchers)
  const [filters, setFilters] = useState<CashBookFilterState>(defaultCashBookFilters)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<ModalState>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(DEFAULT_VISIBLE_COLUMNS)

  const createdByOptions = useMemo(
    () => Array.from(new Set(vouchers.map(v => v.createdBy))),
    [vouchers],
  )

  const filteredVouchers = useMemo(() => {
    const query = search.trim().toLowerCase()
    const now = new Date()
    const rangeFrom = filters.timePreset === 'THIS_MONTH' ? startOfMonth(now) : filters.dateFrom
    const rangeTo = filters.timePreset === 'THIS_MONTH' ? endOfMonth(now) : filters.dateTo

    return vouchers
      .filter(v => {
        if (query && !v.code.toLowerCase().includes(query) && !v.note.toLowerCase().includes(query)) return false
        if (filters.fund !== 'ALL' && v.method !== filters.fund) return false
        if (filters.docTypes.length > 0 && !filters.docTypes.includes(v.type)) return false
        if (filters.categoryIds.length > 0 && !filters.categoryIds.includes(v.categoryId)) return false
        if (filters.statuses.length === 0) return false
        const statusMatches = (v.voided && filters.statuses.includes('VOIDED')) || (!v.voided && filters.statuses.includes('PAID'))
        if (!statusMatches) return false
        if (filters.accounting === 'YES' && !v.accountingToIncome) return false
        if (filters.accounting === 'NO' && v.accountingToIncome) return false
        if (filters.createdBy && v.createdBy !== filters.createdBy) return false
        if (filters.partnerScope !== 'ALL' && v.partnerGroup !== filters.partnerScope) return false
        if (filters.partnerQuery && !v.partnerName.toLowerCase().includes(filters.partnerQuery.toLowerCase())) return false
        const createdAt = new Date(v.createdAt)
        if (rangeFrom) {
          const from = new Date(rangeFrom); from.setHours(0, 0, 0, 0)
          if (createdAt < from) return false
        }
        if (rangeTo) {
          const to = new Date(rangeTo); to.setHours(23, 59, 59, 999)
          if (createdAt > to) return false
        }
        return true
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [vouchers, filters, search])

  const { totalIncome, totalExpense } = useMemo(() => {
    return filteredVouchers.reduce(
      (sum, v) => {
        if (v.voided) return sum
        if (v.type === 'RECEIPT') sum.totalIncome += v.amount
        else sum.totalExpense += v.amount
        return sum
      },
      { totalIncome: 0, totalExpense: 0 },
    )
  }, [filteredVouchers])

  const saveVoucher = (voucher: CashFlowVoucher) => {
    setVouchers(list => [voucher, ...list])
    setModal(null)
  }

  const addCategory = (type: CashFlowType, data: { name: string; description: string; accountingToIncome: boolean }): CashFlowCategory => {
    const created: CashFlowCategory = { id: crypto.randomUUID(), type, ...data }
    setCategories(list => [...list, created])
    return created
  }
  const updateCategory = (id: string, data: { name: string; description: string; accountingToIncome: boolean }) => {
    setCategories(list => list.map(c => (c.id === id ? { ...c, ...data } : c)))
  }
  const deleteCategory = (id: string) => {
    setCategories(list => list.filter(c => c.id !== id))
  }

  const voidVoucher = (voucherId: string) => {
    setVouchers(list => list.map(v => (v.id === voucherId ? { ...v, voided: true } : v)))
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
          onCreate={(type, method) => setModal({ type, method })}
          onExport={() => exportCsv(filteredVouchers, categories)}
          visibleColumns={visibleColumns}
          onToggleColumn={toggleColumn}
        />

        <CashBookSummary openingBalance={OPENING_BALANCE} totalIncome={totalIncome} totalExpense={totalExpense} />

        <CashBookTable
          vouchers={filteredVouchers}
          categories={categories}
          visibleColumns={visibleColumns}
          expandedId={expandedId}
          onToggleExpand={voucher => setExpandedId(id => (id === voucher.id ? null : voucher.id))}
          onVoid={voidVoucher}
        />
      </section>

      {modal && (
        <CashFlowModal
          type={modal.type}
          defaultMethod={modal.method}
          categories={categories}
          vouchers={vouchers}
          onClose={() => setModal(null)}
          onSave={saveVoucher}
          onAddCategory={addCategory}
          onUpdateCategory={updateCategory}
          onDeleteCategory={deleteCategory}
        />
      )}
    </div>
  )
}

export default CashBook
