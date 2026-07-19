import { useEffect, useRef, useState } from 'react'
import type { Employee } from '../../data/mockData'
import { getSalarySetting, putSalarySetting } from '../../api/employees'
import type { EmployeeDto, EmployeeFormPayload, SalaryType } from '../../api/employees'
import { listUsers, createUser } from '../../api/users'
import type { UserDto } from '../../api/users'
import { listSalaryTemplates, createSalaryTemplate } from '../../api/salaryTemplates'
import type { SalaryTemplateDto } from '../../api/salaryTemplates'

type TabKey = 'info' | 'salary'

interface Props {
  employee?: Employee
  onClose: () => void
  // Resolves with the saved employee so the salary setting can be PUT against its id.
  onSave: (payload: EmployeeFormPayload) => Promise<EmployeeDto | void>
  initialTab?: TabKey
}

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
const ChevronDown = ({ className = '' }: { className?: string }) => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className={`shrink-0 ${className}`}>
    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const CameraIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
  </svg>
)
const InfoIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
)
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink-muted">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)
export const inputCls =
  'w-full h-11 px-3 bg-field border border-line-default rounded-md text-md text-ink transition-colors ' +
  'placeholder:text-ink-muted hover:border-line-strong focus:outline-none focus:border-primary ' +
  'focus:shadow-[0_0_0_0.3rem_rgba(var(--kv-primary-rgb),0.12)]'

// ── Field: label stacked above the control ──────────────────────────────
export const Field = ({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    <label className="text-md text-ink-subtle">{label}</label>
    {children}
  </div>
)

// ── Dropdown picker ─────────────────────────────────────────────────────
export const Picker = ({
  value, options, placeholder, onChange, openUp,
}: { value: string; options: string[]; placeholder: string; onChange: (v: string) => void; openUp?: boolean }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center justify-between w-full h-11 px-3 bg-field border rounded-md cursor-pointer transition-colors ${open ? 'border-primary' : 'border-line-default hover:border-line-strong'}`}
      >
        <span className={`text-md truncate ${value ? 'text-ink' : 'text-ink-muted'}`}>{value || placeholder}</span>
        <ChevronDown className={`text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className={`absolute ${openUp ? 'bottom-[calc(100%+0.4rem)]' : 'top-[calc(100%+0.4rem)]'} left-0 right-0 bg-card border border-line-default rounded-md shadow-md z-[var(--kv-z-dropdown)] max-h-[22rem] overflow-y-auto py-1`}>
          {options.length === 0 ? (
            <div className="px-3 py-2 text-md text-ink-muted">Không có dữ liệu</div>
          ) : options.map(opt => (
            <div
              key={opt}
              className={`px-3 py-2 text-md cursor-pointer transition-colors hover:bg-[var(--kv-state-hover-bg)] ${opt === value ? 'text-primary font-medium bg-[var(--kv-action-primary-faded-bg)]' : 'text-ink'}`}
              onClick={() => { onChange(opt); setOpen(false) }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Account picker: search box + list + "Thêm tài khoản" ────────────────
// `value`/onChange operate on the account's real id (Employee.userId), not the username.
const AccountPicker = ({
  value, accounts, onChange, onAddAccount,
}: { value: string; accounts: UserDto[]; onChange: (v: string) => void; onAddAccount: () => void }) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const filtered = accounts.filter(a =>
    !query.trim() || `${a.username} ${a.fullName}`.toLowerCase().includes(query.trim().toLowerCase())
  )
  const selected = accounts.find(a => a.id === value)
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center justify-between w-full h-11 px-3 bg-field border rounded-md cursor-pointer transition-colors ${open ? 'border-primary' : 'border-line-default hover:border-line-strong'}`}
      >
        <span className={`text-md truncate ${value ? 'text-ink' : 'text-ink-muted'}`}>{selected?.username || 'Chọn Tài khoản'}</span>
        <ChevronDown className={`text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-[calc(100%+0.4rem)] left-0 right-0 bg-card border border-line-default rounded-md shadow-md z-[var(--kv-z-dropdown)] flex flex-col max-h-[26rem]">
          <div className="p-2 shrink-0">
            <div className="flex items-center gap-2 h-10 px-3 bg-field border border-line-default rounded-md">
              <SearchIcon />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="flex-1 min-w-0 bg-transparent text-md text-ink placeholder:text-ink-muted focus:outline-none"
              />
            </div>
          </div>
          <div className="overflow-y-auto py-1">
            <div
              className="px-3 py-2.5 text-md cursor-pointer transition-colors text-primary font-medium bg-[var(--kv-action-primary-faded-bg)]"
              onClick={() => { onChange(''); setOpen(false); setQuery('') }}
            >
              Chọn Tài khoản
            </div>
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-md text-ink-muted">Không có dữ liệu</div>
            ) : filtered.map(a => (
              <div
                key={a.id}
                className={`px-3 py-2.5 cursor-pointer transition-colors hover:bg-[var(--kv-state-hover-bg)] ${a.id === value ? 'bg-[var(--kv-action-primary-faded-bg)]' : ''}`}
                onClick={() => { onChange(a.id); setOpen(false); setQuery('') }}
              >
                <div className="text-md font-bold text-ink">{a.username}</div>
                <div className="text-sm text-ink-subtle">{a.fullName}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-line shrink-0">
            <button
              type="button"
              onClick={() => { setOpen(false); setQuery(''); onAddAccount() }}
              className="flex items-center gap-1.5 w-full px-3 py-2.5 text-primary text-md font-medium hover:bg-[var(--kv-action-primary-faded-bg)] cursor-pointer"
            >
              <span className="text-lg leading-none">+</span> Thêm tài khoản
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Toggle switch ───────────────────────────────────────────────────────
const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`relative w-11 h-6 rounded-full shrink-0 transition-colors cursor-pointer ${checked ? 'bg-primary' : 'bg-fill-strong'}`}
  >
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
  </button>
)

// ── White card section, optionally collapsible ──────────────────────────
export const SectionCard = ({
  title, collapsible, children, extra,
}: { title?: string; collapsible?: boolean; children: React.ReactNode; extra?: React.ReactNode }) => {
  const [open, setOpen] = useState(true)
  return (
    <div className="bg-card rounded-lg p-5">
      {title && (
        <div className="flex items-center justify-between">
          <h3 className="text-md font-bold text-ink flex items-center gap-1.5">{title}{extra}</h3>
          {collapsible && (
            <button
              type="button"
              onClick={() => setOpen(o => !o)}
              className="w-7 h-7 flex items-center justify-center rounded-md text-ink-subtle cursor-pointer transition-colors hover:bg-fill hover:text-ink"
              aria-label={open ? 'Thu gọn' : 'Mở rộng'}
            >
              <ChevronDown className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      )}
      {open && children}
    </div>
  )
}

// ── Shift-based salary (Theo ca làm việc) ───────────────────────────────
const SHIFT_OPTIONS = [
  { name: 'Sáng', branch: 'Chi nhánh trung tâm' },
  { name: 'Chiều', branch: 'Chi nhánh trung tâm' },
  { name: 'Đêm', branch: 'Chi nhánh trung tâm' },
]
const TrashIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
)
// Comma-groups a raw digit string for display (e.g. "200000" -> "200,000"); stored state stays digit-only.
const fmtMoneyInput = (raw?: string) => {
  const digits = (raw ?? '').replace(/\D/g, '')
  return digits ? Number(digits).toLocaleString('en-US') : ''
}
const CellInput = ({ value, onChange, defaultValue, center, w = 'w-[10rem]' }: { value?: string; onChange?: (v: string) => void; defaultValue?: string; center?: boolean; w?: string }) => (
  <input
    inputMode="numeric"
    value={value !== undefined ? fmtMoneyInput(value) : undefined}
    defaultValue={value === undefined ? fmtMoneyInput(defaultValue) : undefined}
    onChange={e => onChange?.(e.target.value.replace(/\D/g, ''))}
    className={`${w} h-9 px-2 bg-field border border-line-default rounded-md text-md text-ink focus:border-primary focus:outline-none ${center ? 'text-center' : ''}`} />
)
const PlusBtn = () => (<button type="button" className="text-primary text-xl leading-none hover:opacity-80 cursor-pointer" aria-label="Thêm">+</button>)

const ShiftPicker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} className="relative w-[11rem]">
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`flex items-center justify-between w-full h-9 px-3 bg-field border rounded-md cursor-pointer transition-colors ${open ? 'border-primary' : 'border-line-default hover:border-line-strong'}`}>
        <span className={`text-md truncate ${value ? 'text-ink' : 'text-ink-muted'}`}>{value || 'Chọn ca'}</span>
        <ChevronDown className={`text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+0.3rem)] w-[17rem] bg-card border border-line-default rounded-md shadow-md z-[var(--kv-z-dropdown)] py-1">
          <button type="button" onClick={() => { onChange(''); setOpen(false) }} className="block w-full text-left px-3 py-2 text-md text-ink bg-[var(--kv-action-primary-faded-bg)]">Chọn ca</button>
          {SHIFT_OPTIONS.map(s => (
            <button key={s.name} type="button" onClick={() => { onChange(s.name); setOpen(false) }} className="block w-full text-left px-3 py-2 hover:bg-[var(--kv-state-hover-bg)] cursor-pointer">
              <div className="text-md text-ink">{s.name}</div>
              <div className="text-sm text-ink-muted">{s.branch}</div>
            </button>
          ))}
          <div className="border-t border-line mt-1">
            <button type="button" className="flex items-center gap-1.5 w-full px-3 py-2.5 text-primary text-md font-medium hover:bg-[var(--kv-action-primary-faded-bg)] cursor-pointer"><span className="text-lg leading-none">+</span> Thêm ca</button>
          </div>
        </div>
      )}
    </div>
  )
}

// a day-type rate cell that can hold a % or a fixed VND amount, edited in a popover
export type Rate = { amount: string; unit: 'percent' | 'vnd' } | null
// limits: 999 for %, 99,999,999 for VND. Returns a display string ("," separators for VND).
const fmtRate = (raw: string, unit: 'percent' | 'vnd') => {
  const digits = raw.replace(/\D/g, '')
  if (digits === '') return ''
  const n = Math.min(parseInt(digits, 10), unit === 'percent' ? 999 : 99999999)
  return unit === 'vnd' ? n.toLocaleString('en-US') : String(n)
}
export const rateLabel = (r: Rate) => r ? (r.unit === 'percent' ? `${r.amount}%` : `${Number(r.amount || 0).toLocaleString('en-US')}`) : ''
const RateCell = ({ value, onChange }: { value: Rate; onChange: (v: Rate) => void }) => {
  const [open, setOpen] = useState(false)
  const [amt, setAmt] = useState('')
  const [unit, setUnit] = useState<'percent' | 'vnd'>('percent')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const openPop = () => { const u = value?.unit ?? 'percent'; setUnit(u); setAmt(fmtRate(value?.amount ?? '100', u)); setOpen(true) }
  const changeUnit = (u: 'percent' | 'vnd') => { setAmt(fmtRate(amt, u)); setUnit(u) }
  return (
    <div ref={ref} className="relative">
      {value
        ? <button type="button" onClick={openPop} className="w-full h-9 px-2 bg-field border border-line-default rounded-md text-md text-ink text-left cursor-pointer hover:border-line-strong">{rateLabel(value)}</button>
        : <button type="button" onClick={openPop} className="text-primary text-xl leading-none hover:opacity-80 cursor-pointer" aria-label="Thêm">+</button>}
      {open && (
        <div className="absolute right-0 top-[calc(100%+0.4rem)] z-[var(--kv-z-dropdown)] w-[40rem] max-w-[80vw] bg-card border border-line-default rounded-lg shadow-lg p-3">
          <div className="flex items-center gap-2 mb-3">
            <input autoFocus inputMode="numeric" value={amt} onChange={e => setAmt(fmtRate(e.target.value, unit))} className="flex-1 min-w-0 h-9 px-2 text-right bg-field border border-line-default rounded-md text-md text-ink focus:border-primary focus:outline-none" />
            <div className="flex rounded-md overflow-hidden border border-line-default shrink-0">
              <button type="button" onClick={() => changeUnit('vnd')} className={`px-3 h-9 text-sm cursor-pointer ${unit === 'vnd' ? 'bg-primary text-white' : 'bg-card text-ink-subtle'}`}>VND</button>
              <button type="button" onClick={() => changeUnit('percent')} className={`px-3 h-9 text-sm cursor-pointer ${unit === 'percent' ? 'bg-primary text-white' : 'bg-card text-ink-subtle'}`}>%</button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => { onChange(null); setOpen(false) }} className="kv-btn kv-btn-outline-neutral h-8 bg-card">Xóa</button>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setOpen(false)} className="kv-btn kv-btn-outline-neutral h-8 bg-card">Bỏ qua</button>
              <button type="button" onClick={() => { onChange({ amount: amt.replace(/\D/g, ''), unit }); setOpen(false) }} className="kv-btn kv-btn-primary h-8">Xong</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface CondRow { id: number; shift: string; wage: string; sat: Rate; sun: Rate; off: Rate; holiday: Rate }

// Lifted salary-config state, round-tripped to /api/employees/{id}/salary-setting.
// The JSON shape of `def`/`ot` is the canonical rates format the payroll module parses.
export interface DayRates { sat: Rate; sun: Rate; off: Rate; holiday: Rate }
export interface OtRates extends DayRates { normal: Rate }
export interface SalaryConfig { base: string; def: DayRates; overtimeEnabled: boolean; ot: OtRates }
const pct = (a: string): Rate => ({ amount: a, unit: 'percent' })
export const defaultSalaryConfig = (): SalaryConfig => ({
  base: '0',
  def: { sat: null, sun: null, off: pct('100'), holiday: pct('100') },
  overtimeEnabled: false,
  ot: { normal: pct('150'), sat: pct('200'), sun: pct('200'), off: pct('200'), holiday: pct('300') },
})

export const ShiftSalaryBody = ({ value, onChange, suffix = '/ ca', firstCol = 'Ca', wageCol = 'Lương/ca', showOvertime = true, noAdvanced = false }: { value: SalaryConfig; onChange: (v: SalaryConfig) => void; suffix?: string; firstCol?: string; wageCol?: string; showOvertime?: boolean; noAdvanced?: boolean }) => {
  // Auto-expand when an already-saved setting has weekend rates, so loaded data is visible
  // without the manager having to know to flip the toggle themselves. Never for noAdvanced
  // (Cố định) — otherwise leftover def.sat/sun from a previously-selected salary type would
  // force the table open even though its toggle is hidden.
  const [advanced, setAdvanced] = useState(() => !noAdvanced && (value.def.sat !== null || value.def.sun !== null))
  useEffect(() => {
    if (!noAdvanced && (value.def.sat !== null || value.def.sun !== null)) setAdvanced(true)
  }, [value.def.sat, value.def.sun, noAdvanced])
  // per-shift condition rows remain UI-only (deferred until per-shift rates are specced)
  const [rows, setRows] = useState<CondRow[]>([])
  const { base, def, overtimeEnabled: overtime, ot } = value
  const setBase = (b: string) => onChange({ ...value, base: b })
  const setOvertime = (v: boolean) => onChange({ ...value, overtimeEnabled: v })
  const setDef = (f: (d: DayRates) => DayRates) => onChange({ ...value, def: f(value.def) })
  const setOt = (f: (o: OtRates) => OtRates) => onChange({ ...value, ot: f(value.ot) })
  const addRow = () => setRows(rs => [...rs, { id: Date.now(), shift: '', wage: '', sat: null, sun: null, off: null, holiday: null }])
  const removeRow = (id: number) => setRows(rs => rs.filter(r => r.id !== id))
  const setRow = (id: number, p: Partial<CondRow>) => setRows(rs => rs.map(r => r.id === id ? { ...r, ...p } : r))

  return (
    <>
      {/* Mức lương */}
      <div className="border-t border-line mt-4 pt-4">
        <div className="flex items-center gap-4">
          <label className="text-md font-bold text-ink w-[8rem] shrink-0">Mức lương</label>
          {!advanced && (
            <div className="relative w-[40rem] max-w-full">
              <input inputMode="numeric" value={fmtMoneyInput(base)} onChange={e => setBase(e.target.value.replace(/\D/g, ''))} className={`${inputCls} pr-14`} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-md text-ink-subtle">{suffix}</span>
            </div>
          )}
          <div className="flex-1" />
          {!noAdvanced && (
            <label className="flex items-center gap-2 shrink-0">
              <span className="text-md text-ink">Thiết lập nâng cao</span>
              <Toggle checked={advanced} onChange={setAdvanced} />
            </label>
          )}
        </div>

        {advanced && (
          <div className="mt-4">
            <div className="border border-line rounded-lg">
              <table className="w-full table-fixed border-collapse min-w-[52rem]">
                <thead>
                  <tr className="bg-fill text-sm font-semibold text-ink-subtle">
                    <th className="text-left px-4 py-2.5 w-[18rem]">{firstCol}</th>
                    <th className="text-left px-4 py-2.5">{wageCol}</th>
                    <th className="text-left px-4 py-2.5">Thứ 7</th>
                    <th className="text-left px-4 py-2.5">Chủ nhật</th>
                    <th className="text-left px-4 py-2.5">Ngày nghỉ</th>
                    <th className="text-left px-4 py-2.5">Ngày lễ tết</th>
                    <th className="w-[3.5rem]" />
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-line">
                    <td className="px-4 py-3 text-md text-ink">Mặc định</td>
                    <td className="px-4 py-3"><CellInput value={base} onChange={setBase} w="w-full" /></td>
                    <td className="px-4 py-3"><RateCell value={def.sat} onChange={v => setDef(d => ({ ...d, sat: v }))} /></td>
                    <td className="px-4 py-3"><RateCell value={def.sun} onChange={v => setDef(d => ({ ...d, sun: v }))} /></td>
                    <td className="px-4 py-3"><RateCell value={def.off} onChange={v => setDef(d => ({ ...d, off: v }))} /></td>
                    <td className="px-4 py-3"><RateCell value={def.holiday} onChange={v => setDef(d => ({ ...d, holiday: v }))} /></td>
                    <td />
                  </tr>
                  {rows.map(r => (
                    <tr key={r.id} className="border-t border-line">
                      <td className="px-4 py-3"><ShiftPicker value={r.shift} onChange={v => setRow(r.id, { shift: v })} /></td>
                      <td className="px-4 py-3"><CellInput value={r.wage} onChange={v => setRow(r.id, { wage: v })} w="w-full" /></td>
                      <td className="px-4 py-3"><RateCell value={r.sat} onChange={v => setRow(r.id, { sat: v })} /></td>
                      <td className="px-4 py-3"><RateCell value={r.sun} onChange={v => setRow(r.id, { sun: v })} /></td>
                      <td className="px-4 py-3"><RateCell value={r.off} onChange={v => setRow(r.id, { off: v })} /></td>
                      <td className="px-4 py-3"><RateCell value={r.holiday} onChange={v => setRow(r.id, { holiday: v })} /></td>
                      <td className="px-2 py-3 text-right"><button type="button" onClick={() => removeRow(r.id)} className="w-8 h-8 inline-flex items-center justify-center rounded-md text-ink-muted hover:text-danger hover:bg-danger-50 cursor-pointer" aria-label="Xóa"><TrashIcon /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={addRow} className="mt-3 text-primary text-md font-medium hover:underline cursor-pointer">Thêm điều kiện</button>
          </div>
        )}
      </div>

      {/* Lương làm thêm giờ */}
      {showOvertime && (
      <div className="border-t border-line mt-4 pt-4">
        <div className="flex items-center justify-between gap-4">
          <span className="text-md font-bold text-ink">Lương làm thêm giờ</span>
          <Toggle checked={overtime} onChange={setOvertime} />
        </div>
        {overtime && (
          <div className="mt-4 border border-line rounded-lg">
            <table className="w-full table-fixed border-collapse min-w-[52rem]">
              <thead>
                <tr className="bg-fill text-sm font-semibold text-ink-subtle">
                  <th className="text-left px-4 py-2.5 w-[18rem]">&nbsp;</th>
                  <th className="text-left px-4 py-2.5">Ngày thường</th>
                  <th className="text-left px-4 py-2.5">Thứ 7</th>
                  <th className="text-left px-4 py-2.5">Chủ nhật</th>
                  <th className="text-left px-4 py-2.5">Ngày nghỉ</th>
                  <th className="text-left px-4 py-2.5">Ngày lễ tết</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-line">
                  <td className="px-4 py-3 text-md text-ink">Hệ số lương trên giờ</td>
                  <td className="px-4 py-3"><RateCell value={ot.normal} onChange={v => setOt(o => ({ ...o, normal: v }))} /></td>
                  <td className="px-4 py-3"><RateCell value={ot.sat} onChange={v => setOt(o => ({ ...o, sat: v }))} /></td>
                  <td className="px-4 py-3"><RateCell value={ot.sun} onChange={v => setOt(o => ({ ...o, sun: v }))} /></td>
                  <td className="px-4 py-3"><RateCell value={ot.off} onChange={v => setOt(o => ({ ...o, off: v }))} /></td>
                  <td className="px-4 py-3"><RateCell value={ot.holiday} onChange={v => setOt(o => ({ ...o, holiday: v }))} /></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}
    </>
  )
}

// Salary-type labels ↔ backend enum values.
export const salaryTypes = ['Theo ca làm việc', 'Theo giờ làm việc', 'Cố định']
export const LABEL_TO_SALARY_TYPE: Record<string, SalaryType> = {
  'Theo ca làm việc': 'SHIFT',
  'Theo giờ làm việc': 'HOURLY',
  'Cố định': 'FIXED',
}
export const SALARY_TYPE_TO_LABEL: Record<SalaryType, string> = {
  SHIFT: 'Theo ca làm việc',
  HOURLY: 'Theo giờ làm việc',
  FIXED: 'Cố định',
}
export const parseRates = (json: string | null): DayRates | null => {
  if (!json) return null
  try {
    return JSON.parse(json) as DayRates
  } catch {
    return null
  }
}
// Manager may create accounts, but never with role ADMIN (enforced server-side too) — so
// "Quản trị viên" is intentionally not offered here at all.
const ROLE_LABELS: Record<string, string> = { 'Phục vụ': 'WAITER', 'Thu ngân': 'CASHIER', 'Quản lý': 'MANAGER' }
const roleOptions = Object.keys(ROLE_LABELS)

// ── Popup: Tạo tài khoản người dùng ──────────────────────────────────────
const CreateAccountModal = ({ onClose, onCreate }: { onClose: () => void; onCreate: (user: UserDto, tempPassword: string) => void }) => {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [role, setRole] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!displayName.trim() || !username.trim() || !role) {
      setError('Vui lòng nhập đầy đủ các trường bắt buộc')
      return
    }
    setSaving(true)
    try {
      const res = await createUser({
        username: username.trim(),
        fullName: displayName.trim(),
        email: email.trim() || undefined,
        role: ROLE_LABELS[role],
      })
      onCreate(res.data.data.user, res.data.data.tempPassword)
    } catch (err) {
      const anyErr = err as { response?: { status?: number; data?: { message?: string } } }
      if (anyErr.response?.status === 409) setError('Tên đăng nhập hoặc email đã tồn tại')
      else setError(anyErr.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[var(--kv-z-modal)] flex items-start justify-center p-6 overflow-y-auto"
      style={{ background: 'rgba(var(--kv-black-rgb), 0.45)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-[70rem] my-6 bg-surface rounded-lg shadow-lg flex flex-col max-h-[calc(100vh-6rem)]">
        <div className="flex items-center justify-between px-6 h-16 bg-card rounded-t-lg border-b border-line shrink-0">
          <h2 className="text-h3 font-bold text-ink">Tạo tài khoản người dùng</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-md text-ink-subtle cursor-pointer transition-colors hover:bg-fill hover:text-ink" aria-label="Đóng">
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
            <Field label="Tên hiển thị">
              <input className={inputCls} placeholder="Bắt buộc" value={displayName}
                onChange={e => { setDisplayName(e.target.value); if (error) setError('') }} />
            </Field>
            <Field label="Email">
              <input className={inputCls} inputMode="email" placeholder="email@gmail.com" value={email} onChange={e => setEmail(e.target.value)} />
            </Field>
            <Field label="Tên đăng nhập">
              <input className={inputCls} placeholder="Bắt buộc" value={username}
                onChange={e => { setUsername(e.target.value); if (error) setError('') }} />
            </Field>
          </div>

          <SectionCard title="Phân quyền">
            <p className="text-md text-ink-subtle mt-1">Chọn vai trò cho người dùng này</p>
            <div className="mt-4 w-full sm:w-[24rem]">
              <Field label="Vai trò">
                <Picker value={role} options={roleOptions} placeholder="Chọn vai trò" onChange={setRole} openUp />
              </Field>
            </div>
          </SectionCard>

          <p className="text-sm text-ink-subtle">
            Hệ thống sẽ tự sinh mật khẩu tạm thời cho tài khoản này sau khi tạo.
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 px-6 py-3 bg-card rounded-b-lg border-t border-line shrink-0">
          <span className="text-md text-danger">{error}</span>
          <div className="flex items-center gap-2">
            <button className="kv-btn kv-btn-outline-neutral h-10" onClick={onClose} disabled={saving}>Bỏ qua</button>
            <button className="kv-btn kv-btn-primary h-10" onClick={handleSave} disabled={saving}>{saving ? 'Đang tạo...' : 'Lưu'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Popup: hiển thị mật khẩu tạm thời (chỉ hiển thị 1 lần) ───────────────
const TempPasswordModal = ({ username, tempPassword, onClose }: { username: string; tempPassword: string; onClose: () => void }) => {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(tempPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="fixed inset-0 z-[var(--kv-z-modal)] flex items-center justify-center p-6" style={{ background: 'rgba(var(--kv-black-rgb), 0.45)' }}>
      <div className="w-full max-w-[36rem] bg-surface rounded-lg shadow-lg p-6 flex flex-col gap-4">
        <h2 className="text-h3 font-bold text-ink">Đã tạo tài khoản "{username}"</h2>
        <div className="bg-fill rounded-lg p-4">
          <p className="text-sm text-ink-subtle mb-2">Mật khẩu tạm thời (chỉ hiển thị 1 lần)</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-lg font-bold text-ink font-mono tracking-wider">{tempPassword}</code>
            <button onClick={copy} className="kv-btn kv-btn-outline-neutral h-9">{copied ? 'Đã chép' : 'Chép'}</button>
          </div>
        </div>
        <p className="text-sm text-ink-subtle">Vui lòng gửi mật khẩu này cho nhân viên. Họ sẽ cần đổi mật khẩu khi đăng nhập lần đầu.</p>
        <button className="kv-btn kv-btn-primary h-10" onClick={onClose}>Đã hiểu</button>
      </div>
    </div>
  )
}

const EmployeeModal = ({ employee, onClose, onSave, initialTab = 'info' }: Props) => {
  const isEdit = !!employee
  const [tab, setTab] = useState<TabKey>(initialTab)

  // ── Thông tin khởi tạo
  const [name, setName] = useState(employee?.name ?? '')
  const [phone, setPhone] = useState(employee?.phone ?? '')
  const [photo, setPhoto] = useState<string>('')

  // ── Thông tin công việc
  const [startDate, setStartDate] = useState(employee?.startDate ?? '')
  const [userId, setUserId] = useState(employee?.userId ?? '')
  const [accounts, setAccounts] = useState<UserDto[]>([])
  const [showCreateAccount, setShowCreateAccount] = useState(false)
  const [tempPasswordInfo, setTempPasswordInfo] = useState<{ username: string; password: string } | null>(null)
  const [note, setNote] = useState(employee?.note ?? '')

  // ── Thông tin cá nhân
  const [idNumber, setIdNumber] = useState(employee?.idNumber ?? '')
  const [birthday, setBirthday] = useState(employee?.birthday ?? '')
  const [gender, setGender] = useState(employee?.gender ?? '')
  const [address, setAddress] = useState(employee?.address ?? '')

  // ── Thiết lập lương (round-tripped to /api/employees/{id}/salary-setting)
  const [salaryType, setSalaryType] = useState('')
  const [salaryTemplate, setSalaryTemplate] = useState('')
  const [salaryConfig, setSalaryConfig] = useState<SalaryConfig>(defaultSalaryConfig)
  const [salaryTemplates, setSalaryTemplates] = useState<SalaryTemplateDto[]>([])

  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const nameRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  useEffect(() => {
    listUsers(0, 100).then(res => setAccounts(res.data.data)).catch(() => {})
  }, [])

  useEffect(() => {
    listSalaryTemplates().then(res => setSalaryTemplates(res.data.data)).catch(() => {})
  }, [])

  // BR-PAY-01: applying a template is copy-on-apply — prefills salaryType/salaryConfig,
  // still freely editable after; editing/deleting the template later never reaches back here.
  const applyTemplate = (name: string) => {
    setSalaryTemplate(name)
    const t = salaryTemplates.find(x => x.name === name)
    if (!t) return
    setSalaryType(SALARY_TYPE_TO_LABEL[t.mainSalaryType] ?? '')
    setSalaryConfig(cfg => ({
      base: String(t.mainBaseWage ?? 0),
      def: parseRates(t.mainAdvancedRatesJson) ?? cfg.def,
      overtimeEnabled: t.overtimeEnabled,
      ot: (parseRates(t.overtimeRatesJson) as OtRates | null) ?? cfg.ot,
    }))
  }

  // Load the existing salary setting when editing (id === null ⇒ never configured).
  useEffect(() => {
    if (!employee?.id) return
    getSalarySetting(employee.id).then(res => {
      const s = res.data.data
      if (!s.id) return
      setSalaryType(SALARY_TYPE_TO_LABEL[s.mainSalaryType] ?? '')
      setSalaryTemplate(s.salaryTemplate ?? '')
      setSalaryConfig(cfg => ({
        base: String(s.mainBaseWage ?? 0),
        def: parseRates(s.mainAdvancedRatesJson) ?? cfg.def,
        overtimeEnabled: s.overtimeEnabled,
        ot: (parseRates(s.overtimeRatesJson) as OtRates | null) ?? cfg.ot,
      }))
    }).catch(() => {})
  }, [employee?.id])

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setError('Ảnh không được vượt quá 2Mb'); return }
    setPhoto(URL.createObjectURL(file))
  }

  const extractMessage = (err: unknown): string => {
    const anyErr = err as { response?: { data?: { message?: string } } }
    return anyErr.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại'
  }

  // Shared with "Lưu và tạo mẫu lương mới" — same rate fields the setting and a template store.
  const buildRateFields = () => ({
    mainSalaryType: LABEL_TO_SALARY_TYPE[salaryType],
    mainBaseWage: parseInt(salaryConfig.base.replace(/\D/g, '') || '0', 10),
    mainAdvancedRatesJson: JSON.stringify(salaryConfig.def),
    // BR-PAY-05: overtime only applies to shift-based main salary
    overtimeEnabled: salaryType === 'Theo ca làm việc' && salaryConfig.overtimeEnabled,
    overtimeRatesJson: JSON.stringify(salaryConfig.ot),
  })

  const handleSave = async (createTemplateAfter = false) => {
    if (!name.trim()) {
      setError('Vui lòng nhập tên nhân viên')
      setTab('info')
      nameRef.current?.focus()
      return
    }
    if (!phone.trim()) {
      setError('Vui lòng nhập số điện thoại')
      setTab('info')
      return
    }
    if (!/^0\d{9,10}$/.test(phone.trim())) {
      setError('Số điện thoại không hợp lệ (bắt đầu bằng 0, 10-11 chữ số)')
      setTab('info')
      return
    }
    if (createTemplateAfter && !salaryType) {
      setError('Vui lòng chọn loại lương trước khi tạo mẫu')
      setTab('salary')
      return
    }
    if (createTemplateAfter && !salaryTemplate.trim()) {
      setError('Vui lòng đặt tên mẫu lương')
      setTab('salary')
      return
    }
    const payload: EmployeeFormPayload = {
      name: name.trim(),
      phone: phone.trim(),
      idNumber: idNumber.trim(),
      note: note.trim(),
      birthday,
      gender,
      address: address.trim(),
      startDate,
      userId: userId || undefined,
    }
    setSaving(true)
    try {
      const saved = await onSave(payload)
      const employeeId = saved?.id ?? employee?.id
      if (employeeId && salaryType && LABEL_TO_SALARY_TYPE[salaryType]) {
        await putSalarySetting(employeeId, {
          ...buildRateFields(),
          salaryTemplate: salaryTemplate || null,
        })
      }
      if (createTemplateAfter) {
        await createSalaryTemplate({ name: salaryTemplate.trim(), ...buildRateFields() })
      }
      onClose()
    } catch (err) {
      const anyErr = err as { response?: { status?: number } }
      if (createTemplateAfter && anyErr.response?.status === 409) setError('Tên mẫu lương đã tồn tại')
      else setError(extractMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleCreateAccount = (user: UserDto, tempPassword: string) => {
    setAccounts(prev => [...prev, user])
    setUserId(user.id)
    setShowCreateAccount(false)
    setTempPasswordInfo({ username: user.username, password: tempPassword })
  }

  return (
    <>
    <div
      className="fixed inset-0 z-[var(--kv-z-modal)] flex items-start justify-center p-6 overflow-y-auto"
      style={{ background: 'rgba(var(--kv-black-rgb), 0.45)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-[112rem] my-6 bg-surface rounded-lg shadow-lg flex flex-col max-h-[calc(100vh-6rem)]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 h-16 bg-card rounded-t-lg border-b border-line shrink-0">
          <h2 className="text-h3 font-bold text-ink">{isEdit ? 'Cập nhật nhân viên' : 'Thêm mới nhân viên'}</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-md text-ink-subtle cursor-pointer transition-colors hover:bg-fill hover:text-ink" aria-label="Đóng">
            <CloseIcon />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-stretch gap-6 px-6 h-12 bg-card border-b border-line shrink-0">
          {([['info', 'Thông tin'], ['salary', 'Thiết lập lương']] as [TabKey, string][]).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`relative h-full px-1 text-md font-medium transition-colors cursor-pointer ${tab === id ? 'text-primary' : 'text-ink-subtle hover:text-ink'}`}
            >
              {label}
              {tab === id && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary rounded-full" />}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-4">
          {tab === 'info' ? (
            <>
              {/* Thông tin khởi tạo */}
              <SectionCard title="Thông tin khởi tạo">
                <div className="flex flex-col-reverse sm:flex-row gap-6 mt-4">
                  <div className="flex-1 flex flex-col gap-4">
                    <Field label="Tên nhân viên">
                      <input ref={nameRef} className={inputCls} placeholder="Bắt buộc" value={name}
                        onChange={e => { setName(e.target.value); if (error) setError('') }} />
                    </Field>
                    <Field label="Mã nhân viên">
                      <input className={`${inputCls} bg-fill text-ink-muted`} placeholder="Tự động" value={employee?.code ?? ''} readOnly disabled />
                    </Field>
                    <Field label="Số điện thoại">
                      <input className={inputCls} inputMode="tel" placeholder="Bắt buộc" value={phone}
                        onChange={e => { setPhone(e.target.value); if (error) setError('') }} />
                    </Field>
                  </div>

                  {/* Photo uploader */}
                  <div className="w-full sm:w-[15rem] shrink-0 flex flex-col items-center justify-center">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="w-[9rem] h-[9rem] rounded-full border border-dashed border-line-strong bg-fill flex flex-col items-center justify-center gap-1 text-ink-subtle cursor-pointer transition-colors hover:border-primary hover:text-primary overflow-hidden bg-cover bg-center"
                      style={photo ? { backgroundImage: `url(${photo})` } : undefined}
                    >
                      {!photo && (<><CameraIcon /><span className="text-md">Thêm ảnh</span></>)}
                    </button>
                    <p className="text-sm text-ink-muted mt-2 text-center">Mỗi ảnh không vượt quá 2Mb</p>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                  </div>
                </div>
              </SectionCard>

              {/* Thông tin công việc */}
              <SectionCard title="Thông tin công việc" collapsible>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mt-4">
                  <Field label="Ngày bắt đầu làm việc">
                    <input type="date" className={inputCls} value={startDate} onChange={e => setStartDate(e.target.value)} />
                  </Field>
                  <Field label="Tài khoản đăng nhập">
                    <AccountPicker
                      value={userId}
                      accounts={accounts}
                      onChange={setUserId}
                      onAddAccount={() => setShowCreateAccount(true)}
                    />
                  </Field>
                  <Field label="Ghi chú" className="sm:col-span-2">
                    <input className={inputCls} placeholder="Nhập ghi chú" value={note} onChange={e => setNote(e.target.value)} />
                  </Field>
                </div>
              </SectionCard>

              {/* Thông tin cá nhân */}
              <SectionCard title="Thông tin cá nhân" collapsible>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mt-4">
                  <Field label="Số CMND/CCCD">
                    <input className={inputCls} inputMode="numeric" value={idNumber} onChange={e => setIdNumber(e.target.value)} />
                  </Field>
                  <div className="flex gap-6">
                    <Field label="Ngày sinh" className="flex-1">
                      <input type="date" className={inputCls} value={birthday} onChange={e => setBirthday(e.target.value)} />
                    </Field>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-md text-ink-subtle">Giới tính</label>
                      <div className="flex items-center gap-5 h-11">
                        {['Nam', 'Nữ'].map(g => (
                          <label key={g} className="flex items-center gap-2 cursor-pointer text-md text-ink">
                            <input type="radio" name="gender" className="accent-[var(--kv-primary)] w-4 h-4"
                              checked={gender === g} onChange={() => setGender(g)} />
                            {g}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Field label="Địa chỉ" className="sm:col-span-2">
                    <input className={inputCls} value={address} onChange={e => setAddress(e.target.value)} />
                  </Field>
                </div>
              </SectionCard>
            </>
          ) : (
            <>
              {/* Lương chính */}
              <SectionCard title="Lương chính">
                <div className="flex items-center gap-4 mt-3">
                  <label className="text-md text-ink-subtle w-[8rem] shrink-0">Loại lương</label>
                  <div className="w-full sm:w-[40rem]">
                    <Picker value={salaryType} options={salaryTypes} placeholder="Chọn Loại lương" onChange={setSalaryType} />
                  </div>
                  <InfoIcon />
                </div>
                {salaryType === 'Theo ca làm việc' && <ShiftSalaryBody value={salaryConfig} onChange={setSalaryConfig} />}
                {salaryType === 'Theo giờ làm việc' && <ShiftSalaryBody value={salaryConfig} onChange={setSalaryConfig} suffix="/ Giờ" firstCol="Mức lương" wageCol="Lương/giờ" showOvertime={false} />}
                {salaryType === 'Cố định' && <ShiftSalaryBody value={salaryConfig} onChange={setSalaryConfig} suffix="/ kỳ lương" showOvertime={false} noAdvanced />}
              </SectionCard>

              {/* Mẫu lương */}
              <SectionCard>
                <div className="flex items-center gap-4">
                  <label className="text-md font-bold text-ink w-[8rem] shrink-0 flex items-center gap-1.5">Mẫu lương <InfoIcon /></label>
                  <div className="w-full sm:w-[40rem]">
                    <Picker value={salaryTemplate} options={salaryTemplates.map(t => t.name)} placeholder="Chọn mẫu lương có sẵn" onChange={applyTemplate} />
                  </div>
                </div>
              </SectionCard>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 px-6 py-3 bg-card rounded-b-lg border-t border-line shrink-0">
          <span className="text-md text-danger">{error}</span>
          <div className="flex items-center gap-2">
            <button className="kv-btn kv-btn-outline-neutral h-10" onClick={onClose} disabled={saving}>Bỏ qua</button>
            {tab === 'salary' && (
              <button className="kv-btn kv-btn-outline-neutral h-10" onClick={() => void handleSave(true)} disabled={saving}>Lưu và tạo mẫu lương mới</button>
            )}
            <button className="kv-btn kv-btn-primary h-10" onClick={() => void handleSave()} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
          </div>
        </div>
      </div>
    </div>
    {showCreateAccount && (
      <CreateAccountModal onClose={() => setShowCreateAccount(false)} onCreate={handleCreateAccount} />
    )}
    {tempPasswordInfo && (
      <TempPasswordModal
        username={tempPasswordInfo.username}
        tempPassword={tempPasswordInfo.password}
        onClose={() => setTempPasswordInfo(null)}
      />
    )}
    </>
  )
}

export default EmployeeModal
