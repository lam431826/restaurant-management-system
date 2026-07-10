import { useEffect, useRef, useState } from 'react'

/* ─────────────────────────────────────────────────────────────────────────────
 * Thiết lập nhân viên — faithful re-creation of the KiotViet employee-settings
 * screen. Only the "Chấm công" and "Tính lương" tabs are kept.
 * ──────────────────────────────────────────────────────────────────────────── */

type Tab = 'attendance' | 'payroll'

interface ShiftRow { id: string; name: string; time: string; hours: string; active: boolean }
const INITIAL_SHIFTS: ShiftRow[] = [
  { id: 'morning', name: 'Sáng', time: '07:00 - 11:00', hours: '4 giờ', active: true },
  { id: 'afternoon', name: 'Chiều', time: '13:00 - 17:00', hours: '4 giờ', active: true },
  { id: 'night', name: 'Đêm', time: '21:00 - 01:00', hours: '4 giờ', active: true },
]

/* ── icons ─────────────────────────────────────────────────────────────────── */
const InfoIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted shrink-0"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
)
const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted"><polyline points="9 18 15 12 9 6" /></svg>
)
const ChevronLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
)
const CalCheckIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><polyline points="9 15 11 17 15 13" /></svg>
)
const DollarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="6" x2="12" y2="18" /><path d="M15 9.5a2.5 2 0 0 0-2.5-1.5h-1a2 2 0 0 0 0 4h1a2 2 0 0 1 0 4h-1A2.5 2 0 0 1 9 14.5" /></svg>
)
const PencilIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
)
const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
)
const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted shrink-0"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
)
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
)

/* ── shift-time helpers (for the Thêm/Sửa ca modal) ────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 9)
const TIME_OPTIONS: string[] = (() => {
  const out: string[] = []
  for (let mm = 0; mm < 24 * 60; mm += 15) out.push(`${String(Math.floor(mm / 60)).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}`)
  return out
})()
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
const addH = (t: string, h: number) => { const x = ((toMin(t) + h * 60) % (24 * 60) + 24 * 60) % (24 * 60); return `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}` }
const durationText = (start: string, end: string) => {
  let d = toMin(end) - toMin(start)
  if (d <= 0) d += 24 * 60
  const h = Math.floor(d / 60), m = d % 60
  return m === 0 ? `${h} giờ` : `${h} giờ ${m} phút`
}

/* 15-minute time picker */
const ShiftTimePicker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
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
      const el = listRef.current.querySelector('[data-selected="true"]') as HTMLElement | null
      if (el) listRef.current.scrollTop = el.offsetTop - listRef.current.clientHeight / 2 + el.clientHeight / 2
    }
  }, [open])
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`flex items-center justify-between gap-2 w-[8rem] h-10 px-3 bg-card border rounded-md cursor-pointer transition-colors ${open ? 'border-primary' : 'border-line-default hover:border-line-strong'}`}>
        <span className="text-md text-ink">{value}</span><ClockIcon />
      </button>
      {open && (
        <div ref={listRef} className="absolute top-[calc(100%+0.4rem)] left-0 w-[8rem] max-h-[15rem] overflow-y-auto bg-card border border-line-default rounded-md shadow-md z-[var(--kv-z-dropdown)] py-1">
          {TIME_OPTIONS.map(t => (
            <button key={t} type="button" data-selected={t === value} onClick={() => { onChange(t); setOpen(false) }}
              className={`block w-full text-left px-4 py-2 text-md cursor-pointer ${t === value ? 'text-primary font-medium bg-primary-25' : 'text-ink hover:bg-[var(--kv-state-hover-bg)]'}`}>{t}</button>
          ))}
        </div>
      )}
    </div>
  )
}

/* Thêm / Sửa ca làm việc modal (same shape as the one in Lịch làm việc) */
const ShiftModal = ({ shift, onClose, onSave }: { shift: ShiftRow | null; onClose: () => void; onSave: (name: string, start: string, end: string) => void }) => {
  const [ps, pe] = (shift?.time ?? '07:00 - 11:00').split(' - ')
  const [name, setName] = useState(shift?.name ?? '')
  const [start, setStart] = useState(ps)
  const [end, setEnd] = useState(pe)
  const [error, setError] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    nameRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  const handleStart = (t: string) => { setStart(t); setEnd(addH(t, 4)) }
  const save = () => {
    if (!name.trim()) { setError('Vui lòng nhập tên ca làm việc'); nameRef.current?.focus(); return }
    onSave(name.trim(), start, end)
  }
  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center p-4 sm:p-6 overflow-y-auto bg-black/45" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-[46rem] my-[8vh] bg-card rounded-xl shadow-lg flex flex-col">
        <div className="flex items-center justify-between px-7 h-16 shrink-0">
          <h2 className="text-h3 font-bold text-ink">{shift ? 'Sửa ca làm việc' : 'Thêm ca làm việc'}</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-md text-ink-subtle cursor-pointer hover:bg-fill hover:text-ink" aria-label="Đóng"><CloseIcon /></button>
        </div>
        <div className="px-7 py-4 flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <label className="w-[10rem] shrink-0 text-md text-ink">Tên</label>
            <input ref={nameRef} value={name} onChange={e => { setName(e.target.value); if (error) setError('') }}
              className="flex-1 min-w-0 h-10 px-3 bg-card border border-line-default rounded-md text-md text-ink outline-none focus:border-primary" />
          </div>
          <div className="flex items-center gap-4">
            <label className="w-[10rem] shrink-0 text-md text-ink flex items-center gap-1.5">Giờ làm việc <InfoIcon /></label>
            <div className="flex items-center flex-wrap gap-x-3 gap-y-2">
              <ShiftTimePicker value={start} onChange={handleStart} />
              <span className="text-md text-ink-subtle">Đến</span>
              <ShiftTimePicker value={end} onChange={setEnd} />
              <span className="text-md text-ink-subtle whitespace-nowrap">{durationText(start, end)}</span>
            </div>
          </div>
          {error && <span className="text-md text-danger">{error}</span>}
        </div>
        <div className="flex items-center justify-end gap-3 px-7 py-4 border-t border-line shrink-0">
          <button className="kv-btn kv-btn-outline-neutral h-10 bg-card" onClick={onClose}>Bỏ qua</button>
          <button className="kv-btn kv-btn-primary h-10" onClick={save}>Lưu</button>
        </div>
      </div>
    </div>
  )
}

/* ── primitives ────────────────────────────────────────────────────────────── */
const Toggle = ({ on, onChange, disabled }: { on: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) => (
  <button type="button" disabled={disabled} onClick={() => onChange?.(!on)}
    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${on ? 'bg-primary' : 'bg-line-strong'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-5' : ''}`} />
  </button>
)

const NumUnit = ({ value, unit, disabled, w = 'w-[14rem]' }: { value: string; unit: string; disabled?: boolean; w?: string }) => (
  <div className={`inline-flex items-center h-9 px-3 border rounded-md ${disabled ? 'bg-fill border-line-default text-ink-muted' : 'bg-card border-line-default text-ink'} ${w}`}>
    <input defaultValue={value} disabled={disabled} className="w-full min-w-0 bg-transparent outline-none text-md text-right" />
    <span className="text-md text-ink-subtle ml-1.5 whitespace-nowrap">{unit}</span>
  </div>
)

/* small giờ/phút field used inside the time popover */
const MiniUnit = ({ value, onChange, unit }: { value: number; onChange: (v: number) => void; unit: string }) => (
  <div className="flex flex-1 items-center h-10 px-3 border border-line-default rounded-md bg-card">
    <input value={value} inputMode="numeric" onChange={e => onChange(parseInt(e.target.value.replace(/\D/g, '') || '0', 10))}
      className="w-full min-w-0 bg-transparent outline-none text-md text-right text-ink" />
    <span className="text-md text-ink-subtle ml-1.5">{unit}</span>
  </div>
)

/* giờ+phút input that opens a popover with Hủy / Lưu (Image #18) */
const TimePopover = ({ initialH, initialM, disabled, w = 'w-[14rem]' }: { initialH: number; initialM: number; disabled?: boolean; w?: string }) => {
  const [h, setH] = useState(initialH)
  const [m, setM] = useState(initialM)
  const [open, setOpen] = useState(false)
  const [draftH, setDraftH] = useState(initialH)
  const [draftM, setDraftM] = useState(initialM)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])
  const label = m ? `${h} giờ ${m} phút` : `${h} giờ`
  return (
    <div ref={ref} className={`relative inline-block ${w}`}>
      <button type="button" disabled={disabled} onClick={() => { setDraftH(h); setDraftM(m); setOpen(o => !o) }}
        className={`w-full h-9 px-3 flex items-center border rounded-md text-md ${disabled ? 'bg-fill border-line-default text-ink-muted cursor-not-allowed' : `bg-card text-ink cursor-pointer ${open ? 'border-primary' : 'border-line-default'}`}`}>
        {label}
      </button>
      {open && !disabled && (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-[var(--kv-z-dropdown)] w-[24rem] max-w-[90vw] bg-card border border-line-default rounded-lg shadow-md p-4">
          <div className="flex items-center gap-3">
            <MiniUnit value={draftH} onChange={setDraftH} unit="giờ" />
            <MiniUnit value={draftM} onChange={setDraftM} unit="phút" />
          </div>
          <div className="flex items-center justify-end gap-2 mt-3">
            <button onClick={() => setOpen(false)} className="kv-btn kv-btn-outline-neutral h-8 bg-card">Hủy</button>
            <button onClick={() => { setH(draftH); setM(draftM); setOpen(false) }} className="kv-btn kv-btn-primary h-8">Lưu</button>
          </div>
        </div>
      )}
    </div>
  )
}

const CheckLabel = ({ checked, onChange, disabled, children }: { checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean; children: React.ReactNode }) => (
  <label className={`flex items-center gap-3 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
    <input type="checkbox" checked={checked} disabled={disabled} onChange={e => onChange?.(e.target.checked)} className="accent-primary w-4 h-4 shrink-0" />
    {children}
  </label>
)

/* a settings block: title + description, optional right control, optional body */
const Block = ({ title, desc, right, children, last }: { title: string; desc?: string; right?: React.ReactNode; children?: React.ReactNode; last?: boolean }) => (
  <div className={`py-5 ${last ? '' : 'border-b border-line'}`}>
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0">
        <div className="text-md font-semibold text-ink">{title}</div>
        {desc && <div className="text-sm text-ink-subtle mt-1">{desc}</div>}
      </div>
      {right && <div className="shrink-0 flex items-center">{right}</div>}
    </div>
    {children && <div className="mt-4 flex flex-col gap-3">{children}</div>}
  </div>
)

/* ─────────────────────────────────────────────────────────────────────────── */
const EmployeeSettings = () => {
  const [tab, setTab] = useState<Tab>('attendance')
  const [shiftListOpen, setShiftListOpen] = useState(false)
  const [shifts, setShifts] = useState<ShiftRow[]>(INITIAL_SHIFTS)

  // attendance toggles / checkboxes
  const [halfDay, setHalfDay] = useState(false)
  const [countLate, setCountLate] = useState(true)
  const [countEarly, setCountEarly] = useState(true)
  const [otBefore, setOtBefore] = useState(true)
  const [otAfter, setOtAfter] = useState(true)
  const [singleInOut, setSingleInOut] = useState(false)
  const [autoAttendance, setAutoAttendance] = useState(false)
  const [noSchedule, setNoSchedule] = useState(true)

  // payroll toggles
  const [autoCreate, setAutoCreate] = useState(true)
  const [autoUpdate, setAutoUpdate] = useState(true)
  const [pit, setPit] = useState(false)
  const [insurance, setInsurance] = useState(false)

  const NAV = [
    { id: 'attendance' as Tab, label: 'Chấm công', icon: <CalCheckIcon /> },
    { id: 'payroll' as Tab, label: 'Tính lương', icon: <DollarIcon /> },
  ]

  return (
    <div className="flex flex-col h-[calc(100vh-var(--kv-header-height))] min-h-0 pt-4 pb-4 px-6">
      <h1 className="text-h3 font-extrabold text-ink mb-4">Thiết lập nhân viên</h1>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* ── left sidebar ─────────────────────────────────────────────── */}
        <nav className="w-[15rem] shrink-0">
          <div className="text-sm font-semibold text-ink-subtle px-3 mb-2">Thiết lập</div>
          <div className="flex flex-col gap-1">
            {NAV.map(n => (
              <button key={n.id} onClick={() => { setTab(n.id); setShiftListOpen(false) }}
                className={`flex items-center gap-3 h-10 px-3 rounded-md text-md cursor-pointer transition-colors ${tab === n.id ? 'bg-primary-25 text-primary font-semibold' : 'text-ink hover:bg-[var(--kv-state-hover-bg)]'}`}>
                {n.icon}{n.label}
              </button>
            ))}
          </div>
        </nav>

        {/* ── main + right aside ───────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex gap-6 min-h-0">
          <main className="flex-1 min-w-0 bg-card border border-line rounded-lg px-8 py-6 overflow-y-auto min-h-0">
            {tab === 'attendance' && !shiftListOpen && (
              <AttendanceSettings
                onOpenShiftList={() => setShiftListOpen(true)}
                shiftCount={shifts.filter(s => s.active).length}
                state={{ halfDay, setHalfDay, countLate, setCountLate, countEarly, setCountEarly, otBefore, setOtBefore, otAfter, setOtAfter, singleInOut, setSingleInOut, autoAttendance, setAutoAttendance, noSchedule, setNoSchedule }}
              />
            )}
            {tab === 'attendance' && shiftListOpen && (
              <ShiftList shifts={shifts} setShifts={setShifts} onBack={() => setShiftListOpen(false)} />
            )}
            {tab === 'payroll' && (
              <PayrollSettings state={{ autoCreate, setAutoCreate, autoUpdate, setAutoUpdate, pit, setPit, insurance, setInsurance }} />
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

/* ── Chấm công tab ─────────────────────────────────────────────────────────── */
interface AttnState {
  halfDay: boolean; setHalfDay: (v: boolean) => void
  countLate: boolean; setCountLate: (v: boolean) => void
  countEarly: boolean; setCountEarly: (v: boolean) => void
  otBefore: boolean; setOtBefore: (v: boolean) => void
  otAfter: boolean; setOtAfter: (v: boolean) => void
  singleInOut: boolean; setSingleInOut: (v: boolean) => void
  autoAttendance: boolean; setAutoAttendance: (v: boolean) => void
  noSchedule: boolean; setNoSchedule: (v: boolean) => void
}
const AttendanceSettings = ({ onOpenShiftList, shiftCount, state }: { onOpenShiftList: () => void; shiftCount: number; state: AttnState }) => (
  <div>
    <h2 className="text-lg font-bold text-ink mb-2">Thiết lập chấm công</h2>

    <Block title="Thiết lập ca làm việc" desc="Quản lý các ca làm việc của cửa hàng"
      right={<button onClick={onOpenShiftList} className="flex items-center gap-1 text-md text-ink hover:text-primary cursor-pointer">{shiftCount} ca làm việc <ChevronRight /></button>} />

    <Block title="Số giờ của ngày công chuẩn" desc="Thiết lập số giờ tính 1 công hay 0,5 công của loại lương Theo ngày công chuẩn">
      <div className="flex items-center gap-3">
        <span className="text-md text-ink">Số giờ của 1 ngày công chuẩn là</span>
        <TimePopover initialH={8} initialM={0} />
        <InfoIcon />
      </div>
      <CheckLabel checked={state.halfDay} onChange={state.setHalfDay}>
        <span className="text-md text-ink">Tính nửa công khi thời gian làm việc</span>
        <InfoIcon />
      </CheckLabel>
      <div className="flex items-center gap-3 pl-7">
        <span className="text-md text-ink-subtle">Từ</span>
        <TimePopover initialH={0} initialM={0} disabled={!state.halfDay} />
        <span className="text-md text-ink-subtle">Đến</span>
        <TimePopover initialH={4} initialM={30} disabled={!state.halfDay} w="w-[18rem]" />
      </div>
      <CheckLabel checked={false} disabled>
        <span className="text-md text-ink-muted">Ghi nhận đi muộn - về sớm nếu nhân viên làm nửa công</span>
      </CheckLabel>
    </Block>

    <Block title="Cài đặt đi muộn - về sớm" desc="Cài đặt thời gian tối đa được đi muộn hoặc về sớm">
      <CheckLabel checked={state.countLate} onChange={state.setCountLate}>
        <span className="w-[11rem] text-md text-ink">Tính đi muộn sau</span>
        <NumUnit value="0" unit="phút" />
        <InfoIcon />
      </CheckLabel>
      <CheckLabel checked={state.countEarly} onChange={state.setCountEarly}>
        <span className="w-[11rem] text-md text-ink">Tính về sớm trước</span>
        <NumUnit value="0" unit="phút" />
        <InfoIcon />
      </CheckLabel>
    </Block>

    <Block title="Cài đặt làm thêm giờ" desc="Tính làm thêm giờ cho nhân viên khi vào ca sớm hoặc tan ca muộn">
      <CheckLabel checked={state.otBefore} onChange={state.setOtBefore}>
        <span className="w-[11rem] text-md text-ink">Tính làm thêm giờ trước ca</span>
        <NumUnit value="0" unit="phút" />
        <InfoIcon />
      </CheckLabel>
      <CheckLabel checked={state.otAfter} onChange={state.setOtAfter}>
        <span className="w-[11rem] text-md text-ink">Tính làm thêm giờ sau ca</span>
        <NumUnit value="0" unit="phút" />
        <InfoIcon />
      </CheckLabel>
    </Block>

    <Block title="Cho phép chấm 1 lượt Vào - Ra khi làm nhiều ca liên tục"
      desc="Ví dụ: Ca 1 (7:00 - 12:00), Ca 2(13:00 - 18:00). Bạn chỉ cần chấm công Vào ca 1, chấm công Ra ca 2 (bằng mã QR hoặc chấm vân tay), hệ thống sẽ tự động ghi nhận Ra ca 1 lúc 12:00, Vào ca 2 lúc 13:00"
      right={<Toggle on={state.singleInOut} onChange={state.setSingleInOut} />} />

    <Block title="Tự động chấm công" desc="Nhân viên không phải chủ động chấm công. Hệ thống sẽ tự động chấm công thay nhân viên"
      right={<Toggle on={state.autoAttendance} onChange={state.setAutoAttendance} />} />

    <Block title="Chấm công không cần xếp lịch" desc="Ngoài các ca làm việc đã được xếp lịch, nhân viên được phép chấm công vào ca làm việc chưa được xếp lịch."
      right={<Toggle on={state.noSchedule} onChange={state.setNoSchedule} />} last />
  </div>
)

/* ── Danh sách ca làm việc (sub-view of Chấm công) ─────────────────────────── */
const ShiftList = ({ shifts, setShifts, onBack }: { shifts: ShiftRow[]; setShifts: React.Dispatch<React.SetStateAction<ShiftRow[]>>; onBack: () => void }) => {
  const [modal, setModal] = useState<{ shift: ShiftRow | null } | null>(null)
  const toggle = (id: string) => setShifts(rs => rs.map(r => r.id === id ? { ...r, active: !r.active } : r))
  const remove = (id: string) => setShifts(rs => rs.filter(r => r.id !== id))
  const save = (name: string, start: string, end: string) => {
    const time = `${start} - ${end}`
    const hours = durationText(start, end)
    if (modal?.shift) {
      const id = modal.shift.id
      setShifts(rs => rs.map(r => r.id === id ? { ...r, name, time, hours } : r))
    } else {
      setShifts(rs => [...rs, { id: uid(), name, time, hours, active: true }])
    }
    setModal(null)
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <button onClick={onBack} className="flex items-center gap-2 text-lg font-bold text-ink cursor-pointer hover:text-primary">
          <ChevronLeft /> Danh sách ca làm việc
        </button>
        <button onClick={() => setModal({ shift: null })} className="kv-btn kv-btn-outline-primary h-10">
          <span className="text-lg leading-none">+</span> Thêm ca làm việc
        </button>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-fill text-sm font-semibold text-ink-subtle">
            <th className="text-left px-4 py-3 w-[4rem]">STT</th>
            <th className="text-left px-4 py-3">Ca làm việc</th>
            <th className="text-left px-4 py-3">Thời gian</th>
            <th className="text-left px-4 py-3">Tổng giờ làm việc</th>
            <th className="text-center px-4 py-3">Hoạt động</th>
            <th className="text-right px-4 py-3">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {shifts.map((s, i) => (
            <tr key={s.id} className="border-b border-line">
              <td className="px-4 py-4 text-md text-ink">{i + 1}</td>
              <td className="px-4 py-4 text-md text-ink">{s.name}</td>
              <td className="px-4 py-4 text-md text-ink">{s.time}</td>
              <td className="px-4 py-4 text-md text-ink">{s.hours}</td>
              <td className="px-4 py-4"><div className="flex justify-center"><Toggle on={s.active} onChange={() => toggle(s.id)} /></div></td>
              <td className="px-4 py-4">
                <div className="flex items-center justify-end gap-4 text-ink-muted">
                  <button onClick={() => setModal({ shift: s })} className="hover:text-primary cursor-pointer" aria-label="Sửa"><PencilIcon /></button>
                  <button onClick={() => remove(s.id)} className="hover:text-danger cursor-pointer" aria-label="Xóa"><TrashIcon /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center gap-3 mt-4 text-md text-ink-subtle">
        Hiển thị
        <div className="relative">
          <select className="h-9 pl-3 pr-8 bg-card border border-line-default rounded-md text-md text-ink appearance-none cursor-pointer outline-none focus:border-primary">
            <option>10 bản ghi</option>
            <option>20 bản ghi</option>
            <option>50 bản ghi</option>
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90"><ChevronRight /></span>
        </div>
      </div>

      {modal && <ShiftModal shift={modal.shift} onClose={() => setModal(null)} onSave={save} />}
    </div>
  )
}

/* ── Tính lương tab ────────────────────────────────────────────────────────── */
interface PayrollState {
  autoCreate: boolean; setAutoCreate: (v: boolean) => void
  autoUpdate: boolean; setAutoUpdate: (v: boolean) => void
  pit: boolean; setPit: (v: boolean) => void
  insurance: boolean; setInsurance: (v: boolean) => void
}
const PayrollSettings = ({ state }: { state: PayrollState }) => (
  <div>
    <h2 className="text-lg font-bold text-ink mb-2">Thiết lập tính lương</h2>

    <Block title="Ngày tính lương" desc="Ngày bắt đầu tính công cho nhân viên có kỳ lương hàng tháng">
      <div className="flex items-center gap-3">
        <span className="text-md text-ink">Chọn ngày bắt đầu kỳ lương hàng tháng</span>
        <div className="relative">
          <select className="h-9 pl-3 pr-8 bg-card border border-line-default rounded-md text-md text-ink appearance-none cursor-pointer outline-none focus:border-primary">
            {Array.from({ length: 28 }, (_, i) => <option key={i}>Ngày {i + 1}</option>)}
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90"><ChevronRight /></span>
        </div>
        <InfoIcon />
      </div>
    </Block>

    <Block title="Tự động tạo bảng tính lương" desc="Bảng tính lương sẽ được tự động tạo mới vào mỗi kỳ lương"
      right={<Toggle on={state.autoCreate} onChange={state.setAutoCreate} />} />

    <Block title="Tự động cập nhật bảng tính lương" desc="Bảng tính lương sẽ được tự động cập nhật mỗi ngày"
      right={<Toggle on={state.autoUpdate} onChange={state.setAutoUpdate} />} />

    <Block title="Thiết lập Mẫu lương" desc="Thưởng, Hoa hồng, Phụ cấp, Giảm trừ"
      right={<button className="flex items-center gap-1 text-md text-ink hover:text-primary cursor-pointer">0 mẫu lương <ChevronRight /></button>} />

    <Block title="Danh mục phụ cấp" desc="Danh sách phụ cấp khoán tiền hỗ trợ nhân viên như ăn trưa, đi lại, điện thoại,..."
      right={<button className="kv-btn kv-btn-outline-primary h-9">Thêm phụ cấp</button>} />

    <Block title="Danh mục giảm trừ" desc="Thiết lập khoán giảm trừ như đi muộn, về sớm, vi phạm nội quy,..."
      right={<button className="kv-btn kv-btn-outline-primary h-9">Thêm giảm trừ</button>} />

    <Block title="Thuế TNCN cho nhân viên" desc="Thiết lập quy định tính thuế TNCN cho nhân viên"
      right={<Toggle on={state.pit} onChange={state.setPit} />} />

    <Block title="Bảo hiểm xã hội nhân viên" desc="Thiết lập quy định đóng bảo hiểm xã hội"
      right={<Toggle on={state.insurance} onChange={state.setInsurance} />} last />
  </div>
)

export default EmployeeSettings
