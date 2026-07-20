import { useMemo, useState } from 'react'
import FinancialReportFilters from './FinancialReportFilters'
import FinancialReportPreview from './FinancialReportPreview'
import { defaultFinancialFilters, buildFinancialPeriods } from '../../data/financialReportMockData'

const FinancialReport = () => {
  const [filters, setFilters] = useState(defaultFinancialFilters)
  const [generatedAt] = useState(() => new Date())

  const periods = useMemo(
    () => buildFinancialPeriods(filters.year, filters.granularity),
    [filters.year, filters.granularity],
  )

  return (
    <div className="flex h-[calc(100vh-var(--kv-header-height))] bg-surface overflow-hidden p-5 gap-5">
      <div className="flex flex-col w-[26rem] shrink-0">
        <h1 className="text-h3 font-extrabold text-ink mb-4">Báo cáo tài chính</h1>
        <aside className="flex-1 min-h-0 overflow-y-auto bg-card border border-line rounded-lg p-4">
          <FinancialReportFilters value={filters} onChange={setFilters} />
        </aside>
      </div>

      <FinancialReportPreview periods={periods} filters={filters} generatedAt={generatedAt} />
    </div>
  )
}

export default FinancialReport
