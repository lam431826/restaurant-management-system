import { useState, useRef, useEffect } from 'react'

/* ─── Underline tabs: Theo giờ / Theo ngày / Theo thứ ─────────────────────── */
export interface ChartTab {
  id: string
  label: string
}

export const ChartTabs = ({
  tabs,
  active,
  onChange,
}: {
  tabs: ChartTab[]
  active: string
  onChange: (id: string) => void
}) => (
  <div className="flex flex-wrap items-center gap-x-5 border-b border-line mb-2">
    {tabs.map(t => (
      <button
        key={t.id}
        onClick={() => onChange(t.id)}
        className={[
          'relative py-2 text-md cursor-pointer whitespace-nowrap transition-colors',
          active === t.id
            ? 'text-primary font-semibold after:content-[""] after:absolute after:left-0 after:right-0 after:bottom-[-0.1rem] after:h-[0.2rem] after:bg-primary after:rounded-full'
            : 'text-ink-subtle font-medium hover:text-ink',
        ].join(' ')}
      >
        {t.label}
      </button>
    ))}
  </div>
)

/* ─── Faded period dropdown: "7 ngày qua" ─────────────────────────────────── */
const PERIODS = [
  { id: 'today', label: 'Hôm nay' },
  { id: 'yesterday', label: 'Hôm qua' },
  { id: '7d', label: '7 ngày qua' },
  { id: '30d', label: '30 ngày qua' },
  { id: 'month', label: 'Tháng này' },
  { id: 'prev-month', label: 'Tháng trước' },
]

export const PeriodSelect = ({
  value = '7d',
  onChange,
}: {
  value?: string
  onChange?: (id: string) => void
}) => {
  const [open, setOpen] = useState(false)
  const [sel, setSel] = useState(value)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const current = PERIODS.find(p => p.id === sel)!

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 h-8 px-3 bg-fill border border-transparent rounded-md text-md text-ink-subtle cursor-pointer whitespace-nowrap transition-colors hover:bg-fill-default hover:text-ink"
      >
        <span>{current.label}</span>
        <svg
          width="14" height="14" viewBox="0 0 16 16" fill="none"
          className={`text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-[calc(100%+0.4rem)] right-0 min-w-[15rem] bg-card border border-line-default rounded-md shadow-md py-1 z-[var(--kv-z-dropdown)]">
          {PERIODS.map(p => (
            <div
              key={p.id}
              onClick={() => {
                setSel(p.id)
                onChange?.(p.id)
                setOpen(false)
              }}
              className={[
                'px-4 py-2 text-md cursor-pointer whitespace-nowrap hover:bg-[var(--kv-state-hover-bg)]',
                p.id === sel ? 'text-primary font-medium bg-[var(--kv-state-hover-bg)]' : 'text-ink',
              ].join(' ')}
            >
              {p.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Small info icon ─────────────────────────────────────────────────────── */
export const InfoIcon = ({ size = 14 }: { size?: number }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className="shrink-0 opacity-50"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
)

/* ─── Shared chart tooltip ────────────────────────────────────────────────── */
export const MoneyTooltip = ({ active, payload, label, suffix = '₫' }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="kv-chart-tooltip">
      <div className="kv-chart-tooltip-label">{label}</div>
      <div className="kv-chart-tooltip-value">
        {Number(payload[0].value).toLocaleString('vi-VN')} {suffix}
      </div>
    </div>
  )
}
