import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import Card, { CardHeader, CardBody } from '../common/Card'
import { Skeleton, EmptyState, ErrorState } from './DashboardStates'
import { fmtBucketLabel, fmtCurrency, fmtInt } from './dashboardUtils'
import type { DashboardGranularity } from '../../api/dashboard'
import type { OverviewState } from './Dashboard'

const fmtAxis = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}Tr`
  : v >= 1_000 ? `${Math.round(v / 1_000)}k`
  : `${v}`

const RevenueTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="kv-chart-tooltip">
      <div className="kv-chart-tooltip-label">{p.label}</div>
      <div className="kv-chart-tooltip-value">{fmtCurrency(p.revenue)}</div>
      <div className="text-xs text-ink-subtle mt-0.5">{fmtInt(p.invoiceCount)} hóa đơn</div>
    </div>
  )
}

const SummaryStat = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs text-ink-subtle">{label}</span>
    <span className="text-lg font-extrabold text-ink leading-tight">{value}</span>
  </div>
)

const RevenueChart = ({
  overview,
  granularity,
  periodLabel,
  onRetry,
}: {
  overview: OverviewState
  granularity: DashboardGranularity
  periodLabel: string
  onRetry: () => void
}) => {
  const rev = overview.data?.revenue
  const series = (overview.data?.revenueSeries ?? []).map(pt => ({
    label: fmtBucketLabel(pt.bucketStart, granularity),
    revenue: pt.revenue,
    invoiceCount: pt.invoiceCount,
  }))
  const hasData = !!rev && rev.paidInvoiceCount > 0
  const avgInvoice = rev && rev.paidInvoiceCount > 0 ? rev.netRevenue / rev.paidInvoiceCount : 0

  return (
    <Card size="lg" className="kv-chart-card h-full">
      <CardHeader
        title={<span className="kv-chart-card-title">Doanh thu theo thời gian</span>}
        subtitle={periodLabel}
      />
      <CardBody className="kv-chart-body">
        {overview.loading ? (
          <div className="flex flex-col gap-4">
            <div className="flex gap-8">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-28" />
            </div>
            <Skeleton className="h-[240px] w-full" />
          </div>
        ) : overview.error ? (
          <ErrorState onRetry={onRetry} />
        ) : !hasData ? (
          <EmptyState message="Chưa có doanh thu trong khoảng thời gian này" />
        ) : (
          <>
            <div className="flex flex-wrap gap-x-10 gap-y-3 pb-4 mb-2 border-b border-line">
              <SummaryStat label="Tổng doanh thu" value={fmtCurrency(rev!.netRevenue)} />
              <SummaryStat label="Số hóa đơn" value={fmtInt(rev!.paidInvoiceCount)} />
              <SummaryStat label="TB mỗi hóa đơn" value={fmtCurrency(avgInvoice)} />
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="25%">
                <CartesianGrid vertical={false} stroke="var(--kv-border-subtle)" strokeDasharray="3 3" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} interval="preserveStartEnd"
                       tick={{ fill: 'var(--kv-text-subtle)', fontSize: 11 }} dy={6} minTickGap={12} />
                <YAxis tickFormatter={fmtAxis} axisLine={false} tickLine={false}
                       tick={{ fill: 'var(--kv-text-subtle)', fontSize: 11 }} width={46} />
                <Tooltip content={<RevenueTooltip />} cursor={{ fill: 'rgba(0,112,244,0.06)' }} />
                <Bar dataKey="revenue" fill="var(--kv-primary)" radius={[3, 3, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </CardBody>
    </Card>
  )
}

export default RevenueChart
