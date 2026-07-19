import { useState } from 'react'
import Card, { CardHeader, CardBody } from '../common/Card'
import { PeriodSelect } from './ChartControls'
import { cancellation } from '../../data/mockData'

const DOT_COLOR: Record<string, string> = {
  danger: 'bg-danger',
  warning: 'bg-warning',
  neutral: 'bg-warning',
}

const EmptyBox = () => (
  <svg width="56" height="56" viewBox="0 0 64 64" fill="none">
    <path d="M8 24l8-12h32l8 12" stroke="var(--kv-border-strong)" strokeWidth="2" strokeLinejoin="round" />
    <path d="M8 24h16l2 6h12l2-6h16v24a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V24z" stroke="var(--kv-border-strong)" strokeWidth="2" strokeLinejoin="round" fill="var(--kv-fill-subtle)" />
  </svg>
)

const CancellationStatus = () => {
  const [expanded, setExpanded] = useState<number | null>(0)

  return (
    <Card className="w-full h-full">
      <CardHeader title="Tình trạng hủy món" actions={<PeriodSelect />} />
      <CardBody>
        <div className="flex flex-wrap gap-x-12 gap-y-3 mb-5">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-ink-subtle">Món bị hủy</span>
            <span className="text-[2.4rem] font-extrabold text-ink leading-[1.1]">{cancellation.cancelledItems}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-ink-subtle">Hóa đơn bị hủy</span>
            <span className="text-[2.4rem] font-extrabold text-ink leading-[1.1]">{cancellation.cancelledInvoices}</span>
          </div>
        </div>

        <div className="flex flex-col">
          {cancellation.categories.map((cat, i) => (
            <div key={cat.label} className="border-t border-line">
              <button
                className="flex items-center gap-3 w-full py-3 bg-none border-none cursor-pointer text-left"
                onClick={() => setExpanded(expanded === i ? null : i)}
              >
                <span className={`w-[1rem] h-[1rem] rounded-full shrink-0 ${DOT_COLOR[cat.color]}`} />
                <span className="text-md text-ink whitespace-nowrap">{cat.label}</span>
                <span className="flex-1 h-[0.6rem] flex items-center">
                  <span className="w-full h-[0.6rem] bg-fill rounded-full" />
                </span>
                <span className="text-sm text-ink-subtle whitespace-nowrap">{cat.count} Món</span>
                <svg
                  width="16" height="16" viewBox="0 0 16 16" fill="none"
                  className={`text-ink-muted shrink-0 transition-transform ${expanded === i ? 'rotate-180' : ''}`}
                >
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {expanded === i && (
                <div className="flex flex-col items-center gap-2 px-4 pt-5 pb-6 text-ink-muted">
                  <EmptyBox />
                  <p className="text-sm m-0">{cat.empty}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  )
}

export default CancellationStatus
