import { useEffect, useRef, useState } from 'react'
import DateRangeField from '../transactions/DateRangeField'
import { Picker } from '../staff/EmployeeModal'
import { FUND_LABEL } from '../../data/cashBookMockData'
import type { CashBookFilterState, CashFlowCategory, FundFilter, PartnerScope } from '../../data/cashBookMockData'

interface Props {
  categories: CashFlowCategory[]
  createdByOptions: string[]
  value: CashBookFilterState
  onChange: (next: CashBookFilterState) => void
}

const toggle = <T,>(list: T[], value: T): T[] =>
  list.includes(value) ? list.filter(v => v !== value) : [...list, value]

const partnerScopeLabel: Record<PartnerScope, string> = { ALL: 'Tất cả', EMPLOYEE: 'Nhân viên', OTHER: 'Khác', CUSTOMER: 'Khách hàng' }

const ChevronDown = ({ className = '' }: { className?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

// ── Collapsible multi-select checklist ("Chọn loại thu/chi") ───────────────
const CategoryMultiSelect = ({
  categories, selected, onChange,
}: { categories: CashFlowCategory[]; selected: string[]; onChange: (ids: string[]) => void }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const label = selected.length === 0 ? 'Chọn loại thu/chi' : `${selected.length} loại đã chọn`
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center justify-between w-full h-10 px-3 bg-field border rounded-md cursor-pointer transition-colors ${open ? 'border-primary' : 'border-line-default hover:border-line-strong'}`}
      >
        <span className={`text-md truncate ${selected.length ? 'text-ink' : 'text-ink-muted'}`}>{label}</span>
        <ChevronDown className={`text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-[calc(100%+0.4rem)] left-0 right-0 bg-card border border-line-default rounded-md shadow-md z-[var(--kv-z-dropdown)] max-h-[16rem] overflow-y-auto py-1">
          {categories.length === 0
            ? <div className="px-3 py-2 text-md text-ink-muted">Không có dữ liệu</div>
            : categories.map(cat => (
              <label key={cat.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[var(--kv-state-hover-bg)]">
                <input
                  type="checkbox"
                  checked={selected.includes(cat.id)}
                  onChange={() => onChange(toggle(selected, cat.id))}
                  className="w-4 h-4 accent-[var(--kv-primary)] cursor-pointer"
                />
                <span className="text-md text-ink truncate">{cat.name}</span>
              </label>
            ))}
        </div>
      )}
    </div>
  )
}

// ── 2/3-way segmented control (Tất cả / Có / Không) ─────────────────────────
const Segmented = <T extends string>({ options, value, onChange }: { options: [T, string][]; value: T; onChange: (v: T) => void }) => (
  <div className="inline-flex rounded-md border border-line-default overflow-hidden w-fit">
    {options.map(([v, label], i) => (
      <button
        key={v}
        type="button"
        onClick={() => onChange(v)}
        className={`px-4 h-8 text-sm cursor-pointer transition-colors ${i > 0 ? 'border-l border-line-default' : ''} ${value === v ? 'bg-primary text-white' : 'bg-card text-ink-subtle hover:bg-fill'}`}
      >
        {label}
      </button>
    ))}
  </div>
)

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-3 border-b border-line pb-5">
    <span className="text-md font-semibold text-ink">{title}</span>
    {children}
  </div>
)

const RadioRow = ({ checked, onSelect, label }: { checked: boolean; onSelect: () => void; label: string }) => (
  <label className="flex items-center gap-2 cursor-pointer">
    <input type="radio" checked={checked} onChange={onSelect} className="w-4 h-4 accent-[var(--kv-primary)] cursor-pointer" />
    <span className="text-md text-ink">{label}</span>
  </label>
)

const CheckRow = ({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) => (
  <label className="flex items-center gap-2 cursor-pointer">
    <input type="checkbox" checked={checked} onChange={onToggle} className="w-4 h-4 accent-[var(--kv-primary)] cursor-pointer" />
    <span className="text-md text-ink">{label}</span>
  </label>
)

const fieldCls =
  'w-full h-10 px-3 bg-field border border-line-default rounded-md text-md text-ink transition-colors ' +
  'placeholder:text-ink-muted hover:border-line-strong focus:outline-none focus:border-primary'

const CashBookFilters = ({ categories, createdByOptions, value: f, onChange }: Props) => {
  const set = <K extends keyof CashBookFilterState>(key: K, val: CashBookFilterState[K]) => onChange({ ...f, [key]: val })

  return (
    <div className="flex flex-col gap-5">
      <Section title="Quỹ tiền">
        {(['ALL', 'CASH', 'BANK', 'EWALLET'] as FundFilter[]).map(v => (
          <RadioRow key={v} checked={f.fund === v} onSelect={() => set('fund', v)} label={FUND_LABEL[v]} />
        ))}
      </Section>

      <Section title="Thời gian">
        <RadioRow checked={f.timePreset === 'THIS_MONTH'} onSelect={() => set('timePreset', 'THIS_MONTH')} label="Tháng này" />
        <RadioRow checked={f.timePreset === 'CUSTOM'} onSelect={() => set('timePreset', 'CUSTOM')} label="Lựa chọn khác" />
        {f.timePreset === 'CUSTOM' && (
          <DateRangeField from={f.dateFrom} to={f.dateTo} onChange={(from, to) => onChange({ ...f, dateFrom: from, dateTo: to })} />
        )}
      </Section>

      <Section title="Loại chứng từ">
        <CheckRow checked={f.docTypes.includes('RECEIPT')} onToggle={() => set('docTypes', toggle(f.docTypes, 'RECEIPT'))} label="Phiếu thu" />
        <CheckRow checked={f.docTypes.includes('PAYMENT')} onToggle={() => set('docTypes', toggle(f.docTypes, 'PAYMENT'))} label="Phiếu chi" />
      </Section>

      <Section title="Loại thu/chi">
        <CategoryMultiSelect categories={categories} selected={f.categoryIds} onChange={ids => set('categoryIds', ids)} />
      </Section>

      <Section title="Trạng thái">
        <CheckRow checked={f.statuses.includes('PAID')} onToggle={() => set('statuses', toggle(f.statuses, 'PAID'))} label="Đã thanh toán" />
        <CheckRow checked={f.statuses.includes('VOIDED')} onToggle={() => set('statuses', toggle(f.statuses, 'VOIDED'))} label="Đã hủy" />
      </Section>

      <Section title="Hạch toán kết quả kinh doanh">
        <Segmented
          options={[['ALL', 'Tất cả'], ['YES', 'Có'], ['NO', 'Không']]}
          value={f.accounting}
          onChange={v => set('accounting', v)}
        />
      </Section>

      <Section title="Người tạo">
        <Picker
          value={f.createdBy}
          options={createdByOptions}
          placeholder="Chọn người tạo"
          onChange={v => set('createdBy', v === f.createdBy ? '' : v)}
        />
      </Section>

      {/* Decorative only: no employee-vs-account distinction in this data model yet. */}
      <Section title="Nhân viên tạo">
        <Picker value="" options={[]} placeholder="Nhân viên tạo" onChange={() => { /* not wired */ }} />
      </Section>

      <div className="flex flex-col gap-3">
        <span className="text-md font-semibold text-ink">Người nộp/nhận</span>
        <Picker
          value={partnerScopeLabel[f.partnerScope]}
          options={Object.values(partnerScopeLabel)}
          placeholder="Tất cả"
          onChange={v => {
            const next = (Object.entries(partnerScopeLabel).find(([, label]) => label === v)?.[0] ?? 'ALL') as PartnerScope
            set('partnerScope', next)
          }}
        />
        <input
          className={fieldCls}
          placeholder="Tên người nộp/nhận"
          value={f.partnerQuery}
          onChange={e => set('partnerQuery', e.target.value)}
        />
        {/* Decorative only: vouchers don't store a partner phone number. */}
        <input className={fieldCls} placeholder="Điện thoại" />
      </div>
    </div>
  )
}

export default CashBookFilters
