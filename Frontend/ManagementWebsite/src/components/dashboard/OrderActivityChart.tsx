import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import Card, { CardHeader, CardBody } from '../common/Card'
import { Skeleton, EmptyState, ErrorState } from './DashboardStates'
import { fmtBucketLabel, fmtInt } from './dashboardUtils'
import type { DashboardGranularity } from '../../api/dashboard'
import type { OverviewState } from './Dashboard'

const OrderTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="kv-chart-tooltip">
      <div className="kv-chart-tooltip-label">{p.label}</div>
      <div className="kv-chart-tooltip-value">{fmtInt(p.invoiceCount)} hóa đơn</div>
    </div>
  )
}

const OrderActivityChart = ({
  overview,
  granularity,
  onRetry,
}: {
  overview: OverviewState
  granularity: DashboardGranularity
  onRetry: () => void
}) => {
  const rev = overview.data?.revenue
  const series = (overview.data?.revenueSeries ?? []).map(pt => ({
    label: fmtBucketLabel(pt.bucketStart, granularity),
    invoiceCount: pt.invoiceCount,
  }))
  const hasData = !!rev && rev.paidInvoiceCount > 0

  return (
    <Card size="lg" className="kv-chart-card h-full">
      <CardHeader
        title={<span className="kv-chart-card-title">Số hóa đơn theo thời gian</span>}
      />
      <CardBody className="kv-chart-body">
        {overview.loading ? (
          <Skeleton className="h-[240px] w-full" />
        ) : overview.error ? (
          <ErrorState onRetry={onRetry} />
        ) : !hasData ? (
          <EmptyState message="Chưa có hóa đơn trong khoảng thời gian này" />
        ) : (
          <ResponsiveContainer width="100%" height={248}>
            <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="orderGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--kv-primary)" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="var(--kv-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--kv-border-subtle)" strokeDasharray="3 3" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} interval="preserveStartEnd"
                     tick={{ fill: 'var(--kv-text-subtle)', fontSize: 11 }} dy={6} minTickGap={12} />
              <YAxis axisLine={false} tickLine={false} allowDecimals={false} width={28}
                     tick={{ fill: 'var(--kv-text-subtle)', fontSize: 11 }} />
              <Tooltip content={<OrderTooltip />} />
              <Area type="monotone" dataKey="invoiceCount" stroke="var(--kv-primary)" strokeWidth={2}
                    fill="url(#orderGrad)" dot={false}
                    activeDot={{ r: 5, fill: 'var(--kv-primary)', stroke: 'var(--kv-white)', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardBody>
    </Card>
  )
}

export default OrderActivityChart
