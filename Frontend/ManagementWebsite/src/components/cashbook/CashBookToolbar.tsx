import { useEffect, useRef, useState } from 'react'
import { CASH_FLOW_METHODS, COLUMN_LABEL, METHOD_LABEL } from '../../api/cashbook'
import type { CashFlowMethod, CashFlowType, ColumnKey } from '../../api/cashbook'

interface Props {
  title: string
  search: string
  onSearchChange: (value: string) => void
  onCreate: (type: CashFlowType, method: CashFlowMethod) => void
  onExport: () => void
  visibleColumns: Record<ColumnKey, boolean>
  onToggleColumn: (key: ColumnKey) => void
}

const PlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)
const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted shrink-0">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)
const SlidersIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted shrink-0">
    <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
  </svg>
)
const ChevronDown = ({ className = '' }: { className?: string }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
)
const DownloadIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)
const ColumnsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="1.5" /><line x1="9" y1="4" x2="9" y2="20" /><line x1="15" y1="4" x2="15" y2="20" />
  </svg>
)
const SettingsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
)

const iconBtnCls = 'w-10 h-10 flex items-center justify-center rounded-md border border-line-default text-ink-subtle cursor-pointer transition-colors hover:bg-fill hover:text-ink'

const SplitCreateButton = ({
  label, type, colorCls, onCreate,
}: { label: string; type: CashFlowType; colorCls: string; onCreate: (type: CashFlowType, method: CashFlowMethod) => void }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} className="relative inline-flex">
      <button type="button" className={`kv-btn h-10 rounded-r-none ${colorCls}`} onClick={() => onCreate(type, 'CASH')}>
        <PlusIcon /> {label}
      </button>
      <button
        type="button"
        className={`kv-btn h-10 w-8 px-0 rounded-l-none border-l border-white/30 ${colorCls}`}
        onClick={() => setOpen(o => !o)}
        aria-label={`Chọn phương thức cho ${label}`}
      >
        <ChevronDown className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+0.4rem)] w-56 bg-card border border-line-default rounded-md shadow-md z-[var(--kv-z-dropdown)] py-1">
          {CASH_FLOW_METHODS.map(m => (
            <div
              key={m}
              className="px-3 py-2.5 text-md text-ink cursor-pointer hover:bg-[var(--kv-state-hover-bg)]"
              onClick={() => { onCreate(type, m); setOpen(false) }}
            >
              {METHOD_LABEL[m]}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const ColumnsToggle = ({ visibleColumns, onToggleColumn }: { visibleColumns: Record<ColumnKey, boolean>; onToggleColumn: (key: ColumnKey) => void }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const keys = Object.keys(visibleColumns) as ColumnKey[]

  return (
    <div ref={ref} className="relative">
      <button type="button" className={iconBtnCls} title="Hiển thị cột" onClick={() => setOpen(o => !o)}>
        <ColumnsIcon />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+0.4rem)] w-56 bg-card border border-line-default rounded-md shadow-md z-[var(--kv-z-dropdown)] py-1">
          {keys.map(key => (
            <label key={key} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[var(--kv-state-hover-bg)]">
              <input
                type="checkbox"
                checked={visibleColumns[key]}
                onChange={() => onToggleColumn(key)}
                className="w-4 h-4 accent-[var(--kv-primary)] cursor-pointer"
              />
              <span className="text-md text-ink">{COLUMN_LABEL[key]}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

const CashBookToolbar = ({ title, search, onSearchChange, onCreate, onExport, visibleColumns, onToggleColumn }: Props) => (
  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
    <div className="flex items-center gap-4">
      <h1 className="text-h3 font-bold text-ink">{title}</h1>
      <div className="flex items-center gap-2 h-10 px-3 w-72 bg-field border border-line-default rounded-md transition-colors focus-within:border-primary">
        <SearchIcon />
        <input
          className="flex-1 min-w-0 bg-transparent text-md text-ink placeholder:text-ink-muted focus:outline-none"
          placeholder="Theo mã phiếu thu/chi"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
        />
        <button type="button" title="Tìm kiếm nâng cao" className="shrink-0 cursor-pointer">
          <SlidersIcon />
        </button>
      </div>
    </div>

    <div className="flex items-center gap-2 shrink-0">
      <SplitCreateButton label="Phiếu thu" type="RECEIPT" colorCls="kv-btn-primary" onCreate={onCreate} />
      <SplitCreateButton
        label="Phiếu chi"
        type="PAYMENT"
        colorCls="bg-danger border-danger text-white hover:bg-danger-600 hover:border-danger-600"
        onCreate={onCreate}
      />
      <button type="button" className="kv-btn kv-btn-outline-neutral h-10 bg-card" onClick={onExport}>
        <DownloadIcon /> Xuất file
      </button>
      <ColumnsToggle visibleColumns={visibleColumns} onToggleColumn={onToggleColumn} />
      <button type="button" className={iconBtnCls} title="Cài đặt">
        <SettingsIcon />
      </button>
    </div>
  </div>
)

export default CashBookToolbar
