import { Fragment, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

/* ─────────────────────────────────────────────────────────────────────────────
 * Bảng lương (Payroll) — faithful re-creation of the KiotViet screen.
 * Left filter rail + payroll table with an expandable detail (Thông tin /
 * Phiếu lương / Lịch sử thanh toán), a payment modal and an individual payslip.
 * ──────────────────────────────────────────────────────────────────────────── */

interface Payslip { code: string; empCode: string; employee: string; total: number; paid: number; remaining: number }
interface Payroll {
  code: string; name: string; term: string; period: string
  total: number; paid: number; remaining: number; status: PayrollStatus
  createdAt: string; createdBy: string; preparedBy: string
  employeeCount: number; scope: string; approvedBy?: string; note?: string
  updatedAt: string; payslips: Payslip[]
}
type PayrollStatus = 'Đang tạo' | 'Tạm tính' | 'Đã chốt lương' | 'Đã hủy'

const money = (n: number) => n.toLocaleString('vi-VN')

const PAYSLIPS: Payslip[] = [
  { code: 'PL000001', empCode: 'NV000001', employee: 'Nguyen Van A', total: 0, paid: 0, remaining: 0 },
  { code: 'PL000002', empCode: 'NV000002', employee: 'Nguyen Van B', total: 0, paid: 0, remaining: 0 },
]
const PAYROLLS: Payroll[] = [
  {
    code: 'BL000001', name: 'Bảng lương tháng 8/2026', term: 'Hàng tháng', period: '01/08/2026 - 31/08/2026',
    total: 0, paid: 0, remaining: 0, status: 'Tạm tính',
    createdAt: '10/07/2026 14:17:39', createdBy: 'Nguyen Van A', preparedBy: 'Nguyen Van A',
    employeeCount: 2, scope: 'Tất cả nhân viên', approvedBy: '', note: '', updatedAt: '10/07/2026 14:39:32',
    payslips: PAYSLIPS,
  },
]

const STATUS_FILTERS: PayrollStatus[] = ['Đang tạo', 'Tạm tính', 'Đã chốt lương', 'Đã hủy']
const TERM_OPTIONS = ['Chọn kỳ hạn trả lương', 'Hàng tháng', 'Tùy chọn']

interface Col { key: string; label: string; align?: 'right'; sum?: boolean; render: (p: Payroll) => React.ReactNode }
const ALL_COLUMNS: Col[] = [
  { key: 'code', label: 'Mã', render: p => p.code },
  { key: 'name', label: 'Tên', render: p => p.name },
  { key: 'term', label: 'Kỳ hạn trả', render: p => p.term },
  { key: 'period', label: 'Kỳ làm việc', render: p => <span className="whitespace-nowrap">{p.period}</span> },
  { key: 'employeeCount', label: 'Số nhân viên', align: 'right', render: p => p.employeeCount },
  { key: 'total', label: 'Tổng lương', align: 'right', sum: true, render: p => money(p.total) },
  { key: 'paid', label: 'Đã trả nhân viên', align: 'right', sum: true, render: p => money(p.paid) },
  { key: 'remaining', label: 'Còn cần trả', align: 'right', sum: true, render: p => money(p.remaining) },
  { key: 'status', label: 'Trạng thái', render: p => p.status },
  { key: 'createdBy', label: 'Người tạo', render: p => p.createdBy },
  { key: 'preparedBy', label: 'Người lập bảng', render: p => p.preparedBy },
  { key: 'createdAt', label: 'Ngày tạo', render: p => p.createdAt },
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
const PrintIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>)
const CalendarIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>)
const InfoIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>)
const CheckIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><polyline points="20 6 9 17 4 12" /></svg>)
const GearIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>)

/* read-only labelled field used in the "Thông tin" tab */
const FieldRO = ({ label, value, placeholder }: { label: string; value?: string; placeholder?: boolean }) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-sm text-ink-subtle">{label}</span>
    <span className={`text-md border-b border-line pb-2 min-h-[1.6rem] ${placeholder ? 'text-ink-muted italic' : 'text-ink'}`}>{value || ' '}</span>
  </div>
)

const Payroll = () => {
  const navigate = useNavigate()
  const [term, setTerm] = useState(TERM_OPTIONS[0])
  const [termOpen, setTermOpen] = useState(false)
  const termRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState<Record<string, boolean>>(DEFAULT_VISIBLE)
  const [colsOpen, setColsOpen] = useState(false)
  const colsRef = useRef<HTMLDivElement>(null)
  const visibleCols = ALL_COLUMNS.filter(c => visible[c.key])
  const [statuses, setStatuses] = useState<Record<PayrollStatus, boolean>>({ 'Đang tạo': true, 'Tạm tính': true, 'Đã chốt lương': true, 'Đã hủy': false })
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>('BL000001')
  const [detailTab, setDetailTab] = useState<'info' | 'payslips' | 'history'>('info')
  const [payModal, setPayModal] = useState<Payroll | null>(null)
  const [payslipModal, setPayslipModal] = useState<Payslip | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const t = e.target as Node
      if (termRef.current && !termRef.current.contains(t)) setTermOpen(false)
      if (colsRef.current && !colsRef.current.contains(t)) setColsOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const rows = PAYROLLS.filter(p => statuses[p.status]
    && (!search.trim() || p.code.toLowerCase().includes(search.trim().toLowerCase()) || p.name.toLowerCase().includes(search.trim().toLowerCase())))

  const toggleStatus = (s: PayrollStatus) => setStatuses(m => ({ ...m, [s]: !m[s] }))

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
                  <span className={`text-md truncate ${term === TERM_OPTIONS[0] ? 'text-ink' : 'text-ink'}`}>{term}</span>
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
                    {s}
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
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Theo mã, tên bảng lương"
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
                    <th key={c.key} className={`sticky top-0 bg-primary-25 px-4 py-3 ${c.align === 'right' ? 'text-right' : 'text-left'}`}>{c.label}</th>
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
                  const open = expanded === p.code
                  return (
                    <Fragment key={p.code}>
                      <tr onClick={() => setExpanded(open ? null : p.code)}
                        className={`cursor-pointer border-b border-line ${open ? 'bg-fill' : 'hover:bg-[var(--kv-state-hover-bg)]'}`}>
                        <td className="px-4 py-4" onClick={e => e.stopPropagation()}><input type="checkbox" className="accent-primary w-4 h-4" /></td>
                        {visibleCols.map(c => (
                          <td key={c.key} className={`px-4 py-4 text-md text-ink ${c.align === 'right' ? 'text-right' : ''}`}>{c.render(p)}</td>
                        ))}
                      </tr>
                      {open && (
                        <tr className="border-b-2 border-primary">
                          <td colSpan={visibleCols.length + 1} className="p-0">
                            <PayrollDetail payroll={p} tab={detailTab} setTab={setDetailTab}
                              onPay={() => setPayModal(p)} onOpenPayslip={ps => setPayslipModal(ps)}
                              onView={() => navigate('/manager/payroll/update')} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
                {rows.length === 0 && (
                  <tr><td colSpan={visibleCols.length + 1} className="px-4 py-16 text-center text-md text-ink-subtle">Không có bảng lương phù hợp</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* footer */}
          <div className="flex items-center gap-3 mt-3 text-md text-ink-subtle">
            Hiển thị
            <div className="relative">
              <select className="h-9 pl-3 pr-8 bg-card border border-line-default rounded-md text-md text-ink appearance-none cursor-pointer outline-none focus:border-primary">
                <option>15 bản ghi</option><option>30 bản ghi</option><option>50 bản ghi</option>
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"><ChevronDown /></span>
            </div>
          </div>
        </div>
      </div>

      {/* floating Khởi tạo */}
      <button className="fixed right-6 bottom-6 flex items-center gap-2 h-11 px-4 rounded-full bg-primary text-white text-md font-medium shadow-md hover:bg-primary-600 cursor-pointer z-[var(--kv-z-dropdown)]">
        <GearIcon /> Khởi tạo
      </button>

      {addOpen && <AddPayrollModal onClose={() => setAddOpen(false)} />}
      {payModal && <PaymentModal payroll={payModal} onClose={() => setPayModal(null)} />}
      {payslipModal && <PayslipModal payslip={payslipModal} onClose={() => setPayslipModal(null)} />}
    </div>
  )
}

/* ── expandable detail ─────────────────────────────────────────────────────── */
const PayrollDetail = ({ payroll, tab, setTab, onPay, onOpenPayslip, onView }: {
  payroll: Payroll; tab: 'info' | 'payslips' | 'history'; setTab: (t: 'info' | 'payslips' | 'history') => void
  onPay: () => void; onOpenPayslip: (p: Payslip) => void; onView: () => void
}) => {
  const [confirmCancel, setConfirmCancel] = useState(false)
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

    {tab === 'info' && (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-5 py-5">
          <FieldRO label="Mã:" value={payroll.code} />
          <FieldRO label="Tên:" value={payroll.name} />
          <FieldRO label="Kỳ hạn trả:" value={payroll.term} />
          <FieldRO label="Kỳ làm việc:" value={payroll.period} />
          <FieldRO label="Ngày tạo:" value={payroll.createdAt} />
          <FieldRO label="Người tạo:" value={payroll.createdBy} />
          <FieldRO label="Người lập bảng:" value={payroll.preparedBy} />
          <FieldRO label="Trạng thái:" value={payroll.status} />
          <FieldRO label="Tổng số nhân viên:" value={String(payroll.employeeCount)} />
          <FieldRO label="Tổng lương:" value={money(payroll.total)} />
          <FieldRO label="Đã trả nhân viên:" value={money(payroll.paid)} />
          <FieldRO label="Còn cần trả:" value={money(payroll.remaining)} />
          <FieldRO label="Phạm vi áp dụng:" value={payroll.scope} />
          <FieldRO label="Người chốt lương:" value={payroll.approvedBy} />
          <div className="lg:col-span-2 flex flex-col gap-1.5">
            <span className="text-sm text-ink-subtle">&nbsp;</span>
            <div className="min-h-[6rem] p-3 border border-line rounded-md text-md text-ink-muted italic">{payroll.note || 'Ghi chú...'}</div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-line pt-4">
          <button onClick={() => setConfirmCancel(true)} className="flex items-center gap-1.5 text-md text-ink-subtle hover:text-danger cursor-pointer"><TrashIcon /> Hủy bỏ</button>
          <div className="flex items-center gap-2 text-sm text-ink-subtle">
            Dữ liệu được cập nhật vào: <span className="font-semibold text-ink">{payroll.updatedAt}</span> <InfoIcon />
            <button className="kv-btn kv-btn-outline-neutral h-9 bg-card ml-2"><RefreshIcon /> Tải lại dữ liệu</button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onView} className="kv-btn kv-btn-primary h-9"><CheckIcon /> Xem bảng lương</button>
            <button className="kv-btn kv-btn-outline-neutral h-9 bg-card"><ExportIcon /> Xuất file</button>
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
            </tr>
            <tr className="border-b border-line text-md font-semibold text-ink">
              <td className="px-4 py-2.5" colSpan={3} />
              <td className="px-4 py-2.5 text-right">{money(payroll.payslips.reduce((a, s) => a + s.total, 0))}</td>
              <td className="px-4 py-2.5 text-right">{money(payroll.payslips.reduce((a, s) => a + s.paid, 0))}</td>
              <td className="px-4 py-2.5 text-right">{money(payroll.payslips.reduce((a, s) => a + s.remaining, 0))}</td>
            </tr>
          </thead>
          <tbody>
            {payroll.payslips.map(s => (
              <tr key={s.code} className="border-b border-line hover:bg-[var(--kv-state-hover-bg)]">
                <td className="px-4 py-3.5"><input type="checkbox" className="accent-primary w-4 h-4" /></td>
                <td className="px-4 py-3.5"><button onClick={() => onOpenPayslip(s)} className="text-md text-primary hover:underline cursor-pointer">{s.code}</button></td>
                <td className="px-4 py-3.5"><button onClick={() => onOpenPayslip(s)} className="text-md text-primary hover:underline cursor-pointer">{s.employee}</button></td>
                <td className="px-4 py-3.5 text-md text-ink text-right">{money(s.total)}</td>
                <td className="px-4 py-3.5 text-md text-ink text-right">{money(s.paid)}</td>
                <td className="px-4 py-3.5 text-md text-ink text-right">{money(s.remaining)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end mt-4">
          <button onClick={onPay} className="kv-btn kv-btn-primary h-10"><CalcIcon /> Thanh toán</button>
        </div>
      </div>
    )}

    {tab === 'history' && (
      <div className="py-12 text-center text-md text-ink-subtle">Chưa có lịch sử thanh toán</div>
    )}

    {confirmCancel && <CancelPayrollModal code={payroll.code} onClose={() => setConfirmCancel(false)} onConfirm={() => setConfirmCancel(false)} />}
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
const PaymentModal = ({ payroll, onClose }: { payroll: Payroll; onClose: () => void }) => {
  const [rows, setRows] = useState(payroll.payslips.map(s => ({ ...s, pay: s.remaining })))
  const [checked, setChecked] = useState<Record<string, boolean>>(Object.fromEntries(payroll.payslips.map(s => [s.code, true])))
  const total = rows.filter(r => checked[r.code]).reduce((a, r) => a + r.pay, 0)
  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center p-4 overflow-y-auto bg-black/50" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-[64rem] my-[5vh] bg-card rounded-xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-xl font-bold text-ink">Thanh toán bảng lương</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-ink-muted hover:bg-fill hover:text-ink cursor-pointer"><CloseIcon /></button>
        </div>
        <div className="px-6 text-sm text-ink-subtle">{payroll.name} | Kỳ làm việc: {payroll.period} | Trạng thái: {payroll.status}</div>

        <div className="px-6 py-4 grid grid-cols-2 gap-x-8 gap-y-3">
          <div className="flex items-center gap-3"><span className="w-[9rem] text-md text-ink">Tiền trả nhân viên</span><span className="text-md font-bold text-ink">{money(total)}</span></div>
          <div className="flex items-center gap-3">
            <span className="w-[7rem] text-md text-ink">Thời gian</span>
            <div className="relative flex-1">
              <input defaultValue="11/07/2026 23:45" className="w-full h-10 pl-3 pr-9 bg-card border border-line-default rounded-md text-md text-ink focus:border-primary outline-none" />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"><CalendarIcon /></span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-[9rem] text-md text-ink">Phương thức</span>
            <div className="relative flex-1">
              <select className="w-full h-10 pl-3 pr-9 bg-card border border-line-default rounded-md text-md text-ink appearance-none cursor-pointer focus:border-primary outline-none">
                <option>Tiền mặt</option><option>Chuyển khoản</option>
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"><ChevronDown /></span>
            </div>
          </div>
          <div className="flex items-center gap-3"><span className="w-[7rem] text-md text-ink">Ghi chú</span><input className="flex-1 h-10 px-3 bg-card border border-line-default rounded-md text-md text-ink focus:border-primary outline-none" /></div>
        </div>

        <div className="px-6">
          <div className="max-h-[22rem] overflow-y-auto border border-line rounded-md">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-primary-25 text-sm font-semibold text-ink-subtle">
                  <th className="sticky top-0 bg-primary-25 px-3 py-2.5 w-[3rem] text-left"><input type="checkbox" checked={rows.every(r => checked[r.code])} onChange={e => setChecked(Object.fromEntries(rows.map(r => [r.code, e.target.checked])))} className="accent-primary w-4 h-4" /></th>
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
                  <tr key={r.code} className="border-b border-line">
                    <td className="px-3 py-3"><input type="checkbox" checked={!!checked[r.code]} onChange={e => setChecked(c => ({ ...c, [r.code]: e.target.checked }))} className="accent-primary w-4 h-4" /></td>
                    <td className="px-3 py-3 text-md text-primary">{r.code}</td>
                    <td className="px-3 py-3"><div className="text-md text-primary">{r.employee}</div><div className="text-sm text-ink-subtle">{r.empCode}</div></td>
                    <td className="px-3 py-3 text-md text-ink text-right">{money(r.total)}</td>
                    <td className="px-3 py-3 text-md text-primary text-right">{money(r.paid)}</td>
                    <td className="px-3 py-3 text-md text-ink text-right">{money(r.remaining)}</td>
                    <td className="px-3 py-3 text-right">
                      <input value={money(r.pay)} onChange={e => { const v = parseInt(e.target.value.replace(/\D/g, '') || '0', 10); setRows(rs => rs.map((x, xi) => xi === i ? { ...x, pay: v } : x)) }}
                        className="w-[8rem] h-9 px-2 text-right bg-card border border-line-default rounded-md text-md text-ink focus:border-primary outline-none" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4">
          <button onClick={onClose} className="kv-btn kv-btn-outline-neutral h-10 bg-card">Bỏ qua</button>
          <button onClick={onClose} className="kv-btn kv-btn-primary h-10">Tạo phiếu chi</button>
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
const PayslipModal = ({ payslip, onClose }: { payslip: Payslip; onClose: () => void }) => {
  const [tab, setTab] = useState<'pay' | 'attendance'>('pay')
  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center p-4 overflow-y-auto bg-black/50" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-[62rem] my-[5vh] bg-card rounded-xl shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-7 pt-5 pb-3">
          <h2 className="text-xl font-bold text-ink">Phiếu lương cá nhân {payslip.code}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-ink-muted hover:bg-fill hover:text-ink cursor-pointer"><CloseIcon /></button>
        </div>

        <div className="px-7 flex items-center gap-7 border-b border-line">
          {([['pay', 'Thanh toán'], ['attendance', 'Chấm công chi tiết']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={`relative pb-3 pt-1 text-md cursor-pointer ${tab === id ? 'text-primary font-semibold' : 'text-ink-subtle hover:text-ink'}`}>
              {label}{tab === id && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary rounded-full" />}
            </button>
          ))}
        </div>

        {tab === 'pay' ? (
          <div className="px-7 py-5 grid grid-cols-2 gap-x-12">
            {/* left */}
            <div>
              <PayLine label={`${payslip.empCode} :`} value={payslip.employee} strong />
              <PayLine label="Phòng ban :" value="" />
              <PayLine label="Chức danh :" value="" />
              <PayLine label="Loại lương chính :" value="Theo ca làm việc" />
              <PayLine label="Trạng thái :" value="Tạm tính" />
              <PayLine label="Bảng lương :" value="Bảng lương tháng 8/2026" />
              <PayLine label="Kỳ làm việc :" value="01/08/2026 - 31/08/2026" />
              <PayLine label="Ngày công chuẩn :" value="31" strong />
              <div className="pt-3 text-md text-ink-muted italic">Ghi chú</div>
            </div>
            {/* right */}
            <div>
              <PayLine label="Lương chính :" value={money(0)} blue />
              <PayLine label="Thưởng :" value={money(0)} blue />
              <PayLine label="Tổng thu nhập (I) :" value={money(0)} strong />
              <PayLine label="Giảm trừ (II) :" value={money(0)} blue />
              <PayLine label="Lương thực nhận (III) :" sub="(III) = (I) - (II)" value={money(0)} />
              <PayLine label="Đã trả nhân viên :" value={money(payslip.paid)} />
              <PayLine label="Còn cần trả :" value={money(payslip.remaining)} strong />
            </div>
          </div>
        ) : (
          <div className="px-7 py-12 text-center text-md text-ink-subtle">Chưa có dữ liệu chấm công chi tiết</div>
        )}

        <div className="flex items-center justify-between gap-3 px-7 py-4 border-t border-line">
          <button className="kv-btn kv-btn-outline-neutral h-10 bg-card"><TrashIcon /> Hủy</button>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="kv-btn kv-btn-outline-neutral h-10 bg-card">Bỏ qua</button>
            <button className="kv-btn kv-btn-outline-neutral h-10 bg-card"><ExportIcon /> Xuất file</button>
            <button className="kv-btn kv-btn-outline-neutral h-10 bg-card"><PrintIcon /> In</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Thêm bảng tính lương modal ────────────────────────────────────────────── */
const MONTH_PERIODS = (() => {
  const out: string[] = []
  const base = new Date(2026, 6, 1) // July 2026
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

const AddPayrollModal = ({ onClose }: { onClose: () => void }) => {
  const [term, setTerm] = useState('Hàng tháng')
  const [period, setPeriod] = useState(MONTH_PERIODS[0])
  const [from, setFrom] = useState(new Date(2026, 6, 11))
  const [to, setTo] = useState(new Date(2026, 6, 11))
  const [scope, setScope] = useState<'all' | 'custom'>('all')
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
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
            <Dropdown value={term} options={['Hàng tháng', 'Tùy chọn']} onChange={setTerm} />
          </div>

          <div className="flex items-center gap-4">
            <label className="w-[10rem] shrink-0 text-md text-ink">Kỳ làm việc</label>
            {term === 'Hàng tháng'
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
              <div className="relative w-[24rem] max-w-full">
                <span className="absolute left-3 top-1/2 -translate-y-1/2"><SearchIcon /></span>
                <input placeholder="Tìm theo mã, tên nhân viên"
                  className="w-full h-11 pl-9 pr-16 bg-card border border-line-default rounded-md text-md text-ink placeholder:text-ink-muted focus:border-primary outline-none" />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-ink-muted">
                  <button type="button" className="w-7 h-7 flex items-center justify-center rounded hover:bg-fill cursor-pointer" aria-label="Danh sách"><ColumnsIcon /></button>
                  <button type="button" className="w-7 h-7 flex items-center justify-center rounded hover:bg-fill cursor-pointer text-lg leading-none" aria-label="Thêm">+</button>
                </div>
              </div>

              <div className="border border-line rounded-md overflow-hidden">
                <div className="grid grid-cols-3 bg-primary-25 px-4 py-3 text-sm font-semibold text-ink-subtle">
                  <span>Mã nhân viên</span>
                  <span>Tên nhân viên</span>
                  <span>Phòng ban</span>
                </div>
                <div className="py-8 text-center text-md text-ink-subtle">Chưa có nhân viên nào được chọn</div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-7 py-4 border-t border-line">
          <button onClick={onClose} className="kv-btn kv-btn-outline-neutral h-10 bg-card">Bỏ qua</button>
          <button onClick={onClose} className="kv-btn kv-btn-primary h-10">Lưu</button>
        </div>
      </div>
    </div>
  )
}

export default Payroll
