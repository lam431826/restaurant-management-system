import { useEffect, useMemo, useRef, useState } from 'react'

/* ─────────────────────────────────────────────────────────────────────────────
 * Bảng chấm công (Timesheet) — faithful re-creation of the KiotViet screen.
 * Three period modes (Theo tuần / Theo ngày / Theo tháng) with a "Xem theo ca"
 * grid of shift-rows × day-columns holding employee attendance cards.
 * ──────────────────────────────────────────────────────────────────────────── */

type AttStatus = 'on-time' | 'late-early' | 'missing' | 'unmarked' | 'off' | 'scheduled'

interface ShiftDef { id: string; name: string; start: string; end: string }
interface Assignment {
  employee: string
  shiftId: string
  date: string // YYYY-MM-DD
  status: AttStatus
  checkIn?: string
  checkOut?: string
}

const SHIFTS: ShiftDef[] = [
  { id: 'morning', name: 'Sáng', start: '07:00', end: '11:00' },
  { id: 'afternoon', name: 'Chiều', start: '13:00', end: '17:00' },
  { id: 'night', name: 'Đêm', start: '21:00', end: '01:00' },
]

/* ── employee directory (for "Xem theo nhân viên") ─────────────────────────── */
interface Employee { name: string; code: string; salaryType: string }
const EMPLOYEES: Employee[] = [
  { name: 'Nguyen Van A', code: 'NV000001', salaryType: 'Chưa thiết lập' },
  { name: 'Nguyen Van B', code: 'NV000002', salaryType: 'Theo ca làm việc' },
]
const EMP_COLS = ['Đi làm', 'Nghỉ làm', 'Đi muộn', 'Về sớm', 'Làm thêm']

const WEEKDAY_FULL = ['Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy', 'Chủ nhật']
const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'] // indexed by getDay()

const LEGEND: { status: AttStatus; label: string; color: string }[] = [
  { status: 'on-time', label: 'Đúng giờ', color: '#0070F4' },
  { status: 'late-early', label: 'Đi muộn / Về sớm', color: '#7C4DFF' },
  { status: 'missing', label: 'Chấm công thiếu', color: '#F0483E' },
  { status: 'unmarked', label: 'Chưa chấm công', color: '#F5A623' },
  { status: 'off', label: 'Nghỉ làm', color: '#9AA5B1' },
]

const STATUS_LABEL: Record<AttStatus, string> = {
  'on-time': 'Đúng giờ',
  'late-early': 'Đi muộn / Về sớm',
  'missing': 'Chấm công thiếu',
  'unmarked': 'Chưa chấm công',
  'off': 'Nghỉ làm',
  'scheduled': 'Chưa chấm công',
}

/* context passed into the "Chấm công" / "Đổi ca" modals */
interface AttnCtx { employee: string; code: string; date: Date; shiftId: string; status: AttStatus }

/* ── date helpers ──────────────────────────────────────────────────────────── */
const stripTime = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d: Date, n: number) => { const r = stripTime(d); r.setDate(r.getDate() + n); return r }
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const toYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const startOfWeek = (d: Date) => { const day = d.getDay(); return addDays(d, (day === 0 ? -6 : 1) - day) }
const weekOfMonth = (d: Date) => Math.ceil(d.getDate() / 7)
const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate()

/* ── mock attendance data (anchored to today) ─────────────────────────────── */
const buildMockData = (today: Date): Assignment[] => [
  { employee: 'Nguyen Van A', shiftId: 'morning', date: toYMD(addDays(today, 2)), status: 'scheduled' },
  { employee: 'Nguyen Van A', shiftId: 'morning', date: toYMD(addDays(today, 3)), status: 'scheduled' },
  { employee: 'Nguyen Van B', shiftId: 'night', date: toYMD(today), status: 'unmarked' },
  { employee: 'Nguyen Van B', shiftId: 'night', date: toYMD(addDays(today, 1)), status: 'scheduled' },
  { employee: 'Nguyen Van B', shiftId: 'night', date: toYMD(addDays(today, 2)), status: 'scheduled' },
]

/* ── tiny icons ────────────────────────────────────────────────────────────── */
const ChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-ink-muted shrink-0">
    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const ChevronL = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
const ChevronR = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
const CheckCircle = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
    <circle cx="12" cy="12" r="10" fill={color} />
    <path d="M7.5 12.4l3 3 6-6.4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const CalIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
)
const ClockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
)
const NoteIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
)
const InfoIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted shrink-0"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
)
const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
)
const SwapIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
)
const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
)
const CalendarSm = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
)

const fullDateLabel = (d: Date) => {
  const sh = WEEKDAY_SHORT[d.getDay()]
  const wd = sh === 'CN' ? 'Chủ nhật' : `Thứ ${sh.slice(1)}`
  return `${wd}, ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}
const dmy = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`

type PeriodMode = 'week' | 'day' | 'month'

/* ── status → card classes ─────────────────────────────────────────────────── */
const cardStyle = (status: AttStatus) => {
  switch (status) {
    case 'unmarked': return 'bg-warning-50 text-warning-700'
    case 'off': return 'bg-fill text-ink-subtle'
    default: return 'bg-fill text-ink'
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Chấm công modal — opens when a shift assignment card is clicked.
 * Tabs: "Chấm công" and "Lịch sử chấm công" (Phạt vi phạm / Thưởng removed).
 * ──────────────────────────────────────────────────────────────────────────── */
const ModalField = ({ label, info, align = 'center', children }: { label: string; info?: boolean; align?: 'center' | 'top'; children: React.ReactNode }) => (
  <div className={`flex ${align === 'top' ? 'items-start' : 'items-center'} gap-6 py-2`}>
    <label className={`w-[8rem] shrink-0 flex items-center gap-1 text-md text-ink ${align === 'top' ? 'pt-2' : ''}`}>{label}{info && <InfoIcon />}</label>
    <div className="flex-1 min-w-0 max-w-[38rem]">{children}</div>
  </div>
)

/* 00:00 → 23:45 in 15-minute steps */
const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => `${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`)

const TimePicker = ({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    if (open && listRef.current) {
      const sel = listRef.current.querySelector('[data-selected="true"]') as HTMLElement | null
      sel?.scrollIntoView({ block: 'center' })
    }
  }, [open])

  // While typing, narrow the list to times that start with what's entered.
  const filtered = value ? TIME_OPTIONS.filter(t => t.startsWith(value)) : TIME_OPTIONS
  const options = filtered.length ? filtered : TIME_OPTIONS

  return (
    <div ref={ref} className="relative w-[15rem]">
      <input
        type="text"
        value={value}
        disabled={disabled}
        placeholder="--:--"
        onChange={e => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        className="w-full h-10 pl-3 pr-9 bg-fill border border-line-default rounded-md text-md text-ink placeholder:text-ink-muted disabled:opacity-70 disabled:cursor-not-allowed focus:border-primary focus:bg-card outline-none"
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted"><ClockIcon /></span>
      {open && !disabled && (
        <div ref={listRef} className="absolute left-0 top-[calc(100%+0.3rem)] w-full max-h-[15rem] overflow-y-auto bg-card border border-line-default rounded-md shadow-md z-[var(--kv-z-dropdown)] py-1">
          {options.map(t => (
            <button key={t} type="button" data-selected={t === value} onClick={() => { onChange(t); setOpen(false) }}
              className={`block w-full text-left px-4 py-2 text-md cursor-pointer hover:bg-[var(--kv-state-hover-bg)] ${t === value ? 'text-primary font-semibold bg-primary-25' : 'text-ink'}`}>
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const TimeRow = ({ label, on, setOn, time, setTime }: { label: string; on: boolean; setOn: (v: boolean) => void; time: string; setTime: (v: string) => void }) => (
  <div className="flex items-center gap-6">
    <label className="w-[8rem] shrink-0 flex items-center gap-2 text-md text-ink cursor-pointer">
      <input type="checkbox" checked={on} onChange={e => setOn(e.target.checked)} className="accent-primary w-4 h-4" />
      {label}
    </label>
    <TimePicker value={time} onChange={setTime} disabled={!on} />
  </div>
)

/* ── Phạt vi phạm ──────────────────────────────────────────────────────────── */
interface ViolationType { id: string; name: string; amount: number }
interface ViolationRow { id: string; typeId: string; count: number }
const uid = () => Math.random().toString(36).slice(2, 9)
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
)

/* searchable "Chọn vi phạm" dropdown used per violation row */
const ViolationSelect = ({ value, types, onSelect, onAddType }: { value: string; types: ViolationType[]; onSelect: (id: string) => void; onAddType: () => void }) => {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const selected = types.find(t => t.id === value)
  const filtered = types.filter(t => t.name.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full h-10 pl-3 pr-9 flex items-center bg-card border border-line-default rounded-md text-md text-left cursor-pointer focus:border-primary outline-none">
        <span className={selected ? 'text-ink' : 'text-ink-muted'}>{selected?.name ?? 'Chọn vi phạm'}</span>
      </button>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"><ChevronDown /></span>
      {open && (
        <div className="absolute left-0 top-[calc(100%+0.3rem)] w-full bg-card border border-line-default rounded-md shadow-md z-[var(--kv-z-dropdown)] py-1">
          <div className="px-2 pt-1 pb-2 border-b border-line">
            <div className="relative">
              <input autoFocus value={q} onChange={e => setQ(e.target.value)}
                className="w-full h-9 pl-3 pr-8 bg-card border border-line-default rounded-md text-md text-ink outline-none focus:border-primary" />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"><SearchIcon /></span>
            </div>
          </div>
          <div className="max-h-[12rem] overflow-y-auto py-1">
            <button type="button" onClick={() => { onSelect(''); setOpen(false) }} className="block w-full text-left px-3 py-2 text-md text-ink bg-primary-25">Chọn vi phạm</button>
            {filtered.length === 0
              ? <div className="py-6 text-center text-sm text-ink-muted uppercase tracking-wide">No data found</div>
              : filtered.map(t => (
                <button key={t.id} type="button" onClick={() => { onSelect(t.id); setOpen(false) }}
                  className="block w-full text-left px-3 py-2 text-md text-ink hover:bg-[var(--kv-state-hover-bg)] cursor-pointer">{t.name}</button>
              ))}
          </div>
          <div className="border-t border-line">
            <button type="button" onClick={() => { setOpen(false); onAddType() }}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-md font-medium text-primary hover:bg-primary-25 cursor-pointer">
              <span className="text-lg leading-none">+</span> Thêm loại vi phạm
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* nested "Thêm mới vi phạm" modal */
const AddViolationTypeModal = ({ onClose, onSave }: { onClose: () => void; onSave: (name: string, amount: number) => void }) => {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/50 p-4" onMouseDown={onClose}>
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-[560px]" onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <h2 className="text-xl font-bold text-ink">Thêm mới vi phạm</h2>
          <button onClick={onClose} aria-label="Đóng" className="w-8 h-8 flex items-center justify-center rounded-full text-ink-muted hover:bg-fill hover:text-ink cursor-pointer"><CloseIcon /></button>
        </div>
        <div className="px-6 pb-2 flex flex-col gap-4">
          <div>
            <label className="block text-md text-ink mb-1.5">Tên vi phạm</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full h-10 px-3 bg-card border border-line-default rounded-md text-md text-ink focus:border-primary outline-none" />
          </div>
          <div>
            <label className="block text-md text-ink mb-1.5">Mức áp dụng</label>
            <input value={amount} inputMode="numeric" onChange={e => setAmount(e.target.value.replace(/[^\d]/g, ''))}
              className="w-full h-10 px-3 bg-card border border-line-default rounded-md text-md text-ink focus:border-primary outline-none" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4">
          <button onClick={onClose} className="kv-btn kv-btn-outline-neutral h-10 bg-card">Bỏ qua</button>
          <button disabled={!name.trim()} onClick={() => onSave(name.trim(), parseInt(amount || '0', 10))} className="kv-btn kv-btn-primary h-10 disabled:opacity-50">Lưu</button>
        </div>
      </div>
    </div>
  )
}

const AttendanceModal = ({ ctx, shifts, employees, onClose, onSwap }: { ctx: AttnCtx; shifts: ShiftDef[]; employees: Employee[]; onClose: () => void; onSwap: () => void }) => {
  const [tab, setTab] = useState<'attn' | 'history' | 'violation'>('attn')
  const [shiftId, setShiftId] = useState(ctx.shiftId)
  const [note, setNote] = useState('')
  const [mark, setMark] = useState<'work' | 'paid' | 'unpaid'>('work')
  const [inOn, setInOn] = useState(false)
  const [outOn, setOutOn] = useState(false)
  const [inTime, setInTime] = useState('')
  const [outTime, setOutTime] = useState('')
  const [substitute, setSubstitute] = useState('')
  const subOptions = employees.filter(e => e.name !== ctx.employee)

  // Phạt vi phạm state
  const [vioTypes, setVioTypes] = useState<ViolationType[]>([])
  const [vioRows, setVioRows] = useState<ViolationRow[]>([])
  const [addTypeForRow, setAddTypeForRow] = useState<string | null>(null)
  const addVioRow = () => setVioRows(rs => [...rs, { id: uid(), typeId: '', count: 1 }])
  const removeVioRow = (id: string) => setVioRows(rs => rs.filter(r => r.id !== id))
  const setVioRow = (id: string, patch: Partial<ViolationRow>) => setVioRows(rs => rs.map(r => r.id === id ? { ...r, ...patch } : r))
  const saveVioType = (name: string, amount: number) => {
    const t: ViolationType = { id: uid(), name, amount }
    setVioTypes(ts => [...ts, t])
    if (addTypeForRow) setVioRow(addTypeForRow, { typeId: t.id })
    setAddTypeForRow(null)
  }

  return (
    <>
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" onMouseDown={onClose}>
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-[760px] flex flex-col max-h-[92vh]" onMouseDown={e => e.stopPropagation()}>
        {/* header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-3">
          <div>
            <h2 className="text-xl font-bold text-ink">Chấm công</h2>
            <div className="flex items-center gap-2 mt-2 text-md">
              <span className="text-ink">{ctx.employee}</span>
              <span className="text-line-strong">|</span>
              <span className="text-ink-subtle">{ctx.code}</span>
              <span className="ml-1 px-2 py-0.5 rounded bg-fill text-ink-subtle text-sm">{STATUS_LABEL[ctx.status]}</span>
            </div>
          </div>
          <button onClick={onClose} aria-label="Đóng" className="w-8 h-8 flex items-center justify-center rounded-full text-ink-muted hover:bg-fill hover:text-ink cursor-pointer"><CloseIcon /></button>
        </div>

        {/* body */}
        <div className="px-6">
          <ModalField label="Thời gian"><span className="text-md text-ink">{fullDateLabel(ctx.date)}</span></ModalField>

          <ModalField label="Ca làm việc" info>
            <div className="relative">
              <select value={shiftId} onChange={e => setShiftId(e.target.value)}
                className="w-full h-10 pl-3 pr-9 bg-card border border-line-default rounded-md text-md text-ink appearance-none cursor-pointer focus:border-primary outline-none">
                {shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.start} - {s.end})</option>)}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"><ChevronDown /></span>
            </div>
          </ModalField>

          <ModalField label="Ghi chú" align="top">
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
              className="w-full p-3 bg-card border border-line-default rounded-md text-md text-ink resize-none focus:border-primary outline-none" />
          </ModalField>

          {/* tabs */}
          <div className="flex items-center gap-7 border-b border-line mt-4">
            {([['attn', 'Chấm công'], ['history', 'Lịch sử chấm công'], ['violation', 'Phạt vi phạm']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)} className={`relative pb-3 pt-2 text-md cursor-pointer ${tab === id ? 'text-primary font-semibold' : 'text-ink-subtle hover:text-ink'}`}>
                {label}
                {tab === id && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary rounded-full" />}
              </button>
            ))}
          </div>

          {tab === 'attn' && (
            <div className="py-5 flex flex-col gap-4">
              <div className="flex items-center gap-6">
                <label className="w-[8rem] shrink-0 text-md text-ink">Chấm công</label>
                <div className="flex items-center gap-6 flex-wrap">
                  {([['work', 'Đi làm', false], ['paid', 'Nghỉ có phép', true], ['unpaid', 'Nghỉ không phép', true]] as const).map(([id, label, info]) => (
                    <label key={id} className="flex items-center gap-2 cursor-pointer text-md text-ink">
                      <input type="radio" name="attn-mark" checked={mark === id} onChange={() => setMark(id)} className="accent-primary w-4 h-4" />
                      {label}{info && <InfoIcon />}
                    </label>
                  ))}
                </div>
              </div>
              {mark === 'work' && (
                <>
                  <TimeRow label="Vào" on={inOn} setOn={setInOn} time={inTime} setTime={setInTime} />
                  <TimeRow label="Ra" on={outOn} setOn={setOutOn} time={outTime} setTime={setOutTime} />
                </>
              )}
              {mark !== 'work' && (
                <div className="flex items-center gap-6">
                  <label className="w-[8rem] shrink-0 text-md text-ink">Nhân viên làm thay ca:</label>
                  <div className="relative w-[24rem] max-w-full">
                    <select value={substitute} onChange={e => setSubstitute(e.target.value)}
                      className={`w-full h-10 pl-3 pr-9 bg-card border border-line-default rounded-md text-md appearance-none cursor-pointer focus:border-primary outline-none ${substitute ? 'text-ink' : 'text-ink-muted'}`}>
                      <option value="" disabled hidden>Chọn nhân viên</option>
                      {subOptions.map(e => <option key={e.code} value={e.code}>{e.name}</option>)}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"><ChevronDown /></span>
                  </div>
                </div>
              )}
            </div>
          )}
          {tab === 'history' && (
            <div className="py-5">
              <div className="grid grid-cols-4 bg-fill rounded-md px-4 py-2.5 text-sm font-semibold text-ink-subtle">
                <span>Thời gian</span><span>Trạng thái</span><span>Hình thức</span><span>Nội dung</span>
              </div>
              <div className="py-10 text-center text-md text-ink-subtle">Không có kết quả phù hợp</div>
            </div>
          )}
          {tab === 'violation' && (
            <div className="py-5">
              <div className="grid grid-cols-[1fr_5rem_11rem_7rem_2.5rem] gap-3 items-center bg-fill rounded-md px-4 py-2.5 text-sm font-semibold text-ink-subtle">
                <span>Loại vi phạm</span>
                <span className="text-center">Số lần</span>
                <span className="text-center">Mức áp dụng</span>
                <span className="text-right">Thành tiền</span>
                <span />
              </div>
              {vioRows.map(row => {
                const type = vioTypes.find(t => t.id === row.typeId)
                const amount = type?.amount ?? 0
                return (
                  <div key={row.id} className="grid grid-cols-[1fr_5rem_11rem_7rem_2.5rem] gap-3 items-center px-4 py-3">
                    <ViolationSelect value={row.typeId} types={vioTypes}
                      onSelect={id => setVioRow(row.id, { typeId: id })} onAddType={() => setAddTypeForRow(row.id)} />
                    <input type="text" inputMode="numeric" value={row.count}
                      onChange={e => setVioRow(row.id, { count: Math.max(1, parseInt(e.target.value.replace(/[^\d]/g, '') || '1', 10)) })}
                      className="h-10 w-full text-center bg-fill border border-line-default rounded-md text-md text-ink focus:border-primary focus:bg-card outline-none" />
                    <input type="text" readOnly value={amount.toLocaleString('vi-VN')}
                      className="h-10 w-full text-right px-3 bg-fill border border-line-default rounded-md text-md text-ink-subtle outline-none" />
                    <span className="text-right text-md text-ink">{(amount * row.count).toLocaleString('vi-VN')}</span>
                    <button type="button" onClick={() => removeVioRow(row.id)} aria-label="Xóa"
                      className="w-8 h-8 flex items-center justify-center text-ink-muted hover:text-danger cursor-pointer"><TrashIcon /></button>
                  </div>
                )
              })}
              <button type="button" onClick={addVioRow} className="px-4 py-3 text-md font-medium text-primary hover:underline cursor-pointer">Thêm vi phạm</button>
            </div>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-line mt-auto">
          <div className="flex items-center gap-5">
            <button onClick={onClose} className="flex items-center gap-1.5 text-md text-ink-subtle hover:text-danger cursor-pointer"><TrashIcon /> Hủy</button>
            <button onClick={onSwap} className="flex items-center gap-1.5 text-md text-ink-subtle hover:text-primary cursor-pointer"><SwapIcon /> Đổi ca</button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="kv-btn kv-btn-outline-neutral h-10 bg-card">Bỏ qua</button>
            <button onClick={onClose} className="kv-btn kv-btn-primary h-10">Lưu</button>
          </div>
        </div>
      </div>
    </div>
    {addTypeForRow !== null && (
      <AddViolationTypeModal onClose={() => setAddTypeForRow(null)} onSave={saveVioType} />
    )}
    </>
  )
}

/* ── Đổi ca làm việc modal ─────────────────────────────────────────────────── */
const SwapSelect = ({ value, placeholder, options }: { value?: string; placeholder?: string; options: string[] }) => (
  <div className="relative">
    <select defaultValue={value ?? ''} className="w-full h-10 pl-3 pr-9 bg-card border border-line-default rounded-md text-md text-ink appearance-none cursor-pointer focus:border-primary outline-none">
      {placeholder && <option value="" disabled>{placeholder}</option>}
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"><ChevronDown /></span>
  </div>
)
const SwapDate = ({ value }: { value: string }) => (
  <div className="relative">
    <input type="text" defaultValue={value} className="w-full h-10 pl-3 pr-9 bg-card border border-line-default rounded-md text-md text-ink focus:border-primary outline-none" />
    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"><CalendarSm /></span>
  </div>
)
const SwapRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-4 py-2.5">
    <label className="w-[7rem] shrink-0 text-md text-ink">{label}</label>
    <div className="flex-1">{children}</div>
  </div>
)

const SwapModal = ({ ctx, shifts, employees, onClose }: { ctx: AttnCtx; shifts: ShiftDef[]; employees: Employee[]; onClose: () => void }) => {
  const dateStr = dmy(ctx.date)
  const shiftName = shifts.find(s => s.id === ctx.shiftId)?.name ?? ''
  const empNames = employees.map(e => e.name)
  const shiftNames = shifts.map(s => s.name)
  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50 p-4" onMouseDown={onClose}>
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-[900px] flex flex-col" onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <h2 className="text-xl font-bold text-ink">Đổi ca làm việc</h2>
          <button onClick={onClose} aria-label="Đóng" className="w-8 h-8 flex items-center justify-center rounded-full text-ink-muted hover:bg-fill hover:text-ink cursor-pointer"><CloseIcon /></button>
        </div>
        <div className="grid grid-cols-2 divide-x divide-line px-6 pb-6">
          <div className="pr-8">
            <h3 className="text-md font-bold text-ink mb-3">Nhân viên</h3>
            <SwapRow label="Ngày làm việc"><SwapDate value={dateStr} /></SwapRow>
            <SwapRow label="Nhân viên"><SwapSelect value={ctx.employee} options={empNames} /></SwapRow>
            <SwapRow label="Ca"><SwapSelect value={shiftName} options={shiftNames} /></SwapRow>
          </div>
          <div className="pl-8">
            <h3 className="text-md font-bold text-ink mb-3">Đổi cho nhân viên</h3>
            <SwapRow label="Ngày làm việc"><SwapDate value={dateStr} /></SwapRow>
            <SwapRow label="Nhân viên"><SwapSelect placeholder="Chọn nhân viên" options={empNames} /></SwapRow>
            <SwapRow label="Ca"><SwapSelect placeholder="Chọn ca làm việc" options={shiftNames} /></SwapRow>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-line">
          <button onClick={onClose} className="kv-btn kv-btn-outline-neutral h-10 bg-card">Bỏ qua</button>
          <button onClick={onClose} className="kv-btn kv-btn-primary h-10">Lưu</button>
        </div>
      </div>
    </div>
  )
}

/* ── "Đặt lịch" cell popup ─────────────────────────────────────────────────── */
const ScheduleCellModal = ({ shift, date, employees, onClose }: { shift: ShiftDef; date: Date; employees: Employee[]; onClose: () => void }) => {
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', onKey) }
  }, [onClose])
  const filtered = employees.filter(e => { const s = q.trim().toLowerCase(); return !s || e.name.toLowerCase().includes(s) || e.code.toLowerCase().includes(s) })
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-[54rem] bg-card rounded-xl shadow-2xl flex flex-col" onMouseDown={e => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-2">
          <div className="flex items-start justify-between">
            <h2 className="text-xl font-bold text-ink">{shift.name}</h2>
            <button onClick={onClose} aria-label="Đóng" className="w-8 h-8 flex items-center justify-center rounded-full text-ink-muted hover:bg-fill hover:text-ink cursor-pointer"><CloseIcon /></button>
          </div>
          <div className="text-sm text-ink-subtle mt-1">{fullDateLabel(date)}</div>
        </div>

        <div className="px-6 py-4">
          <p className="text-md text-ink mb-4">Chọn nhân viên bạn muốn đặt lịch ở ca này?</p>
          <div className="flex items-center gap-4">
            <label className="text-md font-bold text-ink w-[7rem] shrink-0">Tên nhân viên</label>
            <div ref={ref} className="relative flex-1">
              <input value={selected || q} onChange={e => { setQ(e.target.value); setSelected(''); setOpen(true) }} onFocus={() => setOpen(true)}
                placeholder="Tìm kiếm nhân viên" className="w-full h-10 px-3 bg-card border border-line-default rounded-md text-md text-ink placeholder:text-ink-muted focus:border-primary outline-none" />
              {open && (
                <div className="absolute left-0 right-0 top-[calc(100%+0.3rem)] bg-card border border-line-default rounded-md shadow-md z-[var(--kv-z-dropdown)] max-h-[14rem] overflow-y-auto py-1">
                  {filtered.length === 0
                    ? <div className="px-3 py-2 text-md text-ink-muted">Không có nhân viên</div>
                    : filtered.map(e => (
                      <button key={e.code} type="button" onClick={() => { setSelected(e.name); setQ(''); setOpen(false) }} className="block w-full text-left px-3 py-2 hover:bg-[var(--kv-state-hover-bg)] cursor-pointer">
                        <div className="text-md text-ink">{e.name}</div>
                        <div className="text-sm text-ink-subtle">{e.code}</div>
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4">
          <button onClick={onClose} className="kv-btn kv-btn-outline-neutral h-10 bg-card">Bỏ qua</button>
          <button onClick={onClose} className="kv-btn kv-btn-primary h-10">Đồng ý</button>
        </div>
      </div>
    </div>
  )
}

const Timesheet = () => {
  const today = useMemo(() => stripTime(new Date()), [])
  const [assignments] = useState<Assignment[]>(() => buildMockData(today))
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState<PeriodMode>('week')
  const [cursor, setCursor] = useState<Date>(today) // reference date for the active period
  const [viewMode, setViewMode] = useState<'shift' | 'employee'>('shift')

  const [searchOpen, setSearchOpen] = useState(false)
  const [periodOpen, setPeriodOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const periodRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLDivElement>(null)

  // BR: which shifts are shown / editable — the "+" opens a multi-select picker.
  const [activeShiftIds, setActiveShiftIds] = useState<string[]>(SHIFTS.map(s => s.id))
  const [shiftPickerOpen, setShiftPickerOpen] = useState(false)
  const shiftPickerRef = useRef<HTMLDivElement>(null)

  // attendance ("Chấm công") + "Đổi ca" modals
  const [attn, setAttn] = useState<AttnCtx | null>(null)
  const [swapOpen, setSwapOpen] = useState(false)
  // "Đặt lịch" cell popup — pick an employee to schedule into a shift on a day
  const [scheduleCell, setScheduleCell] = useState<{ shift: ShiftDef; date: Date } | null>(null)
  const openSchedule = (shift: ShiftDef, date: Date) => setScheduleCell({ shift, date })

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const t = e.target as Node
      if (searchRef.current && !searchRef.current.contains(t)) setSearchOpen(false)
      if (periodRef.current && !periodRef.current.contains(t)) setPeriodOpen(false)
      if (viewRef.current && !viewRef.current.contains(t)) setViewOpen(false)
      if (moreRef.current && !moreRef.current.contains(t)) setMoreOpen(false)
      if (shiftPickerRef.current && !shiftPickerRef.current.contains(t)) setShiftPickerOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const activeShifts = useMemo(() => SHIFTS.filter(s => activeShiftIds.includes(s.id)), [activeShiftIds])
  const toggleShift = (id: string) =>
    setActiveShiftIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : SHIFTS.filter(s => ids.includes(s.id) || s.id === id).map(s => s.id))

  const openAttn = (a: Assignment) => {
    const emp = EMPLOYEES.find(e => e.name === a.employee)
    setAttn({ employee: a.employee, code: emp?.code ?? '', date: new Date(`${a.date}T00:00:00`), shiftId: a.shiftId, status: a.status })
  }

  /* "+" in the shift column header — multi-select which shifts to show/edit */
  const AddShiftButton = () => (
    <div ref={shiftPickerRef} className="relative">
      <button onClick={() => setShiftPickerOpen(o => !o)} aria-label="Thêm ca làm việc"
        className="w-6 h-6 flex items-center justify-center rounded-md text-primary hover:bg-primary-25 cursor-pointer text-xl leading-none">+</button>
      {shiftPickerOpen && (
        <div className="absolute left-0 top-[calc(100%+0.4rem)] bg-card border border-line-default rounded-md shadow-md min-w-[17rem] py-1 z-[var(--kv-z-dropdown)]">
          <div className="px-3 py-2 text-sm font-semibold text-ink-subtle">Chọn ca làm việc</div>
          {SHIFTS.map(s => {
            const checked = activeShiftIds.includes(s.id)
            return (
              <button key={s.id} onClick={() => toggleShift(s.id)}
                className="flex items-center gap-3 w-full text-left px-3 py-2 text-md text-ink hover:bg-[var(--kv-state-hover-bg)] cursor-pointer">
                <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${checked ? 'bg-primary border-primary' : 'border-line-strong'}`}>
                  {checked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                </span>
                {s.name} <span className="text-ink-subtle text-sm">({s.start} - {s.end})</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )

  const weekStart = useMemo(() => startOfWeek(cursor), [cursor])
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const monthDays = useMemo(() => {
    const n = daysInMonth(cursor.getFullYear(), cursor.getMonth())
    return Array.from({ length: n }, (_, i) => new Date(cursor.getFullYear(), cursor.getMonth(), i + 1))
  }, [cursor])

  const employees = useMemo(() => {
    const set = Array.from(new Set(assignments.map(a => a.employee)))
    const q = search.trim().toLowerCase()
    return q ? set.filter(e => e.toLowerCase().includes(q)) : set
  }, [assignments, search])

  const employeeList = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? EMPLOYEES.filter(e => e.name.toLowerCase().includes(q) || e.code.toLowerCase().includes(q)) : EMPLOYEES
  }, [search])

  const cellFor = (shiftId: string, date: Date) =>
    assignments.filter(a => a.shiftId === shiftId && a.date === toYMD(date)
      && (!search.trim() || a.employee.toLowerCase().includes(search.trim().toLowerCase())))

  const shift = (id: string) => SHIFTS.find(s => s.id === id)!

  /* ── period navigation ──────────────────────────────────────────────────── */
  const step = (dir: -1 | 1) => {
    if (period === 'week') setCursor(c => addDays(startOfWeek(c), dir * 7))
    else if (period === 'day') setCursor(c => addDays(c, dir))
    else setCursor(c => new Date(c.getFullYear(), c.getMonth() + dir, 1))
  }

  const periodLabel = () => {
    if (period === 'week') {
      const end = addDays(weekStart, 6)
      return `Tuần ${weekOfMonth(weekStart)} - Th. ${end.getMonth() + 1} ${end.getFullYear()}`
    }
    if (period === 'day') {
      const sh = WEEKDAY_SHORT[cursor.getDay()]
      const wd = sh === 'CN' ? 'CN' : `Thứ ${sh.slice(1)}`
      return `${wd}, Ngày ${cursor.getDate()}/${String(cursor.getMonth() + 1).padStart(2, '0')}`
    }
    return `Tháng ${cursor.getMonth() + 1}, ${cursor.getFullYear()}`
  }

  const PERIOD_LABELS: Record<PeriodMode, string> = { week: 'Theo tuần', day: 'Theo ngày', month: 'Theo tháng' }

  /* ── shift label cell (left column) ─────────────────────────────────────── */
  const ShiftLabel = ({ s }: { s: ShiftDef }) => (
    <>
      <div className="text-md font-bold text-ink">{s.name}</div>
      <div className="text-sm text-ink-subtle mt-0.5">{s.start} - {s.end}</div>
    </>
  )

  /* ── employee card (week / month cell) ──────────────────────────────────── */
  const WeekCard = ({ a }: { a: Assignment }) => (
    <button type="button" onClick={e => { e.stopPropagation(); openAttn(a) }}
      className={`block w-full rounded-md px-3 py-2 text-left cursor-pointer transition-shadow hover:ring-1 hover:ring-primary/50 ${cardStyle(a.status)}`}>
      <div className="text-md font-medium leading-tight">{a.employee}</div>
      {a.status === 'unmarked' && (
        <>
          <div className="text-sm mt-1">{a.checkIn ?? '--'} {a.checkOut ?? '--'}</div>
          <div className="text-sm">Chưa chấm công</div>
        </>
      )}
    </button>
  )

  /* ── employee card (day view — richer) ──────────────────────────────────── */
  const DayCard = ({ a }: { a: Assignment }) => (
    <button type="button" onClick={e => { e.stopPropagation(); openAttn(a) }}
      className={`block rounded-md px-4 py-3 w-[22rem] max-w-full text-left cursor-pointer transition-shadow hover:ring-1 hover:ring-primary/50 ${cardStyle(a.status)}`}>
      <div className="text-md font-semibold text-ink mb-2">{a.employee}</div>
      <div className="flex items-center gap-2 text-sm mb-1"><CalIcon /> {a.checkIn ?? '--'} {a.checkOut ?? '--'}</div>
      <div className="flex items-center gap-2 text-sm mb-1"><ClockIcon /> --</div>
      <div className="flex items-center gap-2 text-sm"><NoteIcon /> {a.status === 'unmarked' ? 'Chưa chấm công' : 'Đã lên lịch'}</div>
    </button>
  )

  const emptyShiftHint = (
    <span className="text-md text-ink-subtle">Chọn để xếp nhân viên làm việc cho ca.</span>
  )

  return (
    <div className="flex flex-col h-full min-h-0 gap-4 pt-4">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-h3 font-extrabold text-ink mr-2">Bảng chấm công</h1>

        {/* search */}
        <div ref={searchRef} className="relative w-[18rem]">
          <button
            onClick={() => setSearchOpen(o => !o)}
            className={`flex items-center gap-2 w-full h-10 px-3 bg-card border rounded-md cursor-pointer transition-colors ${searchOpen ? 'border-primary' : 'border-line-default hover:border-line-strong'}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted shrink-0"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <span className={`flex-1 text-left text-md truncate ${search ? 'text-ink' : 'text-ink-muted'}`}>{search || 'Tìm kiếm nhân viên'}</span>
            <ChevronDown />
          </button>
          {searchOpen && (
            <div className="absolute top-[calc(100%+0.4rem)] left-0 right-0 bg-card border border-line-default rounded-md shadow-md z-[var(--kv-z-dropdown)] py-2">
              <input autoFocus className="w-full px-3 pb-2 text-md text-ink bg-transparent border-b border-line focus:outline-none" placeholder="Nhập tên nhân viên" value={search} onChange={e => setSearch(e.target.value)} />
              <div className="max-h-[16rem] overflow-y-auto mt-1">
                {employees.length === 0 && <div className="px-3 py-2 text-md text-ink-subtle">Không có nhân viên phù hợp</div>}
                {employees.map(e => <div key={e} className="px-3 py-2 text-md text-ink truncate">{e}</div>)}
              </div>
            </div>
          )}
        </div>

        {/* period-type dropdown */}
        <div ref={periodRef} className="relative">
          <button onClick={() => setPeriodOpen(o => !o)} className="flex items-center gap-2 h-10 px-4 bg-card border border-line-default rounded-md text-md font-medium text-ink cursor-pointer hover:border-line-strong whitespace-nowrap">
            {PERIOD_LABELS[period]}
            <ChevronDown />
          </button>
          {periodOpen && (
            <div className="absolute left-0 top-[calc(100%+0.4rem)] bg-card border border-line-default rounded-md shadow-md min-w-[12rem] py-1 z-[var(--kv-z-dropdown)]">
              {(['week', 'day', 'month'] as PeriodMode[]).map(p => (
                <button key={p} className="flex items-center justify-between w-full text-left px-4 py-2 text-md text-ink cursor-pointer hover:bg-[var(--kv-state-hover-bg)]" onClick={() => { setPeriod(p); setPeriodOpen(false) }}>
                  {PERIOD_LABELS[p]}
                  {period === p && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><polyline points="20 6 9 17 4 12" /></svg>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* period navigation */}
        <div className="flex items-center gap-1">
          <button className="w-9 h-9 flex items-center justify-center border border-line-default rounded-md bg-card text-ink-subtle cursor-pointer hover:border-primary hover:text-primary" onClick={() => step(-1)} aria-label="Trước"><ChevronL /></button>
          <div className="h-10 px-4 flex items-center bg-card border border-line-default rounded-md text-md text-ink whitespace-nowrap">{periodLabel()}</div>
          <button className="w-9 h-9 flex items-center justify-center border border-line-default rounded-md bg-card text-ink-subtle cursor-pointer hover:border-primary hover:text-primary" onClick={() => step(1)} aria-label="Sau"><ChevronR /></button>
        </div>

        <button className="kv-btn kv-btn-outline-neutral h-10 bg-card" onClick={() => setCursor(today)}>Chọn</button>

        <div className="flex-1" />

        {/* view mode */}
        <div ref={viewRef} className="relative">
          <button onClick={() => setViewOpen(o => !o)} className="flex items-center gap-2 h-10 px-3 bg-card border border-line-default rounded-md text-md text-ink cursor-pointer hover:border-line-strong">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /></svg>
            {viewMode === 'shift' ? 'Xem theo ca' : 'Xem theo nhân viên'}
            <ChevronDown />
          </button>
          {viewOpen && (
            <div className="absolute right-0 top-[calc(100%+0.4rem)] bg-card border border-line-default rounded-md shadow-md min-w-[16rem] py-1 z-[var(--kv-z-dropdown)]">
              {([['shift', 'Xem theo ca'], ['employee', 'Xem theo nhân viên']] as const).map(([id, label]) => (
                <button key={id} className="flex items-center justify-between w-full text-left px-4 py-2 text-md text-ink cursor-pointer hover:bg-[var(--kv-state-hover-bg)]" onClick={() => { setViewMode(id); setViewOpen(false) }}>
                  {label}
                  {viewMode === id && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><polyline points="20 6 9 17 4 12" /></svg>}
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="kv-btn kv-btn-outline-neutral h-10 bg-card">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><polyline points="9 15 11 17 15 13" /></svg>
          Duyệt chấm công
        </button>

        <div ref={moreRef} className="relative">
          <button onClick={() => setMoreOpen(o => !o)} className="w-10 h-10 flex items-center justify-center border border-line-default rounded-md bg-card text-ink cursor-pointer hover:border-line-strong" aria-label="Thêm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>
          </button>
          {moreOpen && (
            <div className="absolute right-0 top-[calc(100%+0.4rem)] bg-card border border-line-default rounded-md shadow-md min-w-[14rem] py-1 z-[var(--kv-z-dropdown)]">
              {['Import', 'Xuất file', 'Thiết lập chấm công'].map(l => (
                <button key={l} className="w-full text-left px-4 py-2 text-md text-ink cursor-pointer hover:bg-[var(--kv-state-hover-bg)]" onClick={() => setMoreOpen(false)}>{l}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Grid ────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 relative flex flex-col bg-card border border-line rounded-lg overflow-auto">
        {viewMode === 'employee' && (
          <table className="w-full border-collapse min-w-[64rem]">
            <thead>
              <tr className="bg-primary-25">
                <th className="sticky top-0 z-2 bg-primary-25 text-left px-4 py-3 w-[18rem] border-b border-line text-sm font-semibold text-ink-subtle">Nhân viên</th>
                <th className="sticky top-0 z-2 bg-primary-25 text-left px-4 py-3 w-[14rem] border-b border-line text-sm font-semibold text-ink-subtle">Loại lương</th>
                {EMP_COLS.map(c => (
                  <th key={c} className="sticky top-0 z-2 bg-primary-25 text-left px-4 py-3 border-b border-line text-sm font-semibold text-ink-subtle whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employeeList.length === 0 ? (
                <tr>
                  <td colSpan={2 + EMP_COLS.length} className="px-4 py-10 text-center text-md text-ink-subtle border-b border-line">Không có nhân viên phù hợp</td>
                </tr>
              ) : employeeList.map(emp => (
                <tr key={emp.code} className="border-b border-line hover:bg-[var(--kv-state-hover-bg)]">
                  <td className="px-4 py-4 align-top">
                    <div className="text-md font-semibold text-ink leading-tight">{emp.name}</div>
                    <div className="text-sm text-ink-subtle mt-0.5">{emp.code}</div>
                  </td>
                  <td className="px-4 py-4 align-top text-md text-ink-subtle">{emp.salaryType}</td>
                  <td colSpan={EMP_COLS.length} className="px-4 py-4 align-top text-md text-ink-subtle">
                    Nhân viên chưa có dữ liệu chấm công
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {viewMode === 'shift' && period === 'week' && (
          <table className="w-full border-collapse table-fixed min-w-[80rem]">
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-3 bg-card text-left px-4 py-4 w-[14rem] border-b border-r border-line">
                  <div className="flex items-center justify-between">
                    <span className="text-md font-bold text-ink">Ca làm việc</span>
                    <AddShiftButton />
                  </div>
                </th>
                {weekDays.map(d => (
                  <th key={toYMD(d)} className="sticky top-0 z-2 bg-card text-left px-4 py-4 border-b border-line">
                    <span className={`text-md font-semibold ${sameDay(d, today) ? 'text-primary' : 'text-ink'}`}>{WEEKDAY_FULL[(d.getDay() + 6) % 7]}</span>{' '}
                    <span className={sameDay(d, today) ? 'inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-white text-sm font-semibold ml-1' : 'text-ink-subtle ml-1'}>{String(d.getDate()).padStart(2, '0')}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeShifts.map(s => {
                const hasAny = weekDays.some(d => cellFor(s.id, d).length > 0)
                return (
                  <tr key={s.id} className="border-b border-line align-top">
                    <td className="px-4 py-4 border-r border-line align-top"><ShiftLabel s={s} /></td>
                    {weekDays.map((d, i) => {
                      const cell = cellFor(s.id, d)
                      return (
                        <td key={toYMD(d)} onClick={() => openSchedule(s, d)} className={`relative px-2 py-2 align-top hover:bg-success-50/40 transition-colors cursor-pointer ${hasAny ? 'border-l border-line' : ''}`}>
                          <div className="flex flex-col gap-1.5">{cell.map((a, j) => <WeekCard key={j} a={a} />)}</div>
                          {!hasAny && i === 3 && (
                            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-md text-ink-subtle pointer-events-none">Chọn để xếp nhân viên làm việc cho ca.</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {viewMode === 'shift' && period === 'day' && (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left px-4 py-4 w-[14rem] border-b border-r border-line">
                  <div className="flex items-center justify-between">
                    <span className="text-md font-bold text-ink">Ca làm việc</span>
                    <AddShiftButton />
                  </div>
                </th>
                <th className="text-left px-4 py-4 border-b border-line">
                  <span className={`text-md font-semibold ${sameDay(cursor, today) ? 'text-primary' : 'text-ink'}`}>{WEEKDAY_FULL[(cursor.getDay() + 6) % 7]}</span>{' '}
                  <span className={sameDay(cursor, today) ? 'inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-white text-sm font-semibold ml-1' : 'text-ink-subtle ml-1'}>{String(cursor.getDate()).padStart(2, '0')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {activeShifts.map(s => {
                const cell = cellFor(s.id, cursor)
                return (
                  <tr key={s.id} className="border-b border-line align-top">
                    <td className="px-4 py-4 border-r border-line align-top"><ShiftLabel s={s} /></td>
                    <td onClick={() => openSchedule(s, cursor)} className="px-4 py-3 align-top cursor-pointer hover:bg-success-50/40 transition-colors">
                      {cell.length > 0
                        ? <div className="flex flex-col gap-2">{cell.map((a, i) => <DayCard key={i} a={a} />)}</div>
                        : <div className="py-3 text-center">{emptyShiftHint}</div>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {viewMode === 'shift' && period === 'month' && (
          <table className="w-full border-collapse min-w-[110rem]">
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-3 bg-card text-left px-3 py-3 w-[11rem] border-b border-r border-line">
                  <div className="flex items-center justify-between"><span className="text-md font-bold text-ink">Ca làm việc</span><AddShiftButton /></div>
                </th>
                <th className="sticky top-0 z-2 bg-card text-left px-3 py-3 w-[10rem] border-b border-r border-line">
                  <div className="flex items-center justify-between"><span className="text-md font-bold text-ink">Nhân viên</span><span className="text-primary text-xl leading-none cursor-pointer">+</span></div>
                </th>
                {monthDays.map(d => (
                  <th key={toYMD(d)} className="sticky top-0 z-2 bg-card text-center px-1 py-2 border-b border-l border-line w-[3.2rem]">
                    <div className={`text-sm font-medium ${sameDay(d, today) ? 'text-primary' : 'text-ink-subtle'}`}>{WEEKDAY_SHORT[d.getDay()]}</div>
                    <div className={sameDay(d, today) ? 'mx-auto mt-0.5 w-6 h-6 flex items-center justify-center rounded-full bg-primary text-white text-sm font-semibold' : 'text-sm text-ink mt-0.5'}>{String(d.getDate()).padStart(2, '0')}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeShifts.map(s => {
                const shiftEmployees = employees.filter(e => assignments.some(a => a.employee === e && a.shiftId === s.id))
                if (shiftEmployees.length === 0) {
                  return (
                    <tr key={s.id} className="border-b border-line align-top">
                      <td className="px-3 py-4 border-r border-line align-top"><ShiftLabel s={s} /></td>
                      <td colSpan={monthDays.length + 1} className="px-4 py-6 text-center border-l border-line">{emptyShiftHint}</td>
                    </tr>
                  )
                }
                return shiftEmployees.map((emp, idx) => (
                  <tr key={s.id + emp} className="border-b border-line align-top">
                    {idx === 0 && (
                      <td rowSpan={shiftEmployees.length} className="px-3 py-4 border-r border-line align-top"><ShiftLabel s={s} /></td>
                    )}
                    <td className="px-3 py-4 border-r border-line align-top"><span className="text-md text-ink">{emp}</span></td>
                    {monthDays.map(d => {
                      const a = assignments.find(x => x.employee === emp && x.shiftId === s.id && x.date === toYMD(d))
                      return (
                        <td key={toYMD(d)} className="px-0 py-3 border-l border-line text-center align-middle">
                          {a && (a.status === 'unmarked'
                            ? <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#F5A623' }} />
                            : <span className="inline-block w-6 h-6 rounded bg-fill" />)}
                        </td>
                      )
                    })}
                  </tr>
                ))
              })}
            </tbody>
          </table>
        )}

      </div>

      {/* ── Status legend (bottom-center, below the grid) ───────────────── */}
      {viewMode === 'shift' && (
      <div className="shrink-0 mx-auto flex items-center gap-6 bg-card border border-line rounded-full shadow-md px-6 py-3 w-fit">
        {LEGEND.map(l => (
          <span key={l.status} className="flex items-center gap-2 text-md text-ink whitespace-nowrap">
            <CheckCircle color={l.color} /> {l.label}
          </span>
        ))}
      </div>
      )}

      {/* ── Floating action buttons (bottom-right) ─────────────────────────── */}
      <div className="fixed right-6 bottom-6 flex flex-col gap-3 z-[var(--kv-z-dropdown)]">
        <button className="flex items-center gap-2 h-11 px-4 rounded-full bg-primary text-white text-md font-medium shadow-md hover:bg-primary-600 cursor-pointer">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
          Khởi tạo
        </button>
        <button className="flex items-center gap-2 h-11 px-4 rounded-full bg-primary text-white text-md font-medium shadow-md hover:bg-primary-600 cursor-pointer self-end">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
          Hỗ trợ
        </button>
      </div>

      {/* ── Chấm công modal ─────────────────────────────────────────────────── */}
      {attn && !swapOpen && (
        <AttendanceModal ctx={attn} shifts={SHIFTS} employees={EMPLOYEES} onClose={() => setAttn(null)} onSwap={() => setSwapOpen(true)} />
      )}
      {/* ── Đổi ca làm việc modal ───────────────────────────────────────────── */}
      {attn && swapOpen && (
        <SwapModal ctx={attn} shifts={SHIFTS} employees={EMPLOYEES} onClose={() => setSwapOpen(false)} />
      )}
      {/* ── Đặt lịch cell popup ─────────────────────────────────────────────── */}
      {scheduleCell && (
        <ScheduleCellModal shift={scheduleCell.shift} date={scheduleCell.date} employees={EMPLOYEES} onClose={() => setScheduleCell(null)} />
      )}
    </div>
  )
}

export default Timesheet
