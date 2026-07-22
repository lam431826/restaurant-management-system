import Card, { CardHeader, CardBody } from '../common/Card'
import { Skeleton, EmptyState, ErrorState } from './DashboardStates'
import { fmtCurrency, fmtInt, fmtPercent } from './dashboardUtils'
import type { OverviewState } from './Dashboard'

const RANK_COLOR = ['#0070f4', '#0d9e6e', '#e67e00', '#7c3aed', '#e53935']

const MenuPerformance = ({
  overview,
  onRetry,
}: {
  overview: OverviewState
  onRetry: () => void
}) => {
  const items = overview.data?.topItems ?? []
  // Share of gross menu revenue (item revenue is gross unit×qty, comparable to invoice subtotal).
  const gross = overview.data?.revenue.grossRevenue ?? 0
  const maxRevenue = items.reduce((m, it) => Math.max(m, it.revenue), 0)
  const hasData = items.length > 0

  return (
    <Card className="h-full">
      <CardHeader
        title="Hiệu quả thực đơn"
        subtitle="Top 5 món bán chạy theo doanh thu"
      />
      <CardBody>
        {overview.loading ? (
          <div className="flex flex-col gap-4">
            {[0, 1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : overview.error ? (
          <ErrorState onRetry={onRetry} />
        ) : !hasData ? (
          <EmptyState message="Chưa có món nào được bán trong khoảng thời gian này" />
        ) : (
          <ul className="list-none m-0 p-0 flex flex-col gap-4">
            {items.map((it, i) => {
              const barPct = maxRevenue > 0 ? (it.revenue / maxRevenue) * 100 : 0
              const sharePct = gross > 0 ? (it.revenue / gross) * 100 : 0
              const color = RANK_COLOR[i] ?? 'var(--kv-primary)'
              return (
                <li key={it.menuItemId} className="flex items-center gap-3">
                  <span
                    className="w-[2.4rem] h-[2.4rem] rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                    style={{ background: color }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className="text-md font-medium text-ink truncate">{it.name}</span>
                      <span className="text-md font-semibold text-ink whitespace-nowrap">
                        {fmtCurrency(it.revenue)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex-1 h-[0.6rem] bg-fill rounded-full overflow-hidden">
                        <span className="block h-full rounded-full"
                              style={{ width: `${barPct}%`, background: color }} />
                      </span>
                      <span className="text-xs text-ink-subtle whitespace-nowrap shrink-0">
                        {fmtInt(it.quantity)} phần · {fmtPercent(sharePct)} doanh thu
                      </span>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}

export default MenuPerformance
