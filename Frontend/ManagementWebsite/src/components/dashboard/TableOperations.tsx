import Card, { CardHeader, CardBody } from '../common/Card'
import { Skeleton, EmptyState, ErrorState } from './DashboardStates'
import { computeTableStats, fmtInt, fmtPercent } from './dashboardUtils'
import type { TablesState } from './Dashboard'

// Status colors aligned with the table-management floor view.
const STATUS_META = [
  { key: 'inUse', label: 'Đang phục vụ', color: 'var(--kv-success)' },
  { key: 'available', label: 'Bàn trống', color: 'var(--kv-text-subtle)' },
  { key: 'reserved', label: 'Đã đặt trước', color: 'var(--kv-primary)' },
  { key: 'cleaning', label: 'Chờ dọn dẹp', color: 'var(--kv-warning)' },
] as const

const TableOperations = ({
  tables,
  onRetry,
}: {
  tables: TablesState
  onRetry: () => void
}) => {
  const stats = tables.data ? computeTableStats(tables.data) : null

  return (
    <Card size="lg" className="h-full">
      <CardHeader
        title="Tình trạng bàn"
        subtitle="Thời gian thực"
      />
      <CardBody>
        {tables.loading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : tables.error || !stats ? (
          <ErrorState message="Không thể tải trạng thái bàn." onRetry={onRetry} />
        ) : stats.active === 0 ? (
          <EmptyState message="Chưa có bàn nào đang hoạt động" />
        ) : (
          <div className="flex flex-col gap-5">
            {/* Occupancy gauge */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="kv-big-text leading-none">{fmtPercent(stats.occupancyPct)}</span>
                <span className="text-sm text-ink-subtle mt-1">Tỷ lệ sử dụng bàn</span>
              </div>
              <div className="flex-1 flex flex-col items-end">
                <span className="text-md font-semibold text-ink">
                  {fmtInt(stats.inUse)}/{fmtInt(stats.active)}
                </span>
                <span className="text-xs text-ink-muted">bàn đang phục vụ</span>
              </div>
            </div>

            <div className="h-[0.8rem] bg-fill rounded-full overflow-hidden">
              <span
                className="block h-full rounded-full bg-success transition-[width]"
                style={{ width: `${Math.min(100, stats.occupancyPct)}%` }}
              />
            </div>

            {/* Status breakdown */}
            <div className="flex flex-col">
              {STATUS_META.map(m => (
                <div key={m.key} className="flex items-center gap-3 py-2.5 border-t border-line first:border-t-0">
                  <span className="w-[1rem] h-[1rem] rounded-full shrink-0" style={{ background: m.color }} />
                  <span className="text-md text-ink flex-1">{m.label}</span>
                  <span className="text-md font-semibold text-ink">{fmtInt(stats[m.key])}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

export default TableOperations
