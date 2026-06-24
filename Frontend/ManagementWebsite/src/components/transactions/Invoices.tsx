import { useEffect, useMemo, useState } from 'react'
import InvoiceFilters from './InvoiceFilters'
import type { FilterState } from './InvoiceFilters'
import InvoiceToolbar from './InvoiceToolbar'
import InvoiceTable from './InvoiceTable'
import { listInvoices, inTimeRange, inCustomRange } from '../../services/invoiceService'
import type { InvoiceListItem } from '../../services/invoiceService'
import { ApiError } from '../../services/api'

const Invoices = () => {
  const [items, setItems] = useState<InvoiceListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [filters, setFilters] = useState<FilterState>({
    code: '',
    item: '',
    creator: '',
    note: '',
    expanded: false,
    timeMode: 'preset',
    range: 'all',
    customFrom: null,
    customTo: null,
    paid: 'all',
    methods: new Set(),
  })

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    listInvoices()
      .then(data => { if (alive) setItems(data) })
      .catch(err => { if (alive) setError(err instanceof ApiError ? err.message : 'Không tải được danh sách hóa đơn.') })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const filtered = useMemo(() => {
    const code = filters.code.trim().toLowerCase()
    const item = filters.item.trim().toLowerCase()
    const creator = filters.creator.trim().toLowerCase()
    const note = filters.note.trim().toLowerCase()
    const has = (v: string | null, q: string) => !!v && v.toLowerCase().includes(q)
    return items.filter(inv => {
      const timeOk = filters.timeMode === 'custom'
        ? inCustomRange(inv.createdAt, filters.customFrom, filters.customTo)
        : inTimeRange(inv.createdAt, filters.range)
      if (!timeOk) return false
      if (filters.paid === 'paid' && !inv.paid) return false
      if (filters.paid === 'unpaid' && inv.paid) return false
      if (filters.methods.size > 0 && !(inv.paymentMethod && filters.methods.has(inv.paymentMethod))) return false
      if (code && !inv.id.toLowerCase().includes(code)) return false
      if (item && !has(inv.itemsText, item)) return false
      if (creator && !has(inv.cashierName, creator)) return false
      if (note && !has(inv.note, note)) return false
      return true
    })
  }, [items, filters])

  return (
    <div className="flex h-[calc(100vh-var(--kv-header-height))] bg-surface overflow-hidden">
      <aside className="w-[24rem] shrink-0 flex flex-col px-4 pt-4 pb-4 overflow-y-auto border-r border-line bg-card">
        <InvoiceFilters state={filters} onChange={setFilters} />
      </aside>

      <section className="flex-1 min-w-0 flex flex-col p-5 gap-4">
        <InvoiceToolbar invoices={filtered} />
        {error && (
          <div className="px-4 py-2 rounded-md bg-danger-50 text-danger text-md border border-danger/30">{error}</div>
        )}
        <InvoiceTable invoices={filtered} loading={loading} total={items.length} />
      </section>
    </div>
  )
}

export default Invoices
