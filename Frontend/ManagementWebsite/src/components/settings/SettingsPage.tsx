import { useEffect, useRef, useState } from 'react'
import type { AttendanceSettingsDto, ManualTimeMode, ShiftDto } from '../../api/attendance'
import { deleteShift, formatTime, getSettings, listShifts, updateSettings, updateShift } from '../../api/attendance'
import type { SalaryTemplateDto } from '../../api/salaryTemplates'
import { listSalaryTemplates } from '../../api/salaryTemplates'
import type { FinancialCustomLineRow, FinancialLineGroupParam } from '../../api/reports'
import { deleteFinancialCustomLine, listFinancialCustomLines } from '../../api/reports'
import { ApiError } from '../../services/api'
import ShiftTemplateModal from '../staff/schedule/ShiftTemplateModal'
import SalaryTemplateList from '../staff/settings/SalaryTemplateList'
import FinancialCustomLineModal from './FinancialCustomLineModal'

/* ─────────────────────────────────────────────────────────────────────────────
 * Thiết lập — unified KiotViet-style settings shell. Sidebar trimmed down to
 * only what's implemented: Báo cáo (display-only, no backend yet), and the
 * former "Thiết lập nhân viên" screen flattened into Chấm công / Tính lương.
 * Chấm công is wired to the real UC-AT-05 settings API + UC-AT-01 shift CRUD.
 * ──────────────────────────────────────────────────────────────────────────── */

type Tab = 'reports' | 'attendance' | 'payroll' | 'financial'

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
const ReportIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
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
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
)
const FinanceIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
)

/* ── primitives ────────────────────────────────────────────────────────────── */
const Toggle = ({ on, onChange, disabled }: { on: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) => (
  <button type="button" disabled={disabled} onClick={() => onChange?.(!on)}
    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${on ? 'bg-primary' : 'bg-line-strong'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-5' : ''}`} />
  </button>
)

/* plain minutes input used for "Tính đi muộn sau X phút" style fields */
const NumUnit = ({ value, onChange, unit, disabled, w = 'w-[14rem]' }: { value: number; onChange: (v: number) => void; unit: string; disabled?: boolean; w?: string }) => (
  <div className={`inline-flex items-center h-9 px-3 border rounded-md ${disabled ? 'bg-fill border-line-default text-ink-muted' : 'bg-card border-line-default text-ink'} ${w}`}>
    <input value={value} disabled={disabled} inputMode="numeric"
      onChange={e => onChange(parseInt(e.target.value.replace(/\D/g, '') || '0', 10))}
      className="w-full min-w-0 bg-transparent outline-none text-md text-right" />
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

/** minutes ⇄ giờ+phút popover with Hủy / Lưu, committing the total minutes on save. */
const TimePopover = ({ minutes, onChange, disabled, w = 'w-[14rem]' }: { minutes: number; onChange: (v: number) => void; disabled?: boolean; w?: string }) => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const [open, setOpen] = useState(false)
  const [draftH, setDraftH] = useState(h)
  const [draftM, setDraftM] = useState(m)
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
            <button onClick={() => { onChange(draftH * 60 + draftM); setOpen(false) }} className="kv-btn kv-btn-primary h-8">Lưu</button>
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

const RadioLabel = ({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) => (
  <label className="flex items-center gap-2 cursor-pointer text-md text-ink">
    <input type="radio" checked={checked} onChange={onChange} className="accent-primary w-4 h-4" />
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
const SettingsPage = () => {
  const [tab, setTab] = useState<Tab>('reports')
  const [shiftListOpen, setShiftListOpen] = useState(false)
  const [shifts, setShifts] = useState<ShiftDto[]>([])
  const [salaryTemplateListOpen, setSalaryTemplateListOpen] = useState(false)
  const [salaryTemplates, setSalaryTemplates] = useState<SalaryTemplateDto[]>([])
  const [financialLines, setFinancialLines] = useState<FinancialCustomLineRow[]>([])

  const [settings, setSettings] = useState<AttendanceSettingsDto | null>(null)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')

  // payroll toggles (out of AT scope — display-only, no persistence)
  const [autoCreate, setAutoCreate] = useState(true)
  const [autoUpdate, setAutoUpdate] = useState(true)
  const [pit, setPit] = useState(false)

  // reports toggles — display-only, no backend support yet
  const [customRevenueWindow, setCustomRevenueWindow] = useState(true)
  const [revenueCutoffTime, setRevenueCutoffTime] = useState('00:00')
  const [shiftClosingRequired, setShiftClosingRequired] = useState(true)
  const [managerConfirmClosing, setManagerConfirmClosing] = useState(false)

  const loadShifts = () => {
    listShifts().then(res => setShifts(res.data.data)).catch(() => {})
  }
  const loadSalaryTemplates = () => {
    listSalaryTemplates().then(res => setSalaryTemplates(res.data.data)).catch(() => {})
  }
  const loadFinancialLines = () => {
    listFinancialCustomLines().then(res => setFinancialLines(res.data.data)).catch(() => {})
  }

  useEffect(() => {
    loadShifts()
    loadSalaryTemplates()
    loadFinancialLines()
    getSettings()
      .then(res => setSettings(res.data.data))
      .catch(err => setLoadError(err instanceof ApiError ? err.message : 'Không tải được thiết lập chấm công.'))
  }, [])

  const commit = async (next: AttendanceSettingsDto) => {
    setSettings(next) // optimistic
    try {
      await updateSettings(next)
      setSaveError('')
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Không thể lưu thiết lập chấm công.')
    }
  }

  const NAV = [
    { id: 'reports' as Tab, label: 'Báo cáo', icon: <ReportIcon /> },
    { id: 'attendance' as Tab, label: 'Chấm công', icon: <CalCheckIcon /> },
    { id: 'payroll' as Tab, label: 'Tính lương', icon: <DollarIcon /> },
    { id: 'financial' as Tab, label: 'Tài chính', icon: <FinanceIcon /> },
  ]

  return (
    <div className="flex flex-col h-[calc(100vh-var(--kv-header-height))] min-h-0 pt-4 pb-4 px-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h1 className="text-h3 font-extrabold text-ink shrink-0">Thiết lập</h1>
        <div className="relative w-full max-w-[36rem]">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"><SearchIcon /></span>
          <input
            placeholder="Tìm kiếm thiết lập"
            className="w-full h-10 pl-10 pr-4 rounded-full border border-line-default bg-card text-md text-ink outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* ── left sidebar ─────────────────────────────────────────────── */}
        <nav className="w-[15rem] shrink-0">
          <div className="flex flex-col gap-1">
            {NAV.map(n => (
              <button key={n.id} onClick={() => { setTab(n.id); setShiftListOpen(false); setSalaryTemplateListOpen(false) }}
                className={`flex items-center gap-3 h-10 px-3 rounded-md text-md cursor-pointer transition-colors ${tab === n.id ? 'bg-primary-25 text-primary font-semibold' : 'text-ink hover:bg-[var(--kv-state-hover-bg)]'}`}>
                {n.icon}{n.label}
              </button>
            ))}
          </div>
        </nav>

        {/* ── main + right aside ───────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex gap-6 min-h-0">
          <main className="flex-1 min-w-0 bg-card border border-line rounded-lg px-8 py-6 overflow-y-auto min-h-0">
            {loadError && tab === 'attendance' && <div className="mb-4 px-4 py-2 rounded-md bg-danger-50 text-danger text-md border border-danger/30">{loadError}</div>}

            {tab === 'reports' && (
              <ReportsSettings
                customRevenueWindow={customRevenueWindow} setCustomRevenueWindow={setCustomRevenueWindow}
                revenueCutoffTime={revenueCutoffTime} setRevenueCutoffTime={setRevenueCutoffTime}
                shiftClosingRequired={shiftClosingRequired} setShiftClosingRequired={setShiftClosingRequired}
                managerConfirmClosing={managerConfirmClosing} setManagerConfirmClosing={setManagerConfirmClosing}
              />
            )}

            {tab === 'attendance' && !shiftListOpen && settings && (
              <AttendanceSettingsView
                onOpenShiftList={() => setShiftListOpen(true)}
                shiftCount={shifts.filter(s => s.status === 'ACTIVE').length}
                settings={settings}
                commit={commit}
                saveError={saveError}
              />
            )}
            {tab === 'attendance' && shiftListOpen && (
              <ShiftList shifts={shifts} onBack={() => setShiftListOpen(false)} onChanged={loadShifts} />
            )}
            {tab === 'payroll' && !salaryTemplateListOpen && (
              <PayrollSettings
                state={{ autoCreate, setAutoCreate, autoUpdate, setAutoUpdate, pit, setPit }}
                salaryTemplateCount={salaryTemplates.length}
                onOpenSalaryTemplateList={() => setSalaryTemplateListOpen(true)}
              />
            )}
            {tab === 'payroll' && salaryTemplateListOpen && (
              <SalaryTemplateList
                templates={salaryTemplates}
                onBack={() => setSalaryTemplateListOpen(false)}
                onChanged={loadSalaryTemplates}
              />
            )}

            {tab === 'financial' && (
              <FinancialLineSettings lines={financialLines} onChanged={loadFinancialLines} />
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

/* ── Báo cáo tab ───────────────────────────────────────────────────────────── */
const ReportsSettings = ({
  customRevenueWindow, setCustomRevenueWindow,
  revenueCutoffTime, setRevenueCutoffTime,
  shiftClosingRequired, setShiftClosingRequired,
  managerConfirmClosing, setManagerConfirmClosing,
}: {
  customRevenueWindow: boolean; setCustomRevenueWindow: (v: boolean) => void
  revenueCutoffTime: string; setRevenueCutoffTime: (v: string) => void
  shiftClosingRequired: boolean; setShiftClosingRequired: (v: boolean) => void
  managerConfirmClosing: boolean; setManagerConfirmClosing: (v: boolean) => void
}) => (
  <div>
    <h2 className="text-lg font-bold text-ink mb-2">Báo cáo</h2>

    <Block title="Cho phép tùy chỉnh khung giờ tính doanh thu"
      desc="Thiết lập khung giờ tính doanh thu trong ngày thay vì dùng khung giờ mặc định từ 00:00 đến trước 00:00 ngày hôm sau."
      right={<Toggle on={customRevenueWindow} onChange={setCustomRevenueWindow} />}>
      {customRevenueWindow && (
        <div className="flex items-center gap-3">
          <span className="text-md text-ink">Tính doanh thu theo giao dịch phát sinh trước</span>
          <input type="time" value={revenueCutoffTime} onChange={e => setRevenueCutoffTime(e.target.value)}
            className="h-9 px-3 border border-line-default rounded-md bg-card text-md text-ink outline-none focus:border-primary" />
          <InfoIcon />
        </div>
      )}
    </Block>

    <Block title="Kết ca" desc="Thu ngân cần mở ca để bắt đầu làm việc và kết ca khi kết thúc ca làm."
      right={<Toggle on={shiftClosingRequired} onChange={setShiftClosingRequired} />} last>
      {shiftClosingRequired && (
        <CheckLabel checked={managerConfirmClosing} onChange={setManagerConfirmClosing}>
          <span className="text-md text-ink">Xác nhận kết ca của Quản lý</span>
        </CheckLabel>
      )}
    </Block>
  </div>
)

/* ── Chấm công tab ─────────────────────────────────────────────────────────── */
const AttendanceSettingsView = ({ onOpenShiftList, shiftCount, settings, commit, saveError }: {
  onOpenShiftList: () => void
  shiftCount: number
  settings: AttendanceSettingsDto
  commit: (next: AttendanceSettingsDto) => void
  saveError: string
}) => {
  const set = <K extends keyof AttendanceSettingsDto>(key: K, value: AttendanceSettingsDto[K]) =>
    commit({ ...settings, [key]: value })

  return (
    <div>
      <h2 className="text-lg font-bold text-ink mb-2">Thiết lập chấm công</h2>
      {saveError && <div className="mb-3 px-4 py-2 rounded-md bg-danger-50 text-danger text-md border border-danger/30">{saveError}</div>}

      <Block title="Thiết lập ca làm việc" desc="Quản lý các ca làm việc của cửa hàng"
        right={<button onClick={onOpenShiftList} className="flex items-center gap-1 text-md text-ink hover:text-primary cursor-pointer">{shiftCount} ca làm việc <ChevronRight /></button>} />

      <Block title="Số giờ của ngày công chuẩn" desc="Thiết lập số giờ tính 1 công hay 0,5 công của loại lương Theo ngày công chuẩn (BR-AT-08)">
        <div className="flex items-center gap-3">
          <span className="text-md text-ink">Số giờ của 1 ngày công chuẩn là</span>
          <TimePopover minutes={settings.standardWorkdayMinutes} onChange={v => set('standardWorkdayMinutes', v)} />
          <InfoIcon />
        </div>
        <CheckLabel checked={settings.halfDayEnabled} onChange={v => set('halfDayEnabled', v)}>
          <span className="text-md text-ink">Tính nửa công khi thời gian làm việc</span>
          <InfoIcon />
        </CheckLabel>
        <div className="flex items-center gap-3 pl-7">
          <span className="text-md text-ink-subtle">Từ</span>
          <TimePopover minutes={settings.halfDayMinMinutes} onChange={v => set('halfDayMinMinutes', v)} disabled={!settings.halfDayEnabled} />
          <span className="text-md text-ink-subtle">Đến</span>
          <TimePopover minutes={settings.halfDayMaxMinutes} onChange={v => set('halfDayMaxMinutes', v)} disabled={!settings.halfDayEnabled} w="w-[18rem]" />
        </div>
        <CheckLabel checked={false} disabled>
          <span className="text-md text-ink-muted">Ghi nhận đi muộn - về sớm nếu nhân viên làm nửa công</span>
        </CheckLabel>
      </Block>

      <Block title="Cài đặt đi muộn - về sớm" desc="Cài đặt thời gian tối đa được đi muộn hoặc về sớm (BR-AT-09)">
        <CheckLabel checked={settings.lateEnabled} onChange={v => set('lateEnabled', v)}>
          <span className="w-[11rem] text-md text-ink">Tính đi muộn sau</span>
          <NumUnit value={settings.lateGraceMinutes} onChange={v => set('lateGraceMinutes', v)} unit="phút" disabled={!settings.lateEnabled} />
          <InfoIcon />
        </CheckLabel>
        <CheckLabel checked={settings.earlyLeaveEnabled} onChange={v => set('earlyLeaveEnabled', v)}>
          <span className="w-[11rem] text-md text-ink">Tính về sớm trước</span>
          <NumUnit value={settings.earlyLeaveGraceMinutes} onChange={v => set('earlyLeaveGraceMinutes', v)} unit="phút" disabled={!settings.earlyLeaveEnabled} />
          <InfoIcon />
        </CheckLabel>
      </Block>

      <Block title="Cài đặt làm thêm giờ" desc="Tính làm thêm giờ cho nhân viên khi vào ca sớm hoặc tan ca muộn (BR-AT-10)">
        <CheckLabel checked={settings.otBeforeEnabled} onChange={v => set('otBeforeEnabled', v)}>
          <span className="w-[11rem] text-md text-ink">Tính làm thêm giờ trước ca</span>
          <NumUnit value={settings.otBeforeMinMinutes} onChange={v => set('otBeforeMinMinutes', v)} unit="phút" disabled={!settings.otBeforeEnabled} />
          <InfoIcon />
        </CheckLabel>
        <CheckLabel checked={settings.otAfterEnabled} onChange={v => set('otAfterEnabled', v)}>
          <span className="w-[11rem] text-md text-ink">Tính làm thêm giờ sau ca</span>
          <NumUnit value={settings.otAfterMinMinutes} onChange={v => set('otAfterMinMinutes', v)} unit="phút" disabled={!settings.otAfterEnabled} />
          <InfoIcon />
        </CheckLabel>
      </Block>

      <Block title="Cho phép chấm 1 lượt Vào - Ra khi làm nhiều ca liên tục"
        desc="Ví dụ: Ca 1 (7:00 - 12:00), Ca 2(13:00 - 18:00). Bạn chỉ cần chấm công Vào ca 1, chấm công Ra ca 2, hệ thống sẽ tự động ghi nhận Ra ca 1 lúc 12:00, Vào ca 2 lúc 13:00 (BR-AT-11)"
        right={<Toggle on={settings.mergedShiftEnabled} onChange={v => set('mergedShiftEnabled', v)} />}>
        {settings.mergedShiftEnabled && (
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="text-md text-ink">Số ca tối đa</span>
              <NumUnit value={settings.mergedShiftMaxCount} onChange={v => set('mergedShiftMaxCount', Math.max(2, v))} unit="ca" w="w-[10rem]" />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-md text-ink">Thời gian nghỉ tối đa giữa 2 ca</span>
              <NumUnit value={settings.mergedShiftMaxBreakMinutes} onChange={v => set('mergedShiftMaxBreakMinutes', v)} unit="phút" />
            </div>
          </div>
        )}
      </Block>

      <Block title="Chấm công thủ công ở bảng chấm công" desc="Chế độ giờ mặc định khi Quản lý chấm công thủ công trên Bảng chấm công (BR-AT-05)">
        <RadioLabel checked={settings.manualDefaultTimeMode === 'SHIFT_TIME'} onChange={() => set('manualDefaultTimeMode', 'SHIFT_TIME' as ManualTimeMode)}>
          Theo giờ bắt đầu/kết thúc ca
        </RadioLabel>
        <RadioLabel checked={settings.manualDefaultTimeMode === 'ACTUAL_TIME'} onChange={() => set('manualDefaultTimeMode', 'ACTUAL_TIME' as ManualTimeMode)}>
          Theo giờ chấm công thực tế
        </RadioLabel>
      </Block>

      <Block title="Tự động chấm công" desc="Nhân viên không phải chủ động chấm công. Hệ thống sẽ tự động chấm công thay nhân viên (ngoài phạm vi hiện tại)"
        right={<Toggle on={false} disabled />} />

      <Block title="Chấm công không cần xếp lịch" desc="Ngoài các ca làm việc đã được xếp lịch, nhân viên được phép chấm công vào ca làm việc chưa được xếp lịch (ngoài phạm vi hiện tại)"
        right={<Toggle on={false} disabled />} last />
    </div>
  )
}

/* ── Danh sách ca làm việc (sub-view of Chấm công) ─────────────────────────── */
const ShiftList = ({ shifts, onBack, onChanged }: { shifts: ShiftDto[]; onBack: () => void; onChanged: () => void }) => {
  const [modal, setModal] = useState<{ shift: ShiftDto | null } | null>(null)
  const [error, setError] = useState('')

  const toggleActive = async (s: ShiftDto) => {
    try {
      await updateShift(s.id, {
        name: s.name, startTime: s.startTime, endTime: s.endTime,
        checkInWindowStart: s.checkInWindowStart, checkInWindowEnd: s.checkInWindowEnd,
        status: s.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
      })
      onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể cập nhật ca làm việc.')
    }
  }

  const remove = async (s: ShiftDto) => {
    try {
      await deleteShift(s.id)
      onChanged()
    } catch (err) {
      // BR-AT-02: shifts with attendance history can only be deactivated.
      setError(err instanceof ApiError ? err.message : 'Ca đã có dữ liệu chấm công. Vui lòng ngừng hoạt động thay vì xóa.')
    }
  }

  const durationText = (start: string, end: string) => {
    const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
    let d = toMin(end) - toMin(start)
    if (d <= 0) d += 24 * 60
    const h = Math.floor(d / 60), m = d % 60
    return m === 0 ? `${h} giờ` : `${h} giờ ${m} phút`
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

      {error && <div className="mb-3 px-4 py-2 rounded-md bg-danger-50 text-danger text-md border border-danger/30">{error}</div>}

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
              <td className="px-4 py-4 text-md text-ink">{formatTime(s.startTime)} - {formatTime(s.endTime)}</td>
              <td className="px-4 py-4 text-md text-ink">{durationText(s.startTime, s.endTime)}</td>
              <td className="px-4 py-4"><div className="flex justify-center"><Toggle on={s.status === 'ACTIVE'} onChange={() => toggleActive(s)} /></div></td>
              <td className="px-4 py-4">
                <div className="flex items-center justify-end gap-4 text-ink-muted">
                  <button onClick={() => setModal({ shift: s })} className="hover:text-primary cursor-pointer" aria-label="Sửa"><PencilIcon /></button>
                  <button onClick={() => remove(s)} className="hover:text-danger cursor-pointer" aria-label="Xóa"><TrashIcon /></button>
                </div>
              </td>
            </tr>
          ))}
          {shifts.length === 0 && (
            <tr><td colSpan={6} className="px-4 py-10 text-center text-md text-ink-subtle">Chưa có ca làm việc nào</td></tr>
          )}
        </tbody>
      </table>

      {modal && (
        <ShiftTemplateModal
          shift={modal.shift}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); onChanged() }}
        />
      )}
    </div>
  )
}

/* ── Tính lương tab ────────────────────────────────────────────────────────── */
interface PayrollState {
  autoCreate: boolean; setAutoCreate: (v: boolean) => void
  autoUpdate: boolean; setAutoUpdate: (v: boolean) => void
  pit: boolean; setPit: (v: boolean) => void
}
const PayrollSettings = ({ state, salaryTemplateCount, onOpenSalaryTemplateList }: {
  state: PayrollState
  salaryTemplateCount: number
  onOpenSalaryTemplateList: () => void
}) => (
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

    <Block title="Thiết lập Mẫu lương" desc="Thiết lập mẫu lương chung có thể dùng cho nhiều nhân viên"
      right={<button onClick={onOpenSalaryTemplateList} className="flex items-center gap-1 text-md text-ink hover:text-primary cursor-pointer">{salaryTemplateCount} mẫu lương <ChevronRight /></button>} />

    <Block title="Thuế TNCN cho nhân viên" desc="Thiết lập quy định tính thuế TNCN cho nhân viên"
      right={<Toggle on={state.pit} onChange={state.setPit} />} last />
  </div>
)

/* ── Tài chính tab ─────────────────────────────────────────────────────────── */
const FinancialLineSettings = ({ lines, onChanged }: { lines: FinancialCustomLineRow[]; onChanged: () => void }) => {
  const [modal, setModal] = useState<{ group: FinancialLineGroupParam; line: FinancialCustomLineRow | null } | null>(null)

  const remove = async (line: FinancialCustomLineRow) => {
    if (!window.confirm(`Xóa danh mục "${line.name}"? Số liệu đã nhập cho danh mục này trên báo cáo cũng sẽ mất.`)) return
    try {
      await deleteFinancialCustomLine(line.id)
      onChanged()
    } catch {
      window.alert('Không thể xóa danh mục.')
    }
  }

  const LineTable = ({ group, title, last }: { group: FinancialLineGroupParam; title: string; last?: boolean }) => {
    const rows = lines.filter(l => l.group === group).sort((a, b) => a.sortOrder - b.sortOrder)
    return (
      <Block title={title} last={last}
        right={<button onClick={() => setModal({ group, line: null })} className="kv-btn kv-btn-outline-primary h-9">+ Thêm danh mục</button>}>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-fill text-sm font-semibold text-ink-subtle">
              <th className="text-left px-4 py-2 w-[4rem]">STT</th>
              <th className="text-left px-4 py-2">Tên danh mục</th>
              <th className="text-right px-4 py-2 w-[8rem]">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l, i) => (
              <tr key={l.id} className="border-b border-line">
                <td className="px-4 py-3 text-md text-ink">{i + 1}</td>
                <td className="px-4 py-3 text-md text-ink">{l.name}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-4 text-ink-muted">
                    <button onClick={() => setModal({ group, line: l })} className="hover:text-primary cursor-pointer" aria-label="Sửa"><PencilIcon /></button>
                    <button onClick={() => void remove(l)} className="hover:text-danger cursor-pointer" aria-label="Xóa"><TrashIcon /></button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-6 text-center text-md text-ink-subtle">Chưa có danh mục nào</td></tr>
            )}
          </tbody>
        </table>
      </Block>
    )
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-ink mb-2">Tài chính</h2>
      <LineTable group="EXPENSE" title="Danh mục chi phí" />
      <LineTable group="OTHER_INCOME" title="Danh mục thu nhập khác" last />

      {modal && (
        <FinancialCustomLineModal
          group={modal.group}
          line={modal.line}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); onChanged() }}
        />
      )}
    </div>
  )
}

export default SettingsPage
