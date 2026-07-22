import PeriodFilter from './PeriodFilter'
import type { PeriodId } from './dashboardUtils'

const DashboardHeader = ({
  period,
  onPeriodChange,
}: {
  period: PeriodId
  onPeriodChange: (id: PeriodId) => void
}) => (
  <header className="flex flex-wrap justify-between items-center gap-x-4 gap-y-3">
    <div className="min-w-0">
      <h1 className="text-h1 font-bold text-ink m-0">Bức tranh kinh doanh</h1>
      <p className="text-sm text-ink-subtle m-0 mt-1">
        Tổng quan hoạt động và doanh thu của nhà hàng
      </p>
    </div>
    <PeriodFilter value={period} onChange={onPeriodChange} />
  </header>
)

export default DashboardHeader
