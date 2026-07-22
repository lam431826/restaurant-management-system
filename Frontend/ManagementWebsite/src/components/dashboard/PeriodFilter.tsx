import { PERIOD_OPTIONS, type PeriodId } from './dashboardUtils'

/** Single shared period control driving every period-bound KPI and chart on the dashboard. */
const PeriodFilter = ({
  value,
  onChange,
}: {
  value: PeriodId
  onChange: (id: PeriodId) => void
}) => (
  <div
    className="inline-flex items-center bg-fill rounded-full p-[0.3rem] flex-wrap"
    role="group"
    aria-label="Khoảng thời gian"
  >
    {PERIOD_OPTIONS.map(p => {
      const active = p.id === value
      return (
        <button
          key={p.id}
          type="button"
          aria-pressed={active}
          onClick={() => onChange(p.id)}
          className={[
            'px-4 py-[0.5rem] border-none rounded-full text-sm whitespace-nowrap transition-colors cursor-pointer',
            active
              ? 'bg-primary text-white font-semibold'
              : 'bg-transparent text-ink-subtle font-medium hover:text-ink',
          ].join(' ')}
        >
          {p.label}
        </button>
      )
    })}
  </div>
)

export default PeriodFilter
