import { useState } from 'react'
import { PAYMENT_METHODS } from '../../services/invoiceService'
import type { TimeRange } from '../../services/invoiceService'
import TimeRangePicker from './TimeRangePicker'
import DateRangeField from './DateRangeField'

export interface FilterState {
  code: string
  item: string
  creator: string
  note: string
  expanded: boolean
  timeMode: 'preset' | 'custom'
  range: TimeRange
  customFrom: Date | null
  customTo: Date | null
  paid: 'all' | 'paid' | 'unpaid'
  methods: Set<string>
}

interface Props {
  state: FilterState
  onChange: (next: FilterState) => void
}

const Chevron = ({ open }: { open: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className={`text-ink-muted shrink-0 transition-transform ${open ? '' : '-rotate-90'}`}>
    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const [open, setOpen] = useState(true)
  return (
    <div className="border-b border-line pb-3">
      <button className="flex items-center justify-between w-full text-md font-semibold text-ink cursor-pointer py-1" onClick={() => setOpen(o => !o)}>
        <span>{title}</span>
        <Chevron open={open} />
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  )
}

const fieldCls =
  'w-full h-9 px-3 bg-field border border-line-default rounded-md text-md text-ink transition-colors ' +
  'placeholder:text-ink-muted hover:border-line-strong focus:outline-none focus:border-primary'

const Check = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) => (
  <label className="kv-check py-0.5">
    <input type="checkbox" checked={checked} onChange={onChange} />
    <span className="kv-check-box" />
    <span className="kv-check-text">{label}</span>
  </label>
)

const Radio = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) => (
  <label className="kv-radio py-0.5">
    <input type="radio" checked={checked} onChange={onChange} />
    <span className="kv-radio-dot" />
    <span className="kv-radio-text">{label}</span>
  </label>
)

const InvoiceFilters = ({ state, onChange }: Props) => {
  const toggleMethod = (m: string) => {
    const next = new Set(state.methods)
    if (next.has(m)) next.delete(m); else next.add(m)
    onChange({ ...state, methods: next })
  }

  return (
    <div className="flex flex-col gap-3 text-md">
      <Section title="Tìm kiếm">
        <div className="flex flex-col gap-2">
          <input
            className={fieldCls}
            placeholder="Theo mã hóa đơn"
            value={state.code}
            onChange={e => onChange({ ...state, code: e.target.value })}
          />
          {state.expanded && (
            <>
              <input
                className={fieldCls}
                placeholder="Theo tên món"
                value={state.item}
                onChange={e => onChange({ ...state, item: e.target.value })}
              />
              <input
                className={fieldCls}
                placeholder="Theo người tạo"
                value={state.creator}
                onChange={e => onChange({ ...state, creator: e.target.value })}
              />
              <input
                className={fieldCls}
                placeholder="Theo ghi chú"
                value={state.note}
                onChange={e => onChange({ ...state, note: e.target.value })}
              />
            </>
          )}
          <button
            className="self-center text-sm font-medium text-primary cursor-pointer hover:underline"
            onClick={() => onChange({ ...state, expanded: !state.expanded })}
          >
            {state.expanded ? 'Thu gọn ↑' : 'Mở rộng ↓'}
          </button>
        </div>
      </Section>

      <Section title="Thời gian">
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2">
            <input type="radio" name="inv-time-mode" className="shrink-0" checked={state.timeMode === 'preset'} onChange={() => onChange({ ...state, timeMode: 'preset' })} />
            <span className="flex-1 min-w-0">
              <TimeRangePicker value={state.range} onChange={range => onChange({ ...state, range, timeMode: 'preset' })} />
            </span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="inv-time-mode" className="shrink-0" checked={state.timeMode === 'custom'} onChange={() => onChange({ ...state, timeMode: 'custom' })} />
            <span className="flex-1 min-w-0">
              <DateRangeField
                from={state.customFrom}
                to={state.customTo}
                onChange={(customFrom, customTo) => onChange({ ...state, customFrom, customTo, timeMode: 'custom' })}
              />
            </span>
          </label>
        </div>
      </Section>

      <Section title="Trạng thái thanh toán">
        <div className="flex flex-col gap-1">
          <Radio label="Tất cả" checked={state.paid === 'all'} onChange={() => onChange({ ...state, paid: 'all' })} />
          <Radio label="Đã thanh toán" checked={state.paid === 'paid'} onChange={() => onChange({ ...state, paid: 'paid' })} />
          <Radio label="Chưa thanh toán" checked={state.paid === 'unpaid'} onChange={() => onChange({ ...state, paid: 'unpaid' })} />
        </div>
      </Section>

      <Section title="Phương thức thanh toán">
        <div className="flex flex-col gap-0.5">
          {PAYMENT_METHODS.map(m => (
            <Check key={m.value} label={m.label} checked={state.methods.has(m.value)} onChange={() => toggleMethod(m.value)} />
          ))}
        </div>
      </Section>
    </div>
  )
}

export default InvoiceFilters
