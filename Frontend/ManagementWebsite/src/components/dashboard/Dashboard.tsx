import { useCallback, useEffect, useRef, useState } from 'react'
import DashboardHeader from './DashboardHeader'
import KPICards from './KPICards'
import RevenueChart from './RevenueChart'
import OrderActivityChart from './OrderActivityChart'
import PaymentBreakdown from './PaymentBreakdown'
import MenuPerformance from './MenuPerformance'
import TableOperations from './TableOperations'
import RecentActivities from './RecentActivities'
import { resolvePeriod, type PeriodId, type ResolvedPeriod } from './dashboardUtils'
import { getDashboardOverview, type DashboardOverview, type DashboardRevenue } from '../../api/dashboard'
import { listTables, type TableItem } from '../../services/tableService'
import { useRealtime } from '../../hooks/useRealtime'

// Revenue/KPI figures have no backend push event (no "payment settled" topic exists), so they
// are kept fresh with a lightweight periodic poll instead of a WebSocket subscription.
const OVERVIEW_POLL_INTERVAL_MS = 60_000

export interface OverviewState {
  data: DashboardOverview | null
  previousRevenue: DashboardRevenue | null
  loading: boolean
  error: boolean
}

export interface TablesState {
  data: TableItem[] | null
  loading: boolean
  error: boolean
}

const Dashboard = () => {
  const [period, setPeriod] = useState<PeriodId>('today')
  const [resolved, setResolved] = useState<ResolvedPeriod>(() => resolvePeriod('today'))

  const [overview, setOverview] = useState<OverviewState>({
    data: null,
    previousRevenue: null,
    loading: true,
    error: false,
  })
  const [tables, setTables] = useState<TablesState>({ data: null, loading: true, error: false })

  // Last-request-wins guard so a slow response for an old period can never overwrite a newer one.
  const overviewReqId = useRef(0)
  const tablesReqId = useRef(0)

  const loadOverview = useCallback((r: ResolvedPeriod) => {
    const reqId = ++overviewReqId.current
    setOverview(s => ({ ...s, loading: true, error: false }))
    Promise.all([
      getDashboardOverview(r.current),
      // Previous equal-length window — used only for an accurate trend, never for the main figures.
      getDashboardOverview(r.previous).catch(() => null),
    ])
      .then(([data, prev]) => {
        if (reqId !== overviewReqId.current) return
        setOverview({
          data,
          previousRevenue: prev?.revenue ?? null,
          loading: false,
          error: false,
        })
      })
      .catch(() => {
        if (reqId !== overviewReqId.current) return
        setOverview({ data: null, previousRevenue: null, loading: false, error: true })
      })
  }, [])

  const loadTables = useCallback(() => {
    const reqId = ++tablesReqId.current
    setTables(s => ({ ...s, loading: true, error: false }))
    listTables()
      .then(data => {
        if (reqId !== tablesReqId.current) return
        setTables({ data, loading: false, error: false })
      })
      .catch(() => {
        if (reqId !== tablesReqId.current) return
        setTables({ data: null, loading: false, error: true })
      })
  }, [])

  // Re-resolve concrete date windows whenever the period changes, then fetch that period's overview.
  useEffect(() => {
    const r = resolvePeriod(period)
    setResolved(r)
    loadOverview(r)
  }, [period, loadOverview])

  // No push event exists for "a payment/invoice just settled", so re-fetch the current period's
  // overview on a timer instead of requiring a manual page reload.
  useEffect(() => {
    const interval = setInterval(() => loadOverview(resolved), OVERVIEW_POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [resolved, loadOverview])

  // Live table occupancy is point-in-time, independent of the reporting period — fetched once
  // up front, then kept fresh by the same /topic/tables channel the cashier floor view already
  // subscribes to (table create/seat/close/reservation check-in all publish to it).
  useEffect(() => {
    loadTables()
  }, [loadTables])
  useRealtime('/topic/tables', () => loadTables())

  return (
    <div className="flex flex-col gap-4 min-h-full">
      <DashboardHeader period={period} onPeriodChange={setPeriod} />

      <KPICards
        overview={overview}
        tables={tables}
        onRetry={() => {
          loadOverview(resolved)
          loadTables()
        }}
      />

      {/* Revenue (wide) + live table operations (narrow) */}
      <div className="grid grid-cols-[1.9fr_1fr] max-[1100px]:grid-cols-1 gap-4 items-stretch">
        <RevenueChart
          overview={overview}
          granularity={resolved.current.granularity}
          periodLabel={resolved.label}
          onRetry={() => loadOverview(resolved)}
        />
        <TableOperations tables={tables} onRetry={loadTables} />
      </div>

      {/* Order volume + payment method breakdown */}
      <div className="grid grid-cols-2 max-[900px]:grid-cols-1 gap-4 items-stretch">
        <OrderActivityChart
          overview={overview}
          granularity={resolved.current.granularity}
          onRetry={() => loadOverview(resolved)}
        />
        <PaymentBreakdown overview={overview} onRetry={() => loadOverview(resolved)} />
      </div>

      {/* Menu performance (wide) + recent activity (narrow) */}
      <div className="grid grid-cols-[1.6fr_1fr] max-[1100px]:grid-cols-1 gap-4 items-stretch">
        <MenuPerformance overview={overview} onRetry={() => loadOverview(resolved)} />
        <RecentActivities />
      </div>
    </div>
  )
}

export default Dashboard
