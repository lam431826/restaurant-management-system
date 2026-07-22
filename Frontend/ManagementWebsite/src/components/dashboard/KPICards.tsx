import type { ReactNode } from 'react'
import Card, { CardBody } from '../common/Card'
import { Skeleton } from './DashboardStates'
import {
  computeTableStats,
  fmtCurrency,
  fmtInt,
  fmtPercent,
  trendPct,
} from './dashboardUtils'
import type { OverviewState, TablesState } from './Dashboard'

const ACCENT = {
  revenue: 'var(--kv-primary)',
  invoices: 'var(--kv-success)',
  avg: 'var(--kv-warning)',
  tables: 'var(--kv-primary-600)',
} as const

const TrendArrow = ({ up }: { up: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
       strokeLinecap="round" strokeLinejoin="round" className={up ? '' : 'rotate-90'}>
    <line x1="7" y1="17" x2="17" y2="7" />
    <polyline points="9 7 17 7 17 15" />
  </svg>
)

const Trend = ({ pct }: { pct: number | null }) => {
  if (pct === null) {
    return <span className="text-sm text-ink-muted">Chưa đủ dữ liệu để so sánh</span>
  }
  const up = pct >= 0
  return (
    <span className="inline-flex items-center gap-2">
      <span className={up ? 'kv-trend-pct kv-trend-pct-up' : 'kv-trend-pct kv-trend-pct-down'}>
        {up ? '+' : ''}{pct.toFixed(1)}% <TrendArrow up={up} />
      </span>
      <span className="text-sm text-ink-subtle">so với kỳ trước</span>
    </span>
  )
}

const KpiShell = ({
  title,
  color,
  children,
}: {
  title: string
  color: string
  children: ReactNode
}) => (
  <Card variant="kpi" size="lg" className="relative overflow-hidden h-full">
    <span
      className="absolute left-0 top-6 bottom-6 w-[0.5rem] rounded-r-full"
      style={{ background: color }}
      aria-hidden
    />
    <CardBody>
      <div className="flex flex-col gap-1 pl-3">
        <span className="text-sm font-medium text-ink-subtle">{title}</span>
        {children}
      </div>
    </CardBody>
  </Card>
)

const LoadingCard = ({ title, color }: { title: string; color: string }) => (
  <KpiShell title={title} color={color}>
    <Skeleton className="h-9 w-32 mt-1" />
    <Skeleton className="h-4 w-40 mt-2" />
  </KpiShell>
)

const ErrorValue = ({ onRetry }: { onRetry: () => void }) => (
  <div className="mt-1">
    <div className="text-md text-ink-muted">Không tải được</div>
    <button
      type="button"
      onClick={onRetry}
      className="text-sm text-primary font-medium mt-1 cursor-pointer hover:underline bg-transparent border-none p-0"
    >
      Thử lại
    </button>
  </div>
)

const KPICards = ({
  overview,
  tables,
  onRetry,
}: {
  overview: OverviewState
  tables: TablesState
  onRetry: () => void
}) => {
  const rev = overview.data?.revenue
  const prev = overview.previousRevenue

  const stats = tables.data ? computeTableStats(tables.data) : null

  return (
    <div className="grid grid-cols-4 max-[1200px]:grid-cols-2 max-[560px]:grid-cols-1 gap-4 items-stretch">
      {/* 1 · Doanh thu */}
      {overview.loading ? (
        <LoadingCard title="Doanh thu" color={ACCENT.revenue} />
      ) : overview.error || !rev ? (
        <KpiShell title="Doanh thu" color={ACCENT.revenue}><ErrorValue onRetry={onRetry} /></KpiShell>
      ) : (
        <KpiShell title="Doanh thu" color={ACCENT.revenue}>
          <span className="kv-big-text">{fmtCurrency(rev.netRevenue)}</span>
          <div className="mt-1">
            <Trend pct={prev ? trendPct(rev.netRevenue, prev.netRevenue) : null} />
          </div>
          <span className="text-xs text-ink-muted mt-1">
            Đã trừ giảm giá {fmtCurrency(rev.totalDiscount)}
          </span>
        </KpiShell>
      )}

      {/* 2 · Hóa đơn đã thanh toán */}
      {overview.loading ? (
        <LoadingCard title="Hóa đơn đã thanh toán" color={ACCENT.invoices} />
      ) : overview.error || !rev ? (
        <KpiShell title="Hóa đơn đã thanh toán" color={ACCENT.invoices}><ErrorValue onRetry={onRetry} /></KpiShell>
      ) : (
        <KpiShell title="Hóa đơn đã thanh toán" color={ACCENT.invoices}>
          <span className="kv-big-text">{fmtInt(rev.paidInvoiceCount)}</span>
          <span className="text-sm text-ink-subtle mt-1">hóa đơn đã thanh toán</span>
        </KpiShell>
      )}

      {/* 3 · Giá trị trung bình hóa đơn */}
      {overview.loading ? (
        <LoadingCard title="Giá trị trung bình hóa đơn" color={ACCENT.avg} />
      ) : overview.error || !rev ? (
        <KpiShell title="Giá trị trung bình hóa đơn" color={ACCENT.avg}><ErrorValue onRetry={onRetry} /></KpiShell>
      ) : (
        <KpiShell title="Giá trị trung bình hóa đơn" color={ACCENT.avg}>
          <span className="kv-big-text">{fmtCurrency(rev.averageInvoiceValue)}</span>
          <span className="text-sm text-ink-subtle mt-1">
            {rev.paidInvoiceCount > 0
              ? `trên ${fmtInt(rev.paidInvoiceCount)} hóa đơn đã thanh toán`
              : 'chưa có hóa đơn đã thanh toán'}
          </span>
        </KpiShell>
      )}

      {/* 4 · Tình trạng bàn (live) */}
      {tables.loading ? (
        <LoadingCard title="Tình trạng bàn" color={ACCENT.tables} />
      ) : tables.error || !stats ? (
        <KpiShell title="Tình trạng bàn" color={ACCENT.tables}>
          <ErrorValue onRetry={onRetry} />
        </KpiShell>
      ) : (
        <KpiShell title="Tình trạng bàn" color={ACCENT.tables}>
          <span className="kv-big-text">{fmtPercent(stats.occupancyPct)}</span>
          <span className="text-sm text-ink-subtle mt-1">
            {fmtInt(stats.inUse)}/{fmtInt(stats.active)} bàn đang phục vụ
          </span>
          <span className="text-xs text-ink-muted mt-1">
            Trống {fmtInt(stats.available)} · Đặt trước {fmtInt(stats.reserved)}
          </span>
        </KpiShell>
      )}
    </div>
  )
}

export default KPICards
