import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  cancelPayslip, cancelSheet, createSheet, fmtDate, fmtDateTime, getPayslip,
  listSheetPayments, listSheetPayslips, listSheets, money, paySheet, reloadSheet,
  toIsoDate,
  ATTENDANCE_STATUS_LABEL, METHOD_LABEL, PAYSLIP_PAYMENT_STATUS_LABEL, SALARY_TYPE_LABEL, SCOPE_LABEL, SHEET_STATUS_LABEL, TERM_LABEL,
} from '../../../api/payroll'
import type {
  CreateSheetPayload, PaymentDto, PayrollSheetDto, PayrollSheetStatus, PayrollTerm,
  PayslipDetailDto, PayslipRowDto, ReloadMode, SalaryPaymentMethod,
} from '../../../api/payroll'
import { listEmployees, toEmployee } from '../../../api/employees'
import type { Employee } from '../../../data/mockData'

/* ─────────────────────────────────────────────────────────────────────────────
 * Bảng lương (Payroll) — KiotViet-style screen, wired to /api/payroll.
 * Left filter rail + payroll table with an expandable detail (Thông tin /
 * Phiếu lương / Lịch sử thanh toán), a payment modal and an individual payslip.
 * ──────────────────────────────────────────────────────────────────────────── */

const STATUS_FILTERS: PayrollSheetStatus[] = ['GENERATING', 'DRAFT', 'FINALIZED', 'CANCELLED']
const TERM_PLACEHOLDER = 'Chọn kỳ hạn trả lương'
const TERM_OPTIONS = [TERM_PLACEHOLDER, TERM_LABEL.MONTHLY, TERM_LABEL.CUSTOM]
const DEFAULT_SORT = 'createdAt,desc'
type SortDir = 'asc' | 'desc'

const errMsg = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback

const periodLabel = (p: PayrollSheetDto) => `${fmtDate(p.periodStart)} - ${fmtDate(p.periodEnd)}`

/** Client-side CSV export of one payroll sheet's payslips (BOM so Excel renders Vietnamese correctly). */
const exportSheetCsv = (payroll: PayrollSheetDto, payslips: PayslipRowDto[]) => {
  const header = ['Mã phiếu', 'Mã nhân viên', 'Tên nhân viên', 'Lương chính', 'Lương làm thêm giờ', 'Giảm trừ', 'Tổng lương', 'Đã trả nhân viên', 'Còn cần trả', 'Trạng thái']
  const rows = payslips.map(s => [
    s.code, s.employeeCode, s.employeeName, s.mainSalary, s.overtimeSalary, s.deduction, s.total, s.paidAmount, s.remaining,
    s.status === 'CANCELLED' ? 'Đã hủy' : PAYSLIP_PAYMENT_STATUS_LABEL[s.paymentStatus],
  ])
  const csv = [header, ...rows]
    .map(line => line.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `bang-luong-${payroll.code}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

interface Col { key: string; label: string; align?: 'right'; sum?: boolean; render: (p: PayrollSheetDto) => React.ReactNode }
const ALL_COLUMNS: Col[] = [
  { key: 'code', label: 'Mã', render: p => p.code },
  { key: 'name', label: 'Tên', render: p => p.name },
  { key: 'term', label: 'Kỳ hạn trả', render: p => TERM_LABEL[p.term] },
  { key: 'period', label: 'Kỳ làm việc', render: p => <span className="whitespace-nowrap">{periodLabel(p)}</span> },
  { key: 'employeeCount', label: 'Số nhân viên', align: 'right', render: p => p.employeeCount },
  { key: 'total', label: 'Tổng lương', align: 'right', sum: true, render: p => money(p.total) },
  { key: 'paid', label: 'Đã trả nhân viên', align: 'right', sum: true, render: p => money(p.paid) },
  { key: 'remaining', label: 'Còn cần trả', align: 'right', sum: true, render: p => money(p.remaining) },
  { key: 'status', label: 'Trạng thái', render: p => SHEET_STATUS_LABEL[p.status] },
  { key: 'createdBy', label: 'Người tạo', render: p => p.createdBy || '' },
  { key: 'preparedBy', label: 'Người lập bảng', render: p => p.createdBy || '' },
  { key: 'createdAt', label: 'Ngày tạo', render: p => fmtDateTime(p.createdAt) },
  { key: 'note', label: 'Ghi chú', render: p => p.note || '' },
]
const DEFAULT_VISIBLE: Record<string, boolean> = {
  code: true, name: true, term: true, period: true, employeeCount: false,
  total: true, paid: true, remaining: true, status: true,
  createdBy: false, preparedBy: false, createdAt: false, note: false,
}

/* ── icons ─────────────────────────────────────────────────────────────────── */
const SearchIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>)
const SlidersIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted"><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></svg>)
const ExportIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>)
const ColumnsIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>)
const ChevronDown = () => (<svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-ink-muted shrink-0"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>)
const RefreshIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>)
const CalcIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="10" x2="8" y2="10" /><line x1="12" y1="10" x2="12" y2="10" /><line x1="16" y1="10" x2="16" y2="10" /><line x1="8" y1="14" x2="8" y2="14" /><line x1="12" y1="14" x2="12" y2="14" /><line x1="16" y1="14" x2="16" y2="18" /><line x1="8" y1="18" x2="12" y2="18" /></svg>)
const CloseIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>)
const TrashIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>)
const CalendarIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>)
const InfoIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>)
const CheckIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><polyline points="20 6 9 17 4 12" /></svg>)
const SortArrow = ({ active, dir }: { active: boolean; dir: SortDir }) => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="none"
    className={`inline shrink-0 transition-transform ${active ? 'text-primary' : 'opacity-35'} ${active && dir === 'desc' ? 'rotate-180' : ''}`}>
    <path d="M8 3v10M4.5 6.5L8 3l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/* read-only labelled field used in the "Thông tin" tab */
const FieldRO = ({ label, value, placeholder }: { label: string; value?: string; placeholder?: boolean }) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-sm text-ink-subtle">{label}</span>
    <span className={`text-md border-b border-line pb-2 min-h-[1.6rem] ${placeholder ? 'text-ink-muted italic' : 'text-ink'}`}>{value || ' '}</span>
  </div>
)

interface SheetDetailData { payslips: PayslipRowDto[]; payments: PaymentDto[] }

const Payroll = () => {
  const navigate = useNavigate()
  const [term, setTerm] = useState(TERM_OPTIONS[0])
  const [termOpen, setTermOpen] = useState(false)
  const termRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState<Record<string, boolean>>(DEFAULT_VISIBLE)
  const [colsOpen, setColsOpen] = useState(false)
  const colsRef = useRef<HTMLDivElement>(null)
  const visibleCols = ALL_COLUMNS.filter(c => visible[c.key])
  const [statuses, setStatuses] = useState<Record<PayrollSheetStatus, boolean>>({ GENERATING: true, DRAFT: true, FINALIZED: true, CANCELLED: false })
  const [search, setSearch] = useState('')
  const [size, setSize] = useState(15)
  const [sortKey, setSortKey] = useState<'code' | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [rows, setRows] = useState<PayrollSheetDto[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [detailTab, setDetailTab] = useState<'info' | 'payslips' | 'history'>('info')
  const [details, setDetails] = useState<Record<string, SheetDetailData>>({})
  const [payModal, setPayModal] = useState<PayrollSheetDto | null>(null)
  const [payslipModal, setPayslipModal] = useState<{ id: string } | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const fetchSheets = useCallback(async () => {
    setLoading(true)
    try {
      const selected = STATUS_FILTERS.filter(s => statuses[s])
      const res = await listSheets({
        search: search.trim() || undefined,
        term: term === TERM_LABEL.MONTHLY ? 'MONTHLY' : term === TERM_LABEL.CUSTOM ? 'CUSTOM' : undefined,
        statuses: selected.length ? selected : undefined,
        size,
        sort: sortKey ? `${sortKey},${sortDir}` : DEFAULT_SORT,
      })
      setRows(res.data.data)
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [search, term, statuses, size, sortKey, sortDir])

  useEffect(() => {
    const t = setTimeout(fetchSheets, search ? 350 : 0)
    return () => clearTimeout(t)
  }, [fetchSheets, search])

  const fetchDetail = useCallback(async (sheetId: string) => {
    try {
      const [ps, pm] = await Promise.all([listSheetPayslips(sheetId), listSheetPayments(sheetId)])
      setDetails(d => ({ ...d, [sheetId]: { payslips: ps.data.data, payments: pm.data.data } }))
    } catch {
      /* keep previous detail on failure */
    }
  }, [])

  useEffect(() => {
    if (expanded && !details[expanded]) void fetchDetail(expanded)
  }, [expanded, details, fetchDetail])

  /** Refresh the list plus the detail of one sheet (after mutations). */
  const refresh = useCallback(async (sheetId?: string) => {
    await fetchSheets()
    if (sheetId) await fetchDetail(sheetId)
  }, [fetchSheets, fetchDetail])

  const toggleStatus = (s: PayrollSheetStatus) => setStatuses(m => ({ ...m, [s]: !m[s] }))

  const handleSort = (key: 'code') => {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc') }
    else if (sortDir === 'asc') setSortDir('desc')
    else setSortKey(null)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-var(--kv-header-height))] min-h-0 pt-4 pb-4 px-6">
      <h1 className="text-h3 font-extrabold text-ink mb-4">Bảng lương</h1>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* ── left filter rail ─────────────────────────────────────────── */}
        <aside className="w-[28rem] shrink-0 overflow-y-auto">
          <div className="bg-card border border-line rounded-lg p-4 flex flex-col gap-5">
            <div>
              <div className="text-md font-bold text-ink mb-2">Kỳ hạn trả lương</div>
              <div ref={termRef} className="relative">
                <button onClick={() => setTermOpen(o => !o)} className={`flex items-center justify-between gap-2 w-full h-10 px-3 bg-card border rounded-md cursor-pointer transition-colors ${termOpen ? 'border-primary' : 'border-line-default hover:border-line-strong'}`}>
                  <span className="text-md truncate text-ink">{term}</span>
                  <ChevronDown />
                </button>
                {termOpen && (
                  <div className="absolute left-0 right-0 top-[calc(100%+0.3rem)] bg-card border border-line-default rounded-md shadow-md z-[var(--kv-z-dropdown)] py-1">
                    {TERM_OPTIONS.map(o => (
                      <button key={o} onClick={() => { setTerm(o); setTermOpen(false) }} className="flex items-center justify-between w-full text-left px-3 py-2 text-md text-ink cursor-pointer hover:bg-[var(--kv-state-hover-bg)]">
                        {o}{term === o && <CheckIcon />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="text-md font-bold text-ink mb-2">Trạng thái</div>
              <div className="flex flex-col gap-2.5">
                {STATUS_FILTERS.map(s => (
                  <label key={s} className="flex items-center gap-2.5 cursor-pointer text-md text-ink">
                    <input type="checkbox" checked={statuses[s]} onChange={() => toggleStatus(s)} className="accent-primary w-4 h-4" />
                    {SHEET_STATUS_LABEL[s]}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* ── main ─────────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          {/* toolbar */}
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex-1 max-w-[34rem]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2"><SearchIcon /></span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Theo mã, tên bảng lương, nhân viên"
                className="w-full h-10 pl-9 pr-10 bg-card border border-line-default rounded-md text-md text-ink placeholder:text-ink-muted focus:border-primary outline-none" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"><SlidersIcon /></span>
            </div>
            <div className="flex-1" />
            <button onClick={() => setAddOpen(true)} className="kv-btn kv-btn-outline-primary h-10"><span className="text-lg leading-none">+</span> Bảng tính lương</button>
            <button className="kv-btn kv-btn-outline-neutral h-10 bg-card"><ExportIcon /> Xuất file</button>
            <div ref={colsRef} className="relative">
              <button onClick={() => setColsOpen(o => !o)} className="w-10 h-10 flex items-center justify-center border border-line-default rounded-md bg-card text-ink cursor-pointer hover:border-line-strong" aria-label="Ẩn/hiện cột"><ColumnsIcon /></button>
              {colsOpen && (
                <div className="absolute right-0 top-[calc(100%+0.4rem)] w-[26rem] bg-card border border-line-default rounded-md shadow-md z-[var(--kv-z-dropdown)] p-4">
                  <div className="grid grid-flow-col grid-rows-7 grid-cols-2 gap-x-8 gap-y-3">
                    {ALL_COLUMNS.map(c => (
                      <label key={c.key} className="flex items-center gap-2.5 cursor-pointer text-md text-ink">
                        <input type="checkbox" checked={!!visible[c.key]} onChange={() => setVisible(v => ({ ...v, [c.key]: !v[c.key] }))} className="accent-primary w-4 h-4" />
                        {c.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* table */}
          <div className="flex-1 min-h-0 overflow-auto bg-card border border-line rounded-lg">
            <table className="w-full border-collapse min-w-[70rem]">
              <thead>
                <tr className="bg-primary-25 text-sm font-semibold text-ink-subtle">
                  <th className="sticky top-0 bg-primary-25 px-4 py-3 w-[3rem] text-left"><input type="checkbox" className="accent-primary w-4 h-4" /></th>
                  {visibleCols.map(c => (
                    <th key={c.key} className={`sticky top-0 bg-primary-25 px-4 py-3 ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                      {c.key === 'code' ? (
                        <button className="inline-flex items-center gap-1 cursor-pointer select-none hover:text-primary" onClick={() => handleSort('code')}>
                          {c.label} <SortArrow active={sortKey === 'code'} dir={sortDir} />
                        </button>
                      ) : c.label}
                    </th>
                  ))}
                </tr>
                <tr className="border-b border-line text-md text-ink font-semibold">
                  <td className="px-4 py-2.5" />
                  {visibleCols.map(c => (
                    <td key={c.key} className={`px-4 py-2.5 ${c.align === 'right' ? 'text-right' : ''}`}>
                      {c.sum ? money(rows.reduce((a, r) => a + (r[c.key as 'total' | 'paid' | 'remaining'] as number), 0)) : ''}
                    </td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(p => {
                  const open = expanded === p.id
                  return (
                    <Fragment key={p.id}>
                      <tr onClick={() => { setExpanded(open ? null : p.id); if (!open) setDetailTab('info') }}
                        className={`cursor-pointer border-b border-line ${open ? 'bg-fill' : 'hover:bg-[var(--kv-state-hover-bg)]'}`}>
                        <td className="px-4 py-4" onClick={e => e.stopPropagation()}><input type="checkbox" className="accent-primary w-4 h-4" /></td>
                        {visibleCols.map(c => (
                          <td key={c.key} className={`px-4 py-4 text-md text-ink ${c.align === 'right' ? 'text-right' : ''}`}>{c.render(p)}</td>
                        ))}
                      </tr>
                      {open && (
                        <tr className="border-b-2 border-primary">
                          <td colSpan={visibleCols.length + 1} className="p-0">
                            <PayrollDetail payroll={p} detail={details[p.id]} tab={detailTab} setTab={setDetailTab}
                              onPay={() => setPayModal(p)} onOpenPayslip={id => setPayslipModal({ id })}
                              onView={() => navigate(`/manager/payroll/update?id=${p.id}`)}
                              onCancelled={() => { setExpanded(null); void refresh() }}
                              onReloaded={() => void refresh(p.id)} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
                {rows.length === 0 && (
                  <tr><td colSpan={visibleCols.length + 1} className="px-4 py-16 text-center text-md text-ink-subtle">
                    {loading ? 'Đang tải…' : 'Không có bảng lương phù hợp'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* footer */}
          <div className="flex items-center gap-3 mt-3 text-md text-ink-subtle">
            Hiển thị
            <div className="relative">
              <select value={size} onChange={e => setSize(parseInt(e.target.value, 10))} className="h-9 pl-3 pr-8 bg-card border border-line-default rounded-md text-md text-ink appearance-none cursor-pointer outline-none focus:border-primary">
                <option value={15}>15 bản ghi</option><option value={30}>30 bản ghi</option><option value={50}>50 bản ghi</option>
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"><ChevronDown /></span>
            </div>
          </div>
        </div>
      </div>

      {addOpen && <AddPayrollModal onClose={() => setAddOpen(false)} onCreated={sheet => { setAddOpen(false); setExpanded(sheet.id); void refresh(sheet.id) }} />}
      {payModal && <PaymentModal payroll={payModal} payslips={(details[payModal.id]?.payslips ?? []).filter(s => s.status === 'ACTIVE' && s.remaining > 0)}
        onClose={() => setPayModal(null)} onDone={() => { const id = payModal.id; setPayModal(null); void refresh(id) }} />}
      {payslipModal && <PayslipModal payslipId={payslipModal.id} onClose={() => setPayslipModal(null)}
        onChanged={sheetId => { setPayslipModal(null); void refresh(sheetId) }} />}
    </div>
  )
}

/* ── expandable detail ─────────────────────────────────────────────────────── */
const PayrollDetail = ({ payroll, detail, tab, setTab, onPay, onOpenPayslip, onView, onCancelled, onReloaded }: {
  payroll: PayrollSheetDto; detail?: SheetDetailData
  tab: 'info' | 'payslips' | 'history'; setTab: (t: 'info' | 'payslips' | 'history') => void
  onPay: () => void; onOpenPayslip: (payslipId: string) => void; onView: () => void
  onCancelled: () => void; onReloaded: () => void
}) => {
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [reloadOpen, setReloadOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const reloadRef = useRef<HTMLDivElement>(null)
  const isDraft = payroll.status === 'DRAFT'
  const canRefreshData = payroll.status === 'DRAFT' || payroll.status === 'GENERATING'
  const payslips = detail?.payslips ?? []
  const payments = detail?.payments ?? []

  useEffect(() => {
    const h = (e: MouseEvent) => { if (reloadRef.current && !reloadRef.current.contains(e.target as Node)) setReloadOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const doCancel = async () => {
    setBusy(true)
    setError('')
    try {
      await cancelSheet(payroll.id)
      setConfirmCancel(false)
      onCancelled()
    } catch (err) {
      setError(errMsg(err, 'Không thể hủy bảng lương'))
      setConfirmCancel(false)
    } finally {
      setBusy(false)
    }
  }

  const doReload = async (mode: ReloadMode) => {
    setReloadOpen(false)
    setBusy(true)
    setError('')
    try {
      await reloadSheet(payroll.id, mode)
      onReloaded()
    } catch (err) {
      setError(errMsg(err, 'Không thể tải lại dữ liệu'))
    } finally {
      setBusy(false)
    }
  }

  return (
  <div className="bg-card px-6 py-5">
    {/* tabs */}
    <div className="flex items-center gap-7 border-b border-line">
      {([['info', 'Thông tin'], ['payslips', 'Phiếu lương'], ['history', 'Lịch sử thanh toán']] as const).map(([id, label]) => (
        <button key={id} onClick={() => setTab(id)} className={`relative pb-3 pt-1 text-md cursor-pointer ${tab === id ? 'text-primary font-semibold' : 'text-ink-subtle hover:text-ink'}`}>
          {label}{tab === id && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary rounded-full" />}
        </button>
      ))}
    </div>

    {error && <div className="mt-3 text-sm text-danger">{error}</div>}

    {tab === 'info' && (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-5 py-5">
          <FieldRO label="Mã:" value={payroll.code} />
          <FieldRO label="Tên:" value={payroll.name} />
          <FieldRO label="Kỳ hạn trả:" value={TERM_LABEL[payroll.term]} />
          <FieldRO label="Kỳ làm việc:" value={periodLabel(payroll)} />
          <FieldRO label="Ngày tạo:" value={fmtDateTime(payroll.createdAt)} />
          <FieldRO label="Người tạo:" value={payroll.createdBy || ''} />
          <FieldRO label="Người lập bảng:" value={payroll.createdBy || ''} />
          <FieldRO label="Trạng thái:" value={SHEET_STATUS_LABEL[payroll.status]} />
          <FieldRO label="Tổng số nhân viên:" value={String(payroll.employeeCount)} />
          <FieldRO label="Tổng lương:" value={money(payroll.total)} />
          <FieldRO label="Đã trả nhân viên:" value={money(payroll.paid)} />
          <FieldRO label="Còn cần trả:" value={money(payroll.remaining)} />
          <FieldRO label="Phạm vi áp dụng:" value={SCOPE_LABEL[payroll.scope]} />
          <FieldRO label="Người chốt lương:" value={payroll.finalizedBy || ''} />
          <div className="lg:col-span-2 flex flex-col gap-1.5">
            <span className="text-sm text-ink-subtle">&nbsp;</span>
            <div className="min-h-[6rem] p-3 border border-line rounded-md text-md text-ink-muted italic">{payroll.note || 'Ghi chú...'}</div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
          {isDraft
            ? <button onClick={() => setConfirmCancel(true)} disabled={busy} className="flex items-center gap-1.5 text-md text-ink-subtle hover:text-danger cursor-pointer"><TrashIcon /> Hủy bỏ</button>
            : <span />}
          <div className="flex items-center gap-2 text-sm text-ink-subtle">
            Dữ liệu được cập nhật vào: <span className="font-semibold text-ink">{fmtDateTime(payroll.dataRefreshedAt) || '—'}</span> <InfoIcon />
            {canRefreshData && (
              <div ref={reloadRef} className="relative ml-2">
                <button onClick={() => setReloadOpen(o => !o)} disabled={busy} className="kv-btn kv-btn-outline-neutral h-9 bg-card"><RefreshIcon /> {busy ? 'Đang xử lý…' : 'Cập nhật dữ liệu'}</button>
                {reloadOpen && (
                  <div className="absolute right-0 top-[calc(100%+0.3rem)] w-[24rem] bg-card border border-line-default rounded-md shadow-md z-[var(--kv-z-dropdown)] py-1">
                    <button onClick={() => void doReload('FULL')} className="w-full text-left px-3 py-2.5 text-md text-ink cursor-pointer hover:bg-[var(--kv-state-hover-bg)]">Tải lại toàn bộ</button>
                    <button onClick={() => void doReload('BY_WORKDAY')} className="w-full text-left px-3 py-2.5 text-md text-ink cursor-pointer hover:bg-[var(--kv-state-hover-bg)]">Chỉ cập nhật theo ngày làm việc</button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onView} className="kv-btn kv-btn-primary h-9"><CheckIcon /> Xem bảng lương</button>
            <button onClick={() => exportSheetCsv(payroll, payslips)} className="kv-btn kv-btn-outline-neutral h-9 bg-card"><ExportIcon /> Xuất file</button>
          </div>
        </div>
      </>
    )}

    {tab === 'payslips' && (
      <div className="py-5">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-fill text-sm font-semibold text-ink-subtle">
              <th className="px-4 py-3 w-[3rem] text-left"><input type="checkbox" className="accent-primary w-4 h-4" /></th>
              <th className="px-4 py-3 text-left">Mã phiếu</th>
              <th className="px-4 py-3 text-left">Tên nhân viên</th>
              <th className="px-4 py-3 text-right">Tổng lương</th>
              <th className="px-4 py-3 text-right">Đã trả NV</th>
              <th className="px-4 py-3 text-right">Còn cần trả</th>
              <th className="px-4 py-3 text-left">Trạng thái</th>
            </tr>
            <tr className="border-b border-line text-md font-semibold text-ink">
              <td className="px-4 py-2.5" colSpan={3} />
              <td className="px-4 py-2.5 text-right">{money(payslips.filter(s => s.status === 'ACTIVE').reduce((a, s) => a + s.total, 0))}</td>
              <td className="px-4 py-2.5 text-right">{money(payslips.filter(s => s.status === 'ACTIVE').reduce((a, s) => a + s.paidAmount, 0))}</td>
              <td className="px-4 py-2.5 text-right">{money(payslips.filter(s => s.status === 'ACTIVE').reduce((a, s) => a + s.remaining, 0))}</td>
              <td className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {payslips.map(s => (
              <tr key={s.id} className={`border-b border-line hover:bg-[var(--kv-state-hover-bg)] ${s.status === 'CANCELLED' ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3.5"><input type="checkbox" className="accent-primary w-4 h-4" /></td>
                <td className="px-4 py-3.5"><button onClick={() => onOpenPayslip(s.id)} className="text-md text-primary hover:underline cursor-pointer">{s.code}</button></td>
                <td className="px-4 py-3.5"><button onClick={() => onOpenPayslip(s.id)} className="text-md text-primary hover:underline cursor-pointer">{s.employeeName}</button></td>
                <td className="px-4 py-3.5 text-md text-ink text-right">{money(s.total)}</td>
                <td className="px-4 py-3.5 text-md text-ink text-right">{money(s.paidAmount)}</td>
                <td className="px-4 py-3.5 text-md text-ink text-right">{money(s.remaining)}</td>
                <td className="px-4 py-3.5 text-md text-ink">{s.status === 'CANCELLED' ? 'Đã hủy' : ''}</td>
              </tr>
            ))}
            {payslips.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-md text-ink-subtle">{detail ? 'Chưa có phiếu lương' : 'Đang tải…'}</td></tr>
            )}
          </tbody>
        </table>
        {payroll.status === 'FINALIZED' && payroll.remaining > 0 && (
          <div className="flex justify-end mt-4">
            <button onClick={onPay} className="kv-btn kv-btn-primary h-10"><CalcIcon /> Thanh toán</button>
          </div>
        )}
      </div>
    )}

    {tab === 'history' && (
      payments.length === 0
        ? <div className="py-12 text-center text-md text-ink-subtle">{detail ? 'Chưa có lịch sử thanh toán' : 'Đang tải…'}</div>
        : (
          <div className="py-5">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-fill text-sm font-semibold text-ink-subtle">
                  <th className="px-4 py-3 text-left">Mã phiếu chi</th>
                  <th className="px-4 py-3 text-left">Phiếu lương</th>
                  <th className="px-4 py-3 text-left">Nhân viên</th>
                  <th className="px-4 py-3 text-left">Thời gian</th>
                  <th className="px-4 py-3 text-left">Phương thức</th>
                  <th className="px-4 py-3 text-right">Tiền trả</th>
                  <th className="px-4 py-3 text-left">Người tạo</th>
                  <th className="px-4 py-3 text-left">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} className="border-b border-line hover:bg-[var(--kv-state-hover-bg)]">
                    <td className="px-4 py-3.5 text-md text-primary">{p.voucherCode}</td>
                    <td className="px-4 py-3.5 text-md text-ink">{p.payslipCode}</td>
                    <td className="px-4 py-3.5 text-md text-ink">{p.employeeName}</td>
                    <td className="px-4 py-3.5 text-md text-ink whitespace-nowrap">{fmtDateTime(p.paidAt)}</td>
                    <td className="px-4 py-3.5 text-md text-ink">{METHOD_LABEL[p.method]}</td>
                    <td className="px-4 py-3.5 text-md text-ink text-right">{money(p.amount)}</td>
                    <td className="px-4 py-3.5 text-md text-ink">{p.createdBy || ''}</td>
                    <td className="px-4 py-3.5 text-md text-ink">{p.note || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
    )}

    {confirmCancel && <CancelPayrollModal code={payroll.code} onClose={() => setConfirmCancel(false)} onConfirm={() => void doCancel()} />}
  </div>
  )
}

/* ── Hủy bỏ bảng lương confirm ─────────────────────────────────────────────── */
const CancelPayrollModal = ({ code, onClose, onConfirm }: { code: string; onClose: () => void; onConfirm: () => void }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/50" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-[30rem] bg-card rounded-xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-xl font-bold text-ink">Hủy bỏ bảng lương</h2>
          <button onClick={onClose} aria-label="Đóng" className="w-8 h-8 flex items-center justify-center rounded-full text-ink-muted hover:bg-fill hover:text-ink cursor-pointer"><CloseIcon /></button>
        </div>
        <div className="px-6 py-3 text-md text-ink border-t border-line">
          Bạn có chắc chắn muốn hủy bảng lương <span className="font-semibold">{code}</span> này không?
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-line">
          <button onClick={onClose} className="kv-btn kv-btn-outline-neutral h-10 bg-card">Bỏ qua</button>
          <button onClick={onConfirm} className="kv-btn kv-btn-primary h-10">Đồng ý</button>
        </div>
      </div>
    </div>
  )
}

/* ── Thanh toán bảng lương modal ───────────────────────────────────────────── */
const nowLocalInput = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** "dd/MM/yyyy HH:mm" → ISO "yyyy-MM-ddTHH:mm:00" */
const parsePaidAt = (s: string): string | null => {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/)
  if (!m) return null
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}T${m[4].padStart(2, '0')}:${m[5]}:00`
}

const PaymentModal = ({ payroll, payslips, onClose, onDone }: {
  payroll: PayrollSheetDto; payslips: PayslipRowDto[]; onClose: () => void; onDone: () => void
}) => {
  const [rows, setRows] = useState(payslips.map(s => ({ ...s, pay: s.remaining })))
  const [checked, setChecked] = useState<Record<string, boolean>>(Object.fromEntries(payslips.map(s => [s.id, true])))
  const [paidAt, setPaidAt] = useState(nowLocalInput())
  const [method, setMethod] = useState<SalaryPaymentMethod>('CASH')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const total = rows.filter(r => checked[r.id]).reduce((a, r) => a + r.pay, 0)

  const submit = async () => {
    const iso = parsePaidAt(paidAt)
    if (!iso) { setError('Thời gian không hợp lệ (dd/MM/yyyy HH:mm)'); return }
    const items = rows.filter(r => checked[r.id] && r.pay > 0).map(r => ({ payslipId: r.id, amount: r.pay }))
    if (items.length === 0) { setError('Chọn ít nhất một phiếu lương với số tiền lớn hơn 0'); return }
    setSaving(true)
    setError('')
    try {
      await paySheet(payroll.id, { paidAt: iso, method, note: note.trim() || undefined, items })
      onDone()
    } catch (err) {
      setError(errMsg(err, 'Không thể tạo phiếu chi'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center p-4 overflow-y-auto bg-black/50" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-[64rem] my-[5vh] bg-card rounded-xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-xl font-bold text-ink">Thanh toán bảng lương</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-ink-muted hover:bg-fill hover:text-ink cursor-pointer"><CloseIcon /></button>
        </div>
        <div className="px-6 text-sm text-ink-subtle">{payroll.name} | Kỳ làm việc: {periodLabel(payroll)} | Trạng thái: {SHEET_STATUS_LABEL[payroll.status]}</div>

        <div className="px-6 py-4 grid grid-cols-2 gap-x-8 gap-y-3">
          <div className="flex items-center gap-3"><span className="w-[9rem] text-md text-ink">Tiền trả nhân viên</span><span className="text-md font-bold text-ink">{money(total)}</span></div>
          <div className="flex items-center gap-3">
            <span className="w-[7rem] text-md text-ink">Thời gian</span>
            <div className="relative flex-1">
              <input value={paidAt} onChange={e => setPaidAt(e.target.value)} className="w-full h-10 pl-3 pr-9 bg-card border border-line-default rounded-md text-md text-ink focus:border-primary outline-none" />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"><CalendarIcon /></span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-[9rem] text-md text-ink">Phương thức</span>
            <div className="relative flex-1">
              <select value={method} onChange={e => setMethod(e.target.value as SalaryPaymentMethod)} className="w-full h-10 pl-3 pr-9 bg-card border border-line-default rounded-md text-md text-ink appearance-none cursor-pointer focus:border-primary outline-none">
                <option value="CASH">Tiền mặt</option><option value="TRANSFER">Chuyển khoản</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"><ChevronDown /></span>
            </div>
          </div>
          <div className="flex items-center gap-3"><span className="w-[7rem] text-md text-ink">Ghi chú</span><input value={note} onChange={e => setNote(e.target.value)} className="flex-1 h-10 px-3 bg-card border border-line-default rounded-md text-md text-ink focus:border-primary outline-none" /></div>
        </div>

        {error && <div className="px-6 pb-2 text-sm text-danger">{error}</div>}

        <div className="px-6">
          <div className="max-h-[22rem] overflow-y-auto border border-line rounded-md">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-primary-25 text-sm font-semibold text-ink-subtle">
                  <th className="sticky top-0 bg-primary-25 px-3 py-2.5 w-[3rem] text-left"><input type="checkbox" checked={rows.length > 0 && rows.every(r => checked[r.id])} onChange={e => setChecked(Object.fromEntries(rows.map(r => [r.id, e.target.checked])))} className="accent-primary w-4 h-4" /></th>
                  <th className="sticky top-0 bg-primary-25 px-3 py-2.5 text-left">Mã phiếu</th>
                  <th className="sticky top-0 bg-primary-25 px-3 py-2.5 text-left">Nhân viên</th>
                  <th className="sticky top-0 bg-primary-25 px-3 py-2.5 text-right">Thành tiền</th>
                  <th className="sticky top-0 bg-primary-25 px-3 py-2.5 text-right">Đã trả nhân viên</th>
                  <th className="sticky top-0 bg-primary-25 px-3 py-2.5 text-right">Còn cần trả</th>
                  <th className="sticky top-0 bg-primary-25 px-3 py-2.5 text-right">Tiền trả nhân viên</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className="border-b border-line">
                    <td className="px-3 py-3"><input type="checkbox" checked={!!checked[r.id]} onChange={e => setChecked(c => ({ ...c, [r.id]: e.target.checked }))} className="accent-primary w-4 h-4" /></td>
                    <td className="px-3 py-3 text-md text-primary">{r.code}</td>
                    <td className="px-3 py-3"><div className="text-md text-primary">{r.employeeName}</div><div className="text-sm text-ink-subtle">{r.employeeCode}</div></td>
                    <td className="px-3 py-3 text-md text-ink text-right">{money(r.total)}</td>
                    <td className="px-3 py-3 text-md text-primary text-right">{money(r.paidAmount)}</td>
                    <td className="px-3 py-3 text-md text-ink text-right">{money(r.remaining)}</td>
                    <td className="px-3 py-3 text-right">
                      <input value={money(r.pay)} onChange={e => { const v = Math.min(parseInt(e.target.value.replace(/\D/g, '') || '0', 10), r.remaining); setRows(rs => rs.map((x, xi) => xi === i ? { ...x, pay: v } : x)) }}
                        className="w-[8rem] h-9 px-2 text-right bg-card border border-line-default rounded-md text-md text-ink focus:border-primary outline-none" />
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-10 text-center text-md text-ink-subtle">Không còn phiếu lương cần thanh toán</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4">
          <button onClick={onClose} className="kv-btn kv-btn-outline-neutral h-10 bg-card">Bỏ qua</button>
          <button onClick={() => void submit()} disabled={saving} className="kv-btn kv-btn-primary h-10">{saving ? 'Đang lưu…' : 'Tạo phiếu chi'}</button>
        </div>
      </div>
    </div>
  )
}

/* ── Phiếu lương cá nhân modal ─────────────────────────────────────────────── */
const PayLine = ({ label, value, sub, strong, blue }: { label: string; value: string; sub?: string; strong?: boolean; blue?: boolean }) => (
  <div className="flex items-start justify-between gap-4 py-2.5 border-b border-line">
    <div>
      <span className="text-md text-ink">{label}</span>
      {sub && <div className="text-xs text-ink-muted">{sub}</div>}
    </div>
    <span className={`text-md ${blue ? 'text-primary' : strong ? 'text-ink font-bold' : 'text-ink'}`}>{value}</span>
  </div>
)

const PayslipModal = ({ payslipId, onClose, onChanged }: {
  payslipId: string; onClose: () => void; onChanged: (sheetId: string) => void
}) => {
  const [tab, setTab] = useState<'pay' | 'attendance'>('pay')
  const [detail, setDetail] = useState<PayslipDetailDto | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getPayslip(payslipId)
      .then(res => setDetail(res.data.data))
      .catch(err => setError(errMsg(err, 'Không thể tải phiếu lương')))
  }, [payslipId])

  const doCancel = async () => {
    if (!detail || !window.confirm(`Hủy phiếu lương ${detail.code}?`)) return
    setBusy(true)
    try {
      await cancelPayslip(detail.id)
      onChanged(detail.sheetId)
    } catch (err) {
      setError(errMsg(err, 'Không thể hủy phiếu lương'))
    } finally {
      setBusy(false)
    }
  }

  const statusLabel = detail
    ? (detail.status === 'CANCELLED' ? 'Đã hủy' : SHEET_STATUS_LABEL[detail.sheetStatus])
    : ''
  const canCancel = !!detail && detail.status === 'ACTIVE' && detail.paidAmount === 0 && detail.sheetStatus !== 'CANCELLED'

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center p-4 overflow-y-auto bg-black/50" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-[62rem] my-[5vh] bg-card rounded-xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-7 pt-5 pb-3">
          <h2 className="text-xl font-bold text-ink">Phiếu lương cá nhân {detail?.code ?? ''}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-ink-muted hover:bg-fill hover:text-ink cursor-pointer"><CloseIcon /></button>
        </div>

        <div className="px-7 flex items-center gap-7 border-b border-line">
          {([['pay', 'Thanh toán'], ['attendance', 'Chấm công chi tiết']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={`relative pb-3 pt-1 text-md cursor-pointer ${tab === id ? 'text-primary font-semibold' : 'text-ink-subtle hover:text-ink'}`}>
              {label}{tab === id && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary rounded-full" />}
            </button>
          ))}
        </div>

        {error && <div className="px-7 pt-3 text-sm text-danger">{error}</div>}

        {!detail ? (
          <div className="px-7 py-16 text-center text-md text-ink-subtle">Đang tải…</div>
        ) : tab === 'pay' ? (
          <div className="px-7 py-5 grid grid-cols-2 gap-x-12">
            {/* left */}
            <div>
              <PayLine label={`${detail.employeeCode} :`} value={detail.employeeName} strong />
              <PayLine label="Loại lương chính :" value={detail.salaryType ? SALARY_TYPE_LABEL[detail.salaryType] : 'Chưa thiết lập'} />
              <PayLine label="Trạng thái :" value={statusLabel} />
              <PayLine label="Bảng lương :" value={detail.sheetName} />
              <PayLine label="Kỳ làm việc :" value={`${fmtDate(detail.periodStart)} - ${fmtDate(detail.periodEnd)}`} />
              <PayLine label="Số ca làm :" value={String(detail.shiftCount)} strong />
              <PayLine label="Giờ công :" value={`${Math.round(detail.workedMinutes / 6) / 10} giờ`} />
              <div className="pt-3 text-md text-ink-muted italic">Ghi chú</div>
            </div>
            {/* right */}
            <div>
              <PayLine label="Lương chính :" value={money(detail.mainSalary)} blue />
              <PayLine label="Lương làm thêm giờ :" value={money(detail.overtimeSalary)} blue />
              <PayLine label="Tổng thu nhập (I) :" value={money(detail.mainSalary + detail.overtimeSalary)} strong />
              <PayLine label="Giảm trừ (II) :" value={money(detail.deduction)} blue />
              <PayLine label="Lương thực nhận (III) :" sub="(III) = (I) - (II)" value={money(detail.total)} />
              <PayLine label="Đã trả nhân viên :" value={money(detail.paidAmount)} />
              <PayLine label="Còn cần trả :" value={money(detail.remaining)} strong />
            </div>
          </div>
        ) : (
          detail.attendance.length === 0 ? (
            <div className="px-7 py-12 text-center text-md text-ink-subtle">Chưa có dữ liệu chấm công chi tiết</div>
          ) : (
            <div className="px-7 py-5">
              <div className="max-h-[24rem] overflow-y-auto border border-line rounded-md">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-fill text-sm font-semibold text-ink-subtle">
                      <th className="sticky top-0 bg-fill px-3 py-2.5 text-left">Ngày</th>
                      <th className="sticky top-0 bg-fill px-3 py-2.5 text-left">Ca</th>
                      <th className="sticky top-0 bg-fill px-3 py-2.5 text-left">Trạng thái</th>
                      <th className="sticky top-0 bg-fill px-3 py-2.5 text-left">Vào - Ra</th>
                      <th className="sticky top-0 bg-fill px-3 py-2.5 text-right">Giờ công</th>
                      <th className="sticky top-0 bg-fill px-3 py-2.5 text-right">OT (phút)</th>
                      <th className="sticky top-0 bg-fill px-3 py-2.5 text-left">Mức áp dụng</th>
                      <th className="sticky top-0 bg-fill px-3 py-2.5 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.attendance.map((a, i) => (
                      <tr key={i} className="border-b border-line">
                        <td className="px-3 py-3 text-md text-ink whitespace-nowrap">{fmtDate(a.date)}</td>
                        <td className="px-3 py-3 text-md text-ink">{a.shiftName || '—'}</td>
                        <td className="px-3 py-3 text-md text-ink">{ATTENDANCE_STATUS_LABEL[a.status] || a.status}</td>
                        <td className="px-3 py-3 text-md text-ink whitespace-nowrap">
                          {a.checkInAt ? fmtDateTime(a.checkInAt).slice(11) : '--'} - {a.checkOutAt ? fmtDateTime(a.checkOutAt).slice(11) : '--'}
                        </td>
                        <td className="px-3 py-3 text-md text-ink text-right">{a.workedMinutes != null ? `${Math.round(a.workedMinutes / 6) / 10}h` : ''}</td>
                        <td className="px-3 py-3 text-md text-ink text-right">{a.otMinutes || ''}</td>
                        <td className="px-3 py-3 text-md text-ink">{a.rateApplied || ''}</td>
                        <td className="px-3 py-3 text-md text-ink text-right">{money(a.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}

        <div className="flex items-center justify-between gap-3 px-7 py-4 border-t border-line">
          {canCancel
            ? <button onClick={() => void doCancel()} disabled={busy} className="kv-btn kv-btn-outline-neutral h-10 bg-card"><TrashIcon /> Hủy</button>
            : <span />}
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="kv-btn kv-btn-outline-neutral h-10 bg-card">Bỏ qua</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Thêm bảng tính lương modal ────────────────────────────────────────────── */
const MONTH_PERIODS = (() => {
  const out: string[] = []
  const base = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    out.push(`01/${mm}/${d.getFullYear()} - ${last}/${mm}/${d.getFullYear()}`)
  }
  return out
})()

/* custom dropdown with a check on the selected option */
const Dropdown = ({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} className="relative flex-1">
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`flex items-center justify-between gap-2 w-full h-11 px-3 bg-card border rounded-md cursor-pointer transition-colors ${open ? 'border-primary' : 'border-line-default hover:border-line-strong'}`}>
        <span className="text-md text-ink truncate">{value}</span><ChevronDown />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.3rem)] max-h-[16rem] overflow-y-auto bg-card border border-line-default rounded-md shadow-md z-[var(--kv-z-dropdown)] py-1">
          {options.map(o => (
            <button key={o} type="button" onClick={() => { onChange(o); setOpen(false) }}
              className={`flex items-center justify-between gap-2 w-full text-left px-3 py-2.5 text-md cursor-pointer ${o === value ? 'bg-primary-25 text-ink' : 'text-ink hover:bg-[var(--kv-state-hover-bg)]'}`}>
              {o}{o === value && <CheckIcon />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── calendar date picker ──────────────────────────────────────────────────── */
const fmtDMY = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const ArrowL = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>)
const ArrowR = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>)

const DatePicker = ({ value, onChange }: { value: Date; onChange: (d: Date) => void }) => {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(new Date(value.getFullYear(), value.getMonth(), 1))
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const year = view.getFullYear(), month = view.getMonth()
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7 // Monday-first
  const days = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(startOffset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  const isSel = (d: number) => value.getFullYear() === year && value.getMonth() === month && value.getDate() === d
  const move = (n: number) => setView(new Date(year, month + n, 1))
  return (
    <div ref={ref} className="relative flex-1">
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`w-full h-11 pl-3 pr-9 flex items-center bg-card border rounded-md text-md text-ink text-left cursor-pointer transition-colors ${open ? 'border-primary' : 'border-line-default hover:border-line-strong'}`}>
        {fmtDMY(value)}
      </button>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"><CalendarIcon /></span>
      {open && (
        <div className="absolute left-0 top-[calc(100%+0.3rem)] z-[var(--kv-z-dropdown)] w-[20rem] bg-card border border-line-default rounded-lg shadow-md p-3">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => move(-1)} className="w-8 h-8 flex items-center justify-center rounded-md text-ink-subtle hover:bg-fill hover:text-primary cursor-pointer"><ArrowL /></button>
            <span className="text-md font-semibold text-ink">Tháng {month + 1}, {year}</span>
            <button type="button" onClick={() => move(1)} className="w-8 h-8 flex items-center justify-center rounded-md text-ink-subtle hover:bg-fill hover:text-primary cursor-pointer"><ArrowR /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-sm text-ink-muted mb-1">{WEEKDAYS.map(w => <span key={w} className="py-1">{w}</span>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => d === null ? <span key={i} /> : (
              <button key={i} type="button" onClick={() => { onChange(new Date(year, month, d)); setOpen(false) }}
                className={`h-8 rounded-md text-md cursor-pointer ${isSel(d) ? 'bg-primary text-white font-semibold' : 'text-ink hover:bg-primary-25'}`}>{d}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const AddPayrollModal = ({ onClose, onCreated }: { onClose: () => void; onCreated: (sheet: PayrollSheetDto) => void }) => {
  const [term, setTerm] = useState<PayrollTerm>('MONTHLY')
  const [period, setPeriod] = useState(MONTH_PERIODS[0])
  const [from, setFrom] = useState(new Date())
  const [to, setTo] = useState(new Date())
  const [scope, setScope] = useState<'all' | 'custom'>('all')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [empSearch, setEmpSearch] = useState('')
  const [empOpen, setEmpOpen] = useState(false)
  const empRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState<Record<string, Employee>>({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (scope !== 'custom' || employees.length > 0) return
    listEmployees({ status: 'ACTIVE', size: 100 })
      .then(res => setEmployees(res.data.data.map(toEmployee)))
      .catch(() => setEmployees([]))
  }, [scope, employees.length])

  useEffect(() => {
    const h = (e: MouseEvent) => { if (empRef.current && !empRef.current.contains(e.target as Node)) setEmpOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const q = empSearch.trim().toLowerCase()
  const matches = employees
    .filter(e => !selected[e.id] && (!q || e.name.toLowerCase().includes(q) || e.code.toLowerCase().includes(q)))
    .slice(0, 8)
  const selectedList = Object.values(selected)

  const submit = async () => {
    let periodStart: string, periodEnd: string
    if (term === 'MONTHLY') {
      const parts = period.split(' - ')
      const s = parts[0].split('/'), e = parts[1].split('/')
      periodStart = `${s[2]}-${s[1]}-${s[0]}`
      periodEnd = `${e[2]}-${e[1]}-${e[0]}`
    } else {
      periodStart = toIsoDate(from)
      periodEnd = toIsoDate(to)
      if (periodStart > periodEnd) { setError('Kỳ làm việc không hợp lệ'); return }
    }
    if (scope === 'custom' && selectedList.length === 0) { setError('Chọn ít nhất một nhân viên'); return }
    setSaving(true)
    setError('')
    const payload: CreateSheetPayload = {
      term,
      periodStart,
      periodEnd,
      scope: scope === 'all' ? 'ALL' : 'CUSTOM',
      employeeIds: scope === 'custom' ? selectedList.map(e => e.id) : undefined,
    }
    try {
      const res = await createSheet(payload)
      onCreated(res.data.data)
    } catch (err) {
      setError(errMsg(err, 'Không thể tạo bảng lương'))
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center p-4 overflow-y-auto bg-black/50" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-[58rem] my-[12vh] bg-card rounded-xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-7 pt-5 pb-4">
          <h2 className="text-xl font-bold text-ink">Thêm bảng tính lương</h2>
          <button onClick={onClose} aria-label="Đóng" className="w-8 h-8 flex items-center justify-center rounded-full text-ink-muted hover:bg-fill hover:text-ink cursor-pointer"><CloseIcon /></button>
        </div>

        <div className="px-7 py-4 flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <label className="w-[10rem] shrink-0 text-md text-ink">Kỳ hạn trả lương</label>
            <Dropdown value={TERM_LABEL[term]} options={[TERM_LABEL.MONTHLY, TERM_LABEL.CUSTOM]}
              onChange={v => setTerm(v === TERM_LABEL.MONTHLY ? 'MONTHLY' : 'CUSTOM')} />
          </div>

          <div className="flex items-center gap-4">
            <label className="w-[10rem] shrink-0 text-md text-ink">Kỳ làm việc</label>
            {term === 'MONTHLY'
              ? <Dropdown value={period} options={MONTH_PERIODS} onChange={setPeriod} />
              : (
                <div className="flex items-center gap-3 flex-1">
                  <DatePicker value={from} onChange={setFrom} />
                  <span className="text-md text-ink-subtle">Đến</span>
                  <DatePicker value={to} onChange={setTo} />
                </div>
              )}
          </div>

          <div className="flex items-center gap-4">
            <label className="w-[10rem] shrink-0 text-md text-ink">Phạm vi áp dụng</label>
            <div className="flex items-center gap-8">
              {([['all', 'Tất cả nhân viên'], ['custom', 'Tùy chọn']] as const).map(([id, label]) => (
                <label key={id} className="flex items-center gap-2 cursor-pointer text-md text-ink">
                  <input type="radio" name="pay-scope" checked={scope === id} onChange={() => setScope(id)} className="accent-primary w-4 h-4" />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {scope === 'custom' && (
            <div className="flex flex-col gap-3">
              <div ref={empRef} className="relative w-[24rem] max-w-full">
                <span className="absolute left-3 top-1/2 -translate-y-1/2"><SearchIcon /></span>
                <input value={empSearch} onChange={e => setEmpSearch(e.target.value)} onFocus={() => setEmpOpen(true)} placeholder="Tìm theo mã, tên nhân viên"
                  className="w-full h-11 pl-9 pr-4 bg-card border border-line-default rounded-md text-md text-ink placeholder:text-ink-muted focus:border-primary outline-none" />
                {empOpen && matches.length > 0 && (
                  <div className="absolute left-0 right-0 top-[calc(100%+0.3rem)] bg-card border border-line-default rounded-md shadow-md z-[var(--kv-z-dropdown)] py-1 max-h-[16rem] overflow-y-auto">
                    {matches.map(e => (
                      <button key={e.id} type="button" onClick={() => { setSelected(s => ({ ...s, [e.id]: e })); setEmpSearch('') }}
                        className="flex items-center justify-between w-full text-left px-3 py-2.5 text-md text-ink cursor-pointer hover:bg-[var(--kv-state-hover-bg)]">
                        <span>{e.name}</span><span className="text-sm text-ink-subtle">{e.code}</span>
                      </button>
                    ))}
                  </div>
                )}
                {empOpen && matches.length === 0 && employees.length > 0 && (
                  <div className="absolute left-0 right-0 top-[calc(100%+0.3rem)] bg-card border border-line-default rounded-md shadow-md z-[var(--kv-z-dropdown)] py-3 text-center text-sm text-ink-subtle">
                    Không tìm thấy nhân viên phù hợp
                  </div>
                )}
              </div>

              <div className="border border-line rounded-md overflow-hidden">
                <div className="grid grid-cols-3 bg-primary-25 px-4 py-3 text-sm font-semibold text-ink-subtle">
                  <span>Mã nhân viên</span>
                  <span>Tên nhân viên</span>
                  <span />
                </div>
                {selectedList.length === 0
                  ? <div className="py-8 text-center text-md text-ink-subtle">Chưa có nhân viên nào được chọn</div>
                  : selectedList.map(e => (
                    <div key={e.id} className="grid grid-cols-3 items-center px-4 py-2.5 border-t border-line text-md text-ink">
                      <span>{e.code}</span>
                      <span>{e.name}</span>
                      <span className="text-right">
                        <button type="button" onClick={() => setSelected(s => { const n = { ...s }; delete n[e.id]; return n })}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-md text-ink-muted hover:text-danger cursor-pointer" aria-label="Xóa"><TrashIcon /></button>
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {error && <div className="text-sm text-danger">{error}</div>}
        </div>

        <div className="flex items-center justify-end gap-3 px-7 py-4 border-t border-line">
          <button onClick={onClose} className="kv-btn kv-btn-outline-neutral h-10 bg-card">Bỏ qua</button>
          <button onClick={() => void submit()} disabled={saving} className="kv-btn kv-btn-primary h-10">{saving ? 'Đang tạo…' : 'Lưu'}</button>
        </div>
      </div>
    </div>
  )
}

export default Payroll
