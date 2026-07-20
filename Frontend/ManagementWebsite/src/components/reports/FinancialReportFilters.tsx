import { Picker } from '../staff/EmployeeModal'
import { YEAR_OPTIONS } from '../../data/financialReportMockData'
import type { FinancialFilterState, FinancialGranularity } from '../../data/financialReportMockData'

interface Props {
  value: FinancialFilterState
  onChange: (next: FinancialFilterState) => void
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-3 border-b border-line pb-5">
    <span className="text-md font-semibold text-ink">{title}</span>
    {children}
  </div>
)

const RadioField = ({ checked, onSelect, label }: { checked: boolean; onSelect: () => void; label: string }) => (
  <label className="flex items-center gap-2 cursor-pointer">
    <input type="radio" checked={checked} onChange={onSelect} className="w-4 h-4 shrink-0 accent-[var(--kv-primary)] cursor-pointer" />
    <span className="text-md text-ink">{label}</span>
  </label>
)

const GRANULARITY_OPTIONS: { value: FinancialGranularity; label: string }[] = [
  { value: 'month', label: 'Tháng' },
  { value: 'quarter', label: 'Quý' },
  { value: 'year', label: 'Năm' },
]

const FinancialReportFilters = ({ value: f, onChange }: Props) => {
  const set = <K extends keyof FinancialFilterState>(key: K, val: FinancialFilterState[K]) => onChange({ ...f, [key]: val })

  return (
    <div className="flex flex-col gap-5">
      <Section title="Năm">
        <Picker
          value={String(f.year)} options={YEAR_OPTIONS.map(String)} placeholder="Chọn năm"
          onChange={v => set('year', Number(v))}
        />
      </Section>

      <div className="flex flex-col gap-3">
        <span className="text-md font-semibold text-ink">Hiển thị theo</span>
        {GRANULARITY_OPTIONS.map(o => (
          <RadioField key={o.value} checked={f.granularity === o.value} onSelect={() => set('granularity', o.value)} label={o.label} />
        ))}
      </div>
    </div>
  )
}

export default FinancialReportFilters
