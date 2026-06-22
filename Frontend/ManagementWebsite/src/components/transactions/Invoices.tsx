import { useMemo, useState } from 'react'
import InvoiceFilters from './InvoiceFilters'
import type { FilterState } from './InvoiceFilters'
import InvoiceToolbar from './InvoiceToolbar'
import InvoiceTable from './InvoiceTable'
import { invoices as allInvoices } from '../../data/mockData'

const TODAY = '17/06/2026'

const Invoices = () => {
  const [filters, setFilters] = useState<FilterState>({
    code: '',
    statuses: new Set(['processing', 'completed']),
    methods: new Set(),
    today: true,
  })

  const filtered = useMemo(() => {
    const code = filters.code.trim().toLowerCase()
    return allInvoices.filter(inv => {
      if (filters.today && !inv.time.startsWith(TODAY)) return false
      if (filters.statuses.size > 0 && !filters.statuses.has(inv.status)) return false
      if (filters.methods.size > 0 && !filters.methods.has(inv.method)) return false
      if (code && !inv.code.toLowerCase().includes(code)) return false
      return true
    })
  }, [filters])

  return (
    <div className="flex h-[calc(100vh-var(--kv-header-height))] bg-surface overflow-hidden">
      <aside className="w-[24rem] shrink-0 flex flex-col px-4 pt-4 pb-4 overflow-y-auto border-r border-line bg-card">
        <InvoiceFilters state={filters} onChange={setFilters} />
      </aside>

      <section className="flex-1 min-w-0 flex flex-col p-5 gap-4">
        <InvoiceToolbar invoices={filtered} />
        <InvoiceTable invoices={filtered} />
      </section>
    </div>
  )
}

export default Invoices
