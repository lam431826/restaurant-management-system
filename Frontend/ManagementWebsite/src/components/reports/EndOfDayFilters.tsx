import { useEffect, useRef, useState } from 'react'
import { Picker } from '../staff/EmployeeModal'
import { roomAreas, rooms } from '../../data/mockData'
import { PAYMENT_METHOD_LABEL } from '../../api/reports'
import type { EndOfDayFilterState } from '../../data/endOfDayReportMockData'
import EndOfDayDateRangePicker from './EndOfDayDateRangePicker'

const PAYMENT_METHOD_LABELS = Object.values(PAYMENT_METHOD_LABEL)

interface Props {
  value: EndOfDayFilterState
  onChange: (next: EndOfDayFilterState) => void
  staffOptions: string[]
}

const ChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)
const CalendarIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted">
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)
const ClockIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
)
const Section = ({ title, required, children }: { title: string; required?: boolean; children: React.ReactNode }) => (
  <div className="flex flex-col gap-3 border-b border-line pb-5">
    <span className="text-md font-semibold text-ink flex items-center gap-1">
      {title}{required && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
    </span>
    {children}
  </div>
)

/** Radio sitting inline to the left of its own field, instead of a plain text label. */
const RadioField = ({ checked, onSelect, children }: { checked: boolean; onSelect: () => void; children: React.ReactNode }) => (
  <div className="flex items-center gap-2">
    <input type="radio" checked={checked} onChange={onSelect} className="w-4 h-4 shrink-0 accent-[var(--kv-primary)] cursor-pointer" />
    <div className="flex-1 min-w-0">{children}</div>
  </div>
)

const fieldCls =
  'w-full h-10 px-3 bg-field border border-line-default rounded-md text-md text-ink transition-colors ' +
  'placeholder:text-ink-muted hover:border-line-strong focus:outline-none focus:border-primary'

/** Chip multi-select — selected values show as removable pills, dropdown adds more. */
const ChipMultiSelect = ({ options, selected, onChange, placeholder }: {
  options: string[]; selected: string[]; onChange: (next: string[]) => void; placeholder: string
}) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter(s => s !== v) : [...selected, v])

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen(o => !o)}
        className={`flex flex-wrap items-center gap-1.5 min-h-10 px-2 py-1.5 bg-field border rounded-md cursor-pointer transition-colors ${open ? 'border-primary' : 'border-line-default hover:border-line-strong'}`}
      >
        {selected.length === 0 && <span className="px-1 text-md text-ink-muted">{placeholder}</span>}
        {selected.map(v => (
          <span key={v} className="flex items-center gap-1.5 h-7 pl-2 pr-1.5 rounded bg-primary-25 text-primary text-sm">
            {v}
            <button type="button" onClick={e => { e.stopPropagation(); toggle(v) }} className="hover:opacity-70 cursor-pointer" aria-label="Bỏ chọn">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </span>
        ))}
        <ChevronDown />
      </div>
      {open && (
        <div className="absolute top-[calc(100%+0.4rem)] left-0 right-0 bg-card border border-line-default rounded-md shadow-md z-[var(--kv-z-dropdown)] max-h-[16rem] overflow-y-auto py-1">
          {options.length === 0
            ? <div className="px-3 py-2 text-md text-ink-muted">Không có dữ liệu</div>
            : options.map(o => (
              <label key={o} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[var(--kv-state-hover-bg)]">
                <input type="checkbox" checked={selected.includes(o)} onChange={() => toggle(o)} className="w-4 h-4 accent-[var(--kv-primary)] cursor-pointer" />
                <span className="text-md text-ink truncate">{o}</span>
              </label>
            ))}
        </div>
      )}
    </div>
  )
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

/** Two-column hour/minute dropdown, cloned from a saved KiotViet reference — replaces the
 * native <input type="time"> whose "--:--" segments can't be restyled or given a placeholder. */
const TimeDropdown = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const hourListRef = useRef<HTMLDivElement>(null)
  const minuteListRef = useRef<HTMLDivElement>(null)
  const [h, m] = value ? value.split(':') : ['', '']

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    if (!open) return
    const scrollToSelected = (listRef: React.RefObject<HTMLDivElement | null>) => {
      listRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'center' })
    }
    scrollToSelected(hourListRef)
    scrollToSelected(minuteListRef)
  }, [open])

  const pick = (part: 'h' | 'm', val: string) => onChange(part === 'h' ? `${val}:${m || '00'}` : `${h || '00'}:${val}`)

  return (
    <div ref={ref} className="relative flex-1">
      <button
        type="button" onClick={() => setOpen(o => !o)}
        className={`flex items-center justify-between w-full h-10 px-3 bg-field border rounded-md cursor-pointer transition-colors ${open ? 'border-primary' : 'border-line-default hover:border-line-strong'}`}
      >
        <span className={`text-md ${value ? 'text-ink' : 'text-ink-muted'}`}>{value || placeholder || '--:--'}</span>
        <ClockIcon />
      </button>
      {open && (
        <div className="absolute top-[calc(100%+0.4rem)] left-0 w-[10rem] bg-card border border-line-default rounded-md shadow-md z-[var(--kv-z-dropdown)] grid grid-cols-2 gap-x-1 p-1">
          <div ref={hourListRef} className="max-h-[14rem] overflow-y-auto">
            {HOURS.map(v => (
              <button key={v} type="button" data-selected={v === h} onClick={() => pick('h', v)}
                className={`block w-full text-center py-2 rounded-md text-md cursor-pointer ${v === h ? 'bg-primary-25 text-primary font-semibold' : 'text-ink hover:bg-fill'}`}>
                {v}
              </button>
            ))}
          </div>
          <div ref={minuteListRef} className="max-h-[14rem] overflow-y-auto">
            {MINUTES.map(v => (
              <button key={v} type="button" data-selected={v === m} onClick={() => pick('m', v)}
                className={`block w-full text-center py-2 rounded-md text-md cursor-pointer ${v === m ? 'bg-primary-25 text-primary font-semibold' : 'text-ink hover:bg-fill'}`}>
                {v}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const EndOfDayFilters = ({ value: f, onChange, staffOptions }: Props) => {
  const set = <K extends keyof EndOfDayFilterState>(key: K, val: EndOfDayFilterState[K]) => onChange({ ...f, [key]: val })
  const tableOptions = (f.areaName ? rooms.filter(r => r.area === f.areaName) : rooms).map(r => r.name)
  const dateInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col gap-5">
      <Section title="Thời gian">
        <RadioField checked={!f.useCustomRange} onSelect={() => set('useCustomRange', false)}>
          <div className="relative">
            <input
              ref={dateInputRef}
              type="date" value={f.date} onChange={e => set('date', e.target.value)}
              className={`${fieldCls} pr-9 [&::-webkit-calendar-picker-indicator]:opacity-0`}
            />
            {/* Explicit showPicker() call instead of relying on hit-testing an invisible,
                CSS-stretched ::-webkit-calendar-picker-indicator — that hack is unreliable
                across Chrome versions and was silently failing to open the picker. */}
            <button
              type="button" tabIndex={-1} aria-label="Chọn ngày"
              onClick={() => dateInputRef.current?.showPicker?.()}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
            >
              <CalendarIcon />
            </button>
          </div>
        </RadioField>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <TimeDropdown value={f.timeFrom} onChange={v => set('timeFrom', v)} />
            <TimeDropdown value={f.timeTo} onChange={v => set('timeTo', v)} placeholder="Đến" />
          </div>
        </div>
        <RadioField checked={f.useCustomRange} onSelect={() => set('useCustomRange', true)}>
          <EndOfDayDateRangePicker
            from={f.customFrom} to={f.customTo}
            onChange={(from, to) => onChange({ ...f, customFrom: from, customTo: to })}
          />
        </RadioField>
      </Section>

      <Section title="Người nhận đơn" required>
        <ChipMultiSelect options={staffOptions} selected={f.staffNames} onChange={v => set('staffNames', v)} placeholder="Chọn người nhận đơn" />
      </Section>

      <Section title="Người tạo">
        <Picker value={f.createdBy} options={staffOptions} placeholder="Chọn người tạo" onChange={v => set('createdBy', v === f.createdBy ? '' : v)} />
      </Section>

      <Section title="Phương thức thanh toán">
        <Picker value={f.paymentMethod} options={PAYMENT_METHOD_LABELS} placeholder="Chọn phương thức" onChange={v => set('paymentMethod', v === f.paymentMethod ? '' : v)} />
      </Section>

      <div className="flex flex-col gap-3">
        <span className="text-md font-semibold text-ink">Phòng/Bàn</span>
        <Picker
          value={f.areaName} options={roomAreas.map(a => a.name)} placeholder="Chọn khu vực"
          onChange={v => onChange({ ...f, areaName: v === f.areaName ? '' : v, tableName: '' })}
        />
        <Picker
          value={f.tableName} options={tableOptions} placeholder="Chọn phòng/bàn"
          onChange={v => set('tableName', v === f.tableName ? '' : v)}
        />
      </div>
    </div>
  )
}

export default EndOfDayFilters
