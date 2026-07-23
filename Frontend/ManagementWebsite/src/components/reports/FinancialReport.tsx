import { useState, useEffect } from 'react'
import FinancialReportFilters from './FinancialReportFilters'
import FinancialReportPreview from './FinancialReportPreview'
import { defaultFinancialFilters } from '../../data/financialReportMockData'
import type { FinancialCategoryLine, FinancialPeriod } from '../../data/financialReportMockData'
import { getFinancialReport, getFinancialReportLines } from '../../api/reports'
import type { FinancialGranularityParam } from '../../api/reports'

const errMsg = (err: unknown, fallback: string): string =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback

const FinancialReport = () => {
  const [filters, setFilters] = useState(defaultFinancialFilters)
  const [generatedAt, setGeneratedAt] = useState(() => new Date())
  const [periods, setPeriods] = useState<FinancialPeriod[]>([])
  const [categoryLines, setCategoryLines] = useState<FinancialCategoryLine[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [refreshNonce, setRefreshNonce] = useState(0)

  useEffect(() => {
    let cancelled = false

    // Deferred so the effect body has no synchronous setState call (react-hooks/set-state-in-effect) —
    // same pattern already established in EndOfDayReport.tsx/Payroll.tsx/CashBook.tsx.
    const timer = setTimeout(() => {
      if (cancelled) return
      setLoading(true)
      setError('')

      Promise.all([
        getFinancialReport(filters.year, filters.granularity.toUpperCase() as FinancialGranularityParam),
        getFinancialReportLines(),
      ])
        .then(([reportRes, linesRes]) => {
          if (cancelled) return
          setPeriods(reportRes.data.data.map(({ key, label, categoryLineValues, ...values }) => ({
            key, label, values,
            categoryLineValues: Object.fromEntries(categoryLineValues.map(v => [v.categoryId, v.amount])),
          })))
          setCategoryLines(linesRes.data.data)
          setGeneratedAt(new Date())
        })
        .catch(err => { if (!cancelled) setError(errMsg(err, 'Không tải được báo cáo tài chính.')) })
        .finally(() => { if (!cancelled) setLoading(false) })
    }, 0)

    return () => { cancelled = true; clearTimeout(timer) }
  }, [filters.year, filters.granularity, refreshNonce])

  return (
    <div className="flex h-[calc(100vh-var(--kv-header-height))] bg-surface overflow-hidden p-5 gap-5">
      <div className="flex flex-col w-[26rem] shrink-0">
        <h1 className="text-h3 font-extrabold text-ink mb-4">Báo cáo tài chính</h1>
        <aside className="flex-1 min-h-0 overflow-y-auto bg-card border border-line rounded-lg p-4">
          <FinancialReportFilters value={filters} onChange={setFilters} />
        </aside>
      </div>

      <FinancialReportPreview
        periods={periods} categoryLines={categoryLines} filters={filters} generatedAt={generatedAt}
        loading={loading} error={error} onRefresh={() => setRefreshNonce(n => n + 1)}
      />
    </div>
  )
}

export default FinancialReport
