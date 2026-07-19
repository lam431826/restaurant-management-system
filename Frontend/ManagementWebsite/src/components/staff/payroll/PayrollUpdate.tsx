import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  cancelPayslip, finalizeSheet, fmtDate, getSheet, listSheetPayslips, money, saveDraft,
  SHEET_STATUS_LABEL,
} from '../../../api/payroll'
import type { DraftRowPayload, PayrollSheetDto, PayslipRowDto } from '../../../api/payroll'

/* ─────────────────────────────────────────────────────────────────────────────
 * Cập nhật bảng tính lương — the editable payroll worksheet opened from the
 * "Xem bảng lương" action (?id=<sheetId>). One editable row per employee payslip.
 * Per SRS_PAY v1.2 the only components are Lương chính + Làm thêm giờ − Giảm trừ
 * (no commission / allowance / bonus). Editable only while the sheet is Draft.
 * ──────────────────────────────────────────────────────────────────────────── */

interface Row {
  id: string
  code: string
  empCode: string
  name: string
  hasMainSalary: boolean
  cancelled: boolean
  base: number
  overtime: number
  deduction: number
  paid: number
}

const toRow = (p: PayslipRowDto): Row => ({
  id: p.id,
  code: p.code,
  empCode: p.employeeCode,
  name: p.employeeName,
  hasMainSalary: p.salaryType !== null,
  cancelled: p.status === 'CANCELLED',
  base: p.mainSalary,
  overtime: p.overtimeSalary,
  deduction: p.deduction,
  paid: p.paidAmount,
})

const income = (r: Row) => r.base + r.overtime
const net = (r: Row) => income(r) - r.deduction
const remaining = (r: Row) => net(r) - r.paid

const errMsg = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback

/* ── icons ─────────────────────────────────────────────────────────────────── */
const ArrowLeft = () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>)
const SearchIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>)
const ChevronDown = () => (<svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-ink-muted"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>)
const SaveIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>)
const CheckIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>)
const MenuIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>)
const TrashIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>)
const InfoIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>)
const GearIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>)
const CloseIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>)

/* ── Chốt lương confirm popup (matches CancelPayrollModal's style in Payroll.tsx) ── */
const FinalizeConfirmModal = ({ code, busy, onClose, onConfirm }: { code: string; busy: boolean; onClose: () => void; onConfirm: () => void }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/50" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-[32rem] bg-card rounded-xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-xl font-bold text-ink">Chốt bảng lương</h2>
          <button onClick={onClose} aria-label="Đóng" className="w-8 h-8 flex items-center justify-center rounded-full text-ink-muted hover:bg-fill hover:text-ink cursor-pointer"><CloseIcon /></button>
        </div>
        <div className="px-6 py-3 text-md text-ink border-t border-line">
          Bạn có chắc chắn muốn chốt bảng lương <span className="font-semibold">{code}</span> không? Sau khi chốt, dữ liệu lương trong kỳ sẽ bị khóa và không thể chỉnh sửa.
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-line">
          <button onClick={onClose} disabled={busy} className="kv-btn kv-btn-outline-neutral h-10 bg-card">Bỏ qua</button>
          <button onClick={onConfirm} disabled={busy} className="kv-btn kv-btn-primary h-10">{busy ? 'Đang xử lý…' : 'Đồng ý'}</button>
        </div>
      </div>
    </div>
  )
}

const NumCell = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <input value={money(value)} onChange={e => onChange(parseInt(e.target.value.replace(/\D/g, '') || '0', 10))}
    className="w-[13rem] h-9 px-3 text-right bg-card border border-line-default rounded-md text-md text-ink focus:border-primary outline-none" />
)
const PlusCell = ({ title }: { title?: string }) => (
  <span title={title} className="w-9 h-9 inline-flex items-center justify-center rounded text-lg leading-none text-ink-muted" aria-label="Chưa thiết lập">+</span>
)

const PayrollUpdate = () => {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const sheetId = params.get('id')
  const [sheet, setSheet] = useState<PayrollSheetDto | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [confirmFinalize, setConfirmFinalize] = useState(false)

  const load = useCallback(async () => {
    if (!sheetId) { setLoading(false); return }
    setLoading(true)
    try {
      const [s, ps] = await Promise.all([getSheet(sheetId), listSheetPayslips(sheetId)])
      setSheet(s.data.data)
      setRows(ps.data.data.map(toRow))
      setTouched({})
    } catch (err) {
      setError(errMsg(err, 'Không thể tải bảng lương'))
    } finally {
      setLoading(false)
    }
  }, [sheetId])

  useEffect(() => { void load() }, [load])

  const editable = sheet?.status === 'DRAFT'

  const patch = (id: string, p: Partial<Row>) => {
    setRows(rs => rs.map(r => r.id === id ? { ...r, ...p } : r))
    setTouched(t => ({ ...t, [id]: true }))
    setNotice('')
  }

  const doSaveDraft = async () => {
    if (!sheetId) return
    const payload: DraftRowPayload[] = rows
      .filter(r => touched[r.id] && !r.cancelled)
      .map(r => ({ payslipId: r.id, mainSalary: r.base, overtimeSalary: r.overtime, deduction: r.deduction }))
    if (payload.length === 0) { setNotice('Không có thay đổi để lưu'); return }
    setBusy(true)
    setError('')
    try {
      await saveDraft(sheetId, payload)
      setTouched({})
      setNotice('Đã lưu tạm')
    } catch (err) {
      setError(errMsg(err, 'Không thể lưu tạm'))
    } finally {
      setBusy(false)
    }
  }

  const doFinalize = async () => {
    if (!sheetId || !sheet) return
    setBusy(true)
    setError('')
    try {
      const changed: DraftRowPayload[] = rows
        .filter(r => touched[r.id] && !r.cancelled)
        .map(r => ({ payslipId: r.id, mainSalary: r.base, overtimeSalary: r.overtime, deduction: r.deduction }))
      if (changed.length > 0) await saveDraft(sheetId, changed)
      await finalizeSheet(sheetId)
      navigate('/manager/payroll')
    } catch (err) {
      setError(errMsg(err, 'Không thể chốt lương'))
      setBusy(false)
      setConfirmFinalize(false)
    }
  }

  const doCancelPayslip = async (r: Row) => {
    if (!window.confirm(`Hủy phiếu lương của ${r.name} (${r.code})?`)) return
    setBusy(true)
    setError('')
    try {
      await cancelPayslip(r.id)
      await load()
    } catch (err) {
      setError(errMsg(err, 'Không thể hủy phiếu lương'))
    } finally {
      setBusy(false)
    }
  }

  const active = useMemo(() => rows.filter(r => !r.cancelled), [rows])
  const filtered = active.filter(r => !search.trim() || r.name.toLowerCase().includes(search.trim().toLowerCase()) || r.empCode.toLowerCase().includes(search.trim().toLowerCase()))
  const sum = (f: (r: Row) => number) => active.reduce((a, r) => a + f(r), 0)

  if (!sheetId) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-var(--kv-header-height))] gap-4">
        <div className="text-md text-ink-subtle">Không tìm thấy bảng lương. Mở từ danh sách Bảng lương.</div>
        <button onClick={() => navigate('/manager/payroll')} className="kv-btn kv-btn-primary h-10">Về danh sách bảng lương</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-var(--kv-header-height))] min-h-0">
      {/* ── header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-line bg-card">
        <button onClick={() => navigate('/manager/payroll')} className="w-9 h-9 flex items-center justify-center rounded-md text-ink-subtle hover:bg-fill hover:text-ink cursor-pointer" aria-label="Quay lại"><ArrowLeft /></button>
        <div className="whitespace-nowrap">
          <h1 className="text-lg font-bold text-ink">Cập nhật bảng tính lương</h1>
          {sheet && <div className="text-sm text-ink-subtle">{sheet.name} · {fmtDate(sheet.periodStart)} - {fmtDate(sheet.periodEnd)} · {SHEET_STATUS_LABEL[sheet.status]}</div>}
        </div>
        <div className="relative flex-1 max-w-[34rem]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2"><SearchIcon /></span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm nhân viên theo mã hoặc tên"
            className="w-full h-10 pl-9 pr-9 bg-card border border-line-default rounded-md text-md text-ink placeholder:text-ink-muted focus:border-primary outline-none" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"><ChevronDown /></span>
        </div>
        <div className="flex-1" />
        {editable && <button onClick={() => void doSaveDraft()} disabled={busy} className="kv-btn kv-btn-outline-neutral h-10 bg-card"><SaveIcon /> Lưu tạm</button>}
        {sheet?.status === 'FINALIZED' && <button onClick={() => navigate('/manager/payroll')} className="kv-btn kv-btn-outline-primary h-10">Thanh toán tại danh sách</button>}
        {editable && <button onClick={() => setConfirmFinalize(true)} disabled={busy} className="kv-btn kv-btn-primary h-10"><CheckIcon /> Chốt lương</button>}
        <button className="w-10 h-10 flex items-center justify-center border border-line-default rounded-md bg-card text-ink cursor-pointer hover:border-line-strong" aria-label="Menu"><MenuIcon /></button>
      </div>

      {(error || notice) && (
        <div className={`px-6 py-2 text-sm ${error ? 'text-danger' : 'text-primary'}`}>{error || notice}</div>
      )}

      {/* ── table ──────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto bg-card">
        <table className="w-full border-collapse min-w-[110rem]">
          <thead>
            <tr className="bg-primary-25 text-sm font-semibold text-ink-subtle">
              <th className="sticky top-0 bg-primary-25 px-3 py-3 w-[3rem]" />
              <th className="sticky top-0 bg-primary-25 px-3 py-3 w-[4rem] text-left">STT</th>
              <th className="sticky top-0 bg-primary-25 px-3 py-3 text-left w-[16rem]">Tên nhân viên</th>
              <th className="sticky top-0 bg-primary-25 px-3 py-3 text-right">Lương chính</th>
              <th className="sticky top-0 bg-primary-25 px-3 py-3 text-right">Làm thêm giờ</th>
              <th className="sticky top-0 bg-primary-25 px-3 py-3 text-right">Tổng thu nhập</th>
              <th className="sticky top-0 bg-primary-25 px-3 py-3 text-right">Giảm trừ</th>
              <th className="sticky top-0 bg-primary-25 px-3 py-3 text-right"><span className="inline-flex items-center gap-1 justify-end">Lương thực nhận <InfoIcon /></span></th>
              <th className="sticky top-0 bg-primary-25 px-3 py-3 text-right">Đã trả</th>
              <th className="sticky top-0 bg-primary-25 px-3 py-3 text-right">Còn cần trả</th>
            </tr>
            {/* totals row */}
            <tr className="border-b border-line text-md font-bold text-ink">
              <td className="px-3 py-3" colSpan={3} />
              <td className="px-3 py-3 text-right">{money(sum(r => r.base))}</td>
              <td className="px-3 py-3 text-right">{money(sum(r => r.overtime))}</td>
              <td className="px-3 py-3 text-right">{money(sum(income))}</td>
              <td className="px-3 py-3 text-right">{money(sum(r => r.deduction))}</td>
              <td className="px-3 py-3 text-right">{money(sum(net))}</td>
              <td className="px-3 py-3 text-right">{money(sum(r => r.paid))}</td>
              <td className="px-3 py-3 text-right">{money(sum(remaining))}</td>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={r.id} className="border-b border-line hover:bg-[var(--kv-state-hover-bg)]">
                <td className="px-3 py-4 text-center">
                  {editable && r.paid === 0 && (
                    <button onClick={() => void doCancelPayslip(r)} disabled={busy} className="w-9 h-9 flex items-center justify-center mx-auto rounded-md text-ink-muted hover:text-danger hover:bg-danger-50 cursor-pointer" aria-label="Hủy phiếu lương"><TrashIcon /></button>
                  )}
                </td>
                <td className="px-3 py-4 text-md text-ink">{i + 1}</td>
                <td className="px-3 py-4">
                  <div className="text-md text-primary cursor-pointer hover:underline">{r.name}</div>
                  <div className="text-sm text-ink-subtle">{r.empCode} · {r.code}</div>
                </td>
                <td className="px-3 py-4 text-right">
                  {!r.hasMainSalary && r.base === 0
                    ? <PlusCell title="Nhân viên chưa được thiết lập lương" />
                    : editable
                      ? <NumCell value={r.base} onChange={v => patch(r.id, { base: v })} />
                      : <span className="text-md text-ink">{money(r.base)}</span>}
                </td>
                <td className="px-3 py-4 text-right">
                  {editable
                    ? <NumCell value={r.overtime} onChange={v => patch(r.id, { overtime: v })} />
                    : <span className="text-md text-ink">{money(r.overtime)}</span>}
                </td>
                <td className="px-3 py-4 text-md text-ink text-right">{money(income(r))}</td>
                <td className="px-3 py-4 text-right">
                  {editable
                    ? <NumCell value={r.deduction} onChange={v => patch(r.id, { deduction: v })} />
                    : <span className="text-md text-ink">{money(r.deduction)}</span>}
                </td>
                <td className="px-3 py-4 text-md text-ink text-right">{money(net(r))}</td>
                <td className="px-3 py-4 text-md text-ink text-right">{money(r.paid)}</td>
                <td className="px-3 py-4 text-md text-ink text-right">{money(remaining(r))}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-16 text-center text-md text-ink-subtle">{loading ? 'Đang tải…' : 'Không có nhân viên phù hợp'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* floating Khởi tạo */}
      <button className="fixed right-6 bottom-6 flex items-center gap-2 h-11 px-4 rounded-full bg-primary text-white text-md font-medium shadow-md hover:bg-primary-600 cursor-pointer z-[var(--kv-z-dropdown)]">
        <GearIcon /> Khởi tạo
      </button>

      {confirmFinalize && sheet && (
        <FinalizeConfirmModal code={sheet.code} busy={busy} onClose={() => setConfirmFinalize(false)} onConfirm={() => void doFinalize()} />
      )}
    </div>
  )
}

export default PayrollUpdate
