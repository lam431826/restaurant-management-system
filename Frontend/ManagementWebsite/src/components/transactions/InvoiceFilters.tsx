import { useState } from 'react'
import type { InvoiceStatus } from '../../data/mockData'
import { invoiceStatusLabels } from '../../data/mockData'

export interface FilterState {
  code: string
  statuses: Set<InvoiceStatus>
  methods: Set<string>
  today: boolean
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
const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted">
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)

/* Collapsible section */
const Section = ({
  title, action, children, defaultOpen = true,
}: { title: string; action?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-line pb-3">
      <button
        className="flex items-center justify-between w-full text-md font-semibold text-ink cursor-pointer py-1"
        onClick={() => setOpen(o => !o)}
      >
        <span className="flex items-center gap-2">
          {title}
          {action}
        </span>
        <Chevron open={open} />
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  )
}

const fieldCls =
  'w-full h-9 px-3 bg-field border border-line-default rounded-md text-md text-ink transition-colors ' +
  'placeholder:text-ink-muted hover:border-line-strong focus:outline-none focus:border-primary'

const PlaceholderSelect = ({ label }: { label: string }) => (
  <button className="flex items-center justify-between w-full h-9 px-3 bg-field border border-line-default rounded-md cursor-pointer transition-colors hover:border-line-strong" type="button">
    <span className="text-md text-ink-muted truncate">{label}</span>
    <Chevron open={false} />
  </button>
)

const Check = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) => (
  <label className="kv-check py-0.5">
    <input type="checkbox" checked={checked} onChange={onChange} />
    <span className="kv-check-box" />
    <span className="kv-check-text">{label}</span>
  </label>
)

const DELIVERY_STATES = ['Chờ xử lý', 'Đang lấy hàng', 'Đang giao hàng', 'Giao thành công', 'Đang chuyển hoàn', 'Đã chuyển hoàn', 'Đã hủy']
const METHODS = ['Tiền mặt', 'Thẻ', 'Chuyển khoản', 'Ví điện tử']
const ALL_STATUSES: InvoiceStatus[] = ['processing', 'completed', 'undelivered', 'cancelled']

const InvoiceFilters = ({ state, onChange }: Props) => {
  const [deliveryTime, setDeliveryTime] = useState<'all' | 'other'>('all')
  const [delivery, setDelivery] = useState<Set<string>>(new Set())

  const toggleStatus = (s: InvoiceStatus) => {
    const next = new Set(state.statuses)
    if (next.has(s)) next.delete(s); else next.add(s)
    onChange({ ...state, statuses: next })
  }
  const toggleMethod = (m: string) => {
    const next = new Set(state.methods)
    if (next.has(m)) next.delete(m); else next.add(m)
    onChange({ ...state, methods: next })
  }
  const toggleDelivery = (d: string) =>
    setDelivery(prev => {
      const next = new Set(prev)
      if (next.has(d)) next.delete(d); else next.add(d)
      return next
    })

  return (
    <div className="flex flex-col gap-3 text-md">
      {/* Tìm kiếm */}
      <Section title="Tìm kiếm">
        <div className="flex flex-col gap-2">
          <input className={fieldCls} placeholder="Theo mã hóa đơn" value={state.code} onChange={e => onChange({ ...state, code: e.target.value })} />
          <input className={fieldCls} placeholder="Theo mã, tên hàng" />
          <button className="self-center text-sm font-medium text-primary cursor-pointer hover:underline">Mở rộng ↓</button>
        </div>
      </Section>

      {/* Thời gian */}
      <Section title="Thời gian">
        <div className="flex flex-col gap-2">
          <label className="kv-radio">
            <input type="radio" name="inv-time" checked={state.today} onChange={() => onChange({ ...state, today: true })} />
            <span className="kv-radio-dot" />
            <span className="kv-radio-text flex-1">
              <span className="flex items-center justify-between w-full h-9 px-3 bg-field border border-line-default rounded-md">
                <span className="text-md text-ink">Hôm nay</span>
                <span className="flex flex-col text-ink-muted leading-none"><span className="text-[0.9rem]">▲</span><span className="text-[0.9rem]">▼</span></span>
              </span>
            </span>
          </label>
          <label className="kv-radio">
            <input type="radio" name="inv-time" checked={!state.today} onChange={() => onChange({ ...state, today: false })} />
            <span className="kv-radio-dot" />
            <span className="kv-radio-text flex-1">
              <span className="flex items-center justify-between w-full h-9 px-3 bg-field border border-line-default rounded-md">
                <span className="text-md text-ink-muted">Lựa chọn khác</span>
                <CalendarIcon />
              </span>
            </span>
          </label>
        </div>
      </Section>

      {/* Trạng thái */}
      <Section title="Trạng thái">
        <div className="flex flex-col gap-2">
          <PlaceholderSelect label="Chọn phương thức bán hàng" />
          <div className="flex flex-col gap-0.5">
            {ALL_STATUSES.map(s => (
              <Check key={s} label={invoiceStatusLabels[s]} checked={state.statuses.has(s)} onChange={() => toggleStatus(s)} />
            ))}
          </div>
        </div>
      </Section>

      {/* Trạng thái giao hàng */}
      <Section title="Trạng thái giao hàng" defaultOpen={false}>
        <div className="flex flex-col gap-0.5">
          {DELIVERY_STATES.map(d => (
            <Check key={d} label={d} checked={delivery.has(d)} onChange={() => toggleDelivery(d)} />
          ))}
        </div>
      </Section>

      {/* Kênh bán */}
      <Section
        title="Kênh bán"
        action={<span className="w-4 h-4 inline-flex items-center justify-center rounded-full border border-primary text-primary text-[1rem] leading-none">+</span>}
        defaultOpen={false}
      >
        <PlaceholderSelect label="Chọn kênh bán" />
      </Section>

      {/* Đối tác giao hàng */}
      <Section title="Đối tác giao hàng" defaultOpen={false}>
        <PlaceholderSelect label="Chọn người giao..." />
      </Section>

      {/* Thời gian giao */}
      <Section title="Thời gian giao" defaultOpen={false}>
        <div className="flex flex-col gap-2">
          <label className="kv-radio">
            <input type="radio" name="inv-deltime" checked={deliveryTime === 'all'} onChange={() => setDeliveryTime('all')} />
            <span className="kv-radio-dot" /><span className="kv-radio-text">Toàn thời gian</span>
          </label>
          <label className="kv-radio">
            <input type="radio" name="inv-deltime" checked={deliveryTime === 'other'} onChange={() => setDeliveryTime('other')} />
            <span className="kv-radio-dot" /><span className="kv-radio-text">Lựa chọn khác</span>
          </label>
        </div>
      </Section>

      {/* Phương thức */}
      <Section title="Phương thức">
        <div className="flex flex-col gap-0.5">
          {METHODS.map(m => (
            <Check key={m} label={m} checked={state.methods.has(m)} onChange={() => toggleMethod(m)} />
          ))}
        </div>
      </Section>

      {/* Bảng giá */}
      <Section title="Bảng giá" defaultOpen={false}>
        <PlaceholderSelect label="Chọn bảng giá..." />
      </Section>

      {/* Phòng/Bàn */}
      <Section title="Phòng/Bàn" defaultOpen={false}>
        <div className="flex flex-col gap-2">
          <PlaceholderSelect label="Chọn khu vực" />
          <PlaceholderSelect label="Chọn phòng/bàn..." />
        </div>
      </Section>

      {/* Số bản ghi */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-md font-semibold text-ink">Số bản ghi:</span>
        <button className="flex items-center gap-2 text-md text-ink cursor-pointer">
          15 <Chevron open={false} />
        </button>
      </div>
    </div>
  )
}

export default InvoiceFilters
