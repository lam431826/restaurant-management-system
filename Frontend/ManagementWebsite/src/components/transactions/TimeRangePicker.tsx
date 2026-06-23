import { useEffect, useRef, useState } from 'react'
import { TIME_RANGE_LABELS } from '../../services/invoiceService'
import type { TimeRange } from '../../services/invoiceService'

interface Props {
  value: TimeRange
  onChange: (range: TimeRange) => void
}

const COLUMNS: { title: string; ranges: TimeRange[] }[] = [
  { title: 'Theo ngày và tuần', ranges: ['today', 'yesterday', 'thisWeek', 'lastWeek', 'last7days'] },
  { title: 'Theo tháng và quý', ranges: ['thisMonth', 'lastMonth', 'last30days', 'thisQuarter', 'lastQuarter'] },
  { title: 'Theo năm', ranges: ['thisYear', 'lastYear', 'all'] },
]

const ChevronDown = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-ink-muted shrink-0">
    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const Pill = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={`text-left px-4 py-2 rounded-full border text-md transition-colors ${
      active
        ? 'bg-primary border-primary text-white font-medium'
        : 'bg-card border-line-default text-ink hover:border-primary hover:text-primary'
    }`}
  >
    {label}
  </button>
)

const POP_WIDTH = 560

const TimeRangePicker = ({ value, onChange }: Props) => {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  useEffect(() => {
    if (!open) return
    const update = () => {
      const r = btnRef.current?.getBoundingClientRect()
      if (!r) return
      const left = Math.min(r.right + 8, window.innerWidth - POP_WIDTH - 8)
      const top = Math.min(r.top, window.innerHeight - 40) // keep on-screen-ish
      setPos({ top: Math.max(8, top), left: Math.max(8, left) })
    }
    update()
    const onDoc = (e: MouseEvent) => {
      if (popRef.current?.contains(e.target as Node)) return
      if (btnRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const select = (r: TimeRange) => { onChange(r); setOpen(false) }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center justify-between w-full h-9 px-3 bg-field border rounded-md cursor-pointer transition-colors ${open ? 'border-primary' : 'border-line-default hover:border-line-strong'}`}
      >
        <span className="text-md text-ink truncate">{TIME_RANGE_LABELS[value]}</span>
        <ChevronDown />
      </button>

      {open && (
        <div
          ref={popRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: POP_WIDTH }}
          className="bg-card border border-line-default rounded-xl shadow-lg p-5 z-[var(--kv-z-dropdown)] grid grid-cols-3 gap-x-6 gap-y-3"
        >
          {COLUMNS.map(col => (
            <div key={col.title} className="flex flex-col gap-2">
              <div className="text-md font-bold text-ink mb-1">{col.title}</div>
              {col.ranges.map(r => (
                <Pill key={r} label={TIME_RANGE_LABELS[r]} active={value === r} onClick={() => select(r)} />
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

export default TimeRangePicker
