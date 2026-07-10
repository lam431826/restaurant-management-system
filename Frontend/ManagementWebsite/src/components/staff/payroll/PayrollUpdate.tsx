import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

/* ─────────────────────────────────────────────────────────────────────────────
 * Cập nhật bảng tính lương — the editable payroll worksheet opened from the
 * "Xem bảng lương" action. One editable row per employee payslip.
 * ──────────────────────────────────────────────────────────────────────────── */

interface Row {
  code: string; name: string; hasMainSalary: boolean
  base: number; commission: number; allowance: number; bonus: number; deduction: number; paid: number
}
const INITIAL: Row[] = [
  { code: 'NV000001', name: 'Nguyen Van A', hasMainSalary: false, base: 0, commission: 0, allowance: 0, bonus: 0, deduction: 0, paid: 0 },
  { code: 'NV000002', name: 'Nguyen Van B', hasMainSalary: true, base: 0, commission: 0, allowance: 0, bonus: 0, deduction: 0, paid: 0 },
]

const money = (n: number) => n.toLocaleString('vi-VN')
const income = (r: Row) => (r.hasMainSalary ? r.base : 0) + r.commission + r.allowance + r.bonus
const net = (r: Row) => income(r) - r.deduction
const remaining = (r: Row) => net(r) - r.paid

/* ── icons ─────────────────────────────────────────────────────────────────── */
const ArrowLeft = () => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>)
const SearchIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>)
const ChevronDown = () => (<svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-ink-muted"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>)
const SaveIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>)
const TableIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="9" x2="9" y2="21" /></svg>)
const CheckIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>)
const MenuIcon = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>)
const TrashIcon = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>)
const InfoIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>)
const GearIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>)

const NumCell = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <input value={money(value)} onChange={e => onChange(parseInt(e.target.value.replace(/\D/g, '') || '0', 10))}
    className="w-[13rem] h-9 px-3 text-right bg-card border border-line-default rounded-md text-md text-ink focus:border-primary outline-none" />
)
const PlusCell = () => (
  <button type="button" className="w-9 h-9 inline-flex items-center justify-center rounded text-lg leading-none text-ink-muted hover:text-primary hover:bg-primary-25 cursor-pointer" aria-label="Thêm">+</button>
)

const PayrollUpdate = () => {
  const navigate = useNavigate()
  const [rows, setRows] = useState<Row[]>(INITIAL)
  const [search, setSearch] = useState('')

  const patch = (code: string, p: Partial<Row>) => setRows(rs => rs.map(r => r.code === code ? { ...r, ...p } : r))
  const remove = (code: string) => setRows(rs => rs.filter(r => r.code !== code))

  const filtered = rows.filter(r => !search.trim() || r.name.toLowerCase().includes(search.trim().toLowerCase()) || r.code.toLowerCase().includes(search.trim().toLowerCase()))

  const sum = (f: (r: Row) => number) => rows.reduce((a, r) => a + f(r), 0)

  return (
    <div className="flex flex-col h-[calc(100vh-var(--kv-header-height))] min-h-0">
      {/* ── header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-line bg-card">
        <button onClick={() => navigate('/manager/payroll')} className="w-9 h-9 flex items-center justify-center rounded-md text-ink-subtle hover:bg-fill hover:text-ink cursor-pointer" aria-label="Quay lại"><ArrowLeft /></button>
        <h1 className="text-lg font-bold text-ink whitespace-nowrap">Cập nhật bảng tính lương</h1>
        <div className="relative flex-1 max-w-[34rem]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2"><SearchIcon /></span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm nhân viên theo mã hoặc tên"
            className="w-full h-10 pl-9 pr-9 bg-card border border-line-default rounded-md text-md text-ink placeholder:text-ink-muted focus:border-primary outline-none" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"><ChevronDown /></span>
        </div>
        <div className="flex-1" />
        <button className="kv-btn kv-btn-outline-neutral h-10 bg-card"><SaveIcon /> Lưu tạm</button>
        <button className="kv-btn kv-btn-outline-primary h-10"><TableIcon /> Thanh toán</button>
        <button className="kv-btn kv-btn-primary h-10"><CheckIcon /> Chốt lương</button>
        <button className="w-10 h-10 flex items-center justify-center border border-line-default rounded-md bg-card text-ink cursor-pointer hover:border-line-strong" aria-label="Menu"><MenuIcon /></button>
      </div>

      {/* ── table ──────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-auto bg-card">
        <table className="w-full border-collapse min-w-[150rem]">
          <thead>
            <tr className="bg-primary-25 text-sm font-semibold text-ink-subtle">
              <th className="sticky top-0 bg-primary-25 px-3 py-3 w-[3rem]" />
              <th className="sticky top-0 bg-primary-25 px-3 py-3 w-[4rem] text-left">STT</th>
              <th className="sticky top-0 bg-primary-25 px-3 py-3 text-left w-[16rem]">Tên nhân viên</th>
              <th className="sticky top-0 bg-primary-25 px-3 py-3 text-right">Lương chính</th>
              <th className="sticky top-0 bg-primary-25 px-3 py-3 text-right">Làm thêm</th>
              <th className="sticky top-0 bg-primary-25 px-3 py-3 text-right">Hoa hồng</th>
              <th className="sticky top-0 bg-primary-25 px-3 py-3 text-right">Phụ cấp</th>
              <th className="sticky top-0 bg-primary-25 px-3 py-3 text-right">Thưởng</th>
              <th className="sticky top-0 bg-primary-25 px-3 py-3 text-right">Tổng thu nhập</th>
              <th className="sticky top-0 bg-primary-25 px-3 py-3 text-right">Giảm trừ</th>
              <th className="sticky top-0 bg-primary-25 px-3 py-3 text-right"><span className="inline-flex items-center gap-1 justify-end">Lương thực nhận <InfoIcon /></span></th>
              <th className="sticky top-0 bg-primary-25 px-3 py-3 text-right">Đã trả</th>
              <th className="sticky top-0 bg-primary-25 px-3 py-3 text-right">Còn cần trả</th>
            </tr>
            {/* totals row */}
            <tr className="border-b border-line text-md font-bold text-ink">
              <td className="px-3 py-3" colSpan={3} />
              <td className="px-3 py-3 text-right">{money(sum(r => (r.hasMainSalary ? r.base : 0)))}</td>
              <td className="px-3 py-3 text-right">0</td>
              <td className="px-3 py-3 text-right">{money(sum(r => r.commission))}</td>
              <td className="px-3 py-3 text-right">{money(sum(r => r.allowance))}</td>
              <td className="px-3 py-3 text-right">{money(sum(r => r.bonus))}</td>
              <td className="px-3 py-3 text-right">{money(sum(income))}</td>
              <td className="px-3 py-3 text-right">{money(sum(r => r.deduction))}</td>
              <td className="px-3 py-3 text-right">{money(sum(net))}</td>
              <td className="px-3 py-3 text-right">{money(sum(r => r.paid))}</td>
              <td className="px-3 py-3 text-right">{money(sum(remaining))}</td>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={r.code} className="border-b border-line hover:bg-[var(--kv-state-hover-bg)]">
                <td className="px-3 py-4 text-center"><button onClick={() => remove(r.code)} className="w-9 h-9 flex items-center justify-center mx-auto rounded-md text-ink-muted hover:text-danger hover:bg-danger-50 cursor-pointer" aria-label="Xóa"><TrashIcon /></button></td>
                <td className="px-3 py-4 text-md text-ink">{i + 1}</td>
                <td className="px-3 py-4">
                  <div className="text-md text-primary cursor-pointer hover:underline">{r.name}</div>
                  <div className="text-sm text-ink-subtle">{r.code}</div>
                </td>
                <td className="px-3 py-4 text-right">{r.hasMainSalary ? <NumCell value={r.base} onChange={v => patch(r.code, { base: v })} /> : <PlusCell />}</td>
                <td className="px-3 py-4 text-right"><PlusCell /></td>
                <td className="px-3 py-4 text-right"><NumCell value={r.commission} onChange={v => patch(r.code, { commission: v })} /></td>
                <td className="px-3 py-4 text-right"><NumCell value={r.allowance} onChange={v => patch(r.code, { allowance: v })} /></td>
                <td className="px-3 py-4 text-right"><NumCell value={r.bonus} onChange={v => patch(r.code, { bonus: v })} /></td>
                <td className="px-3 py-4 text-md text-ink text-right">{money(income(r))}</td>
                <td className="px-3 py-4 text-right"><NumCell value={r.deduction} onChange={v => patch(r.code, { deduction: v })} /></td>
                <td className="px-3 py-4 text-md text-ink text-right">{money(net(r))}</td>
                <td className="px-3 py-4 text-md text-ink text-right">{money(r.paid)}</td>
                <td className="px-3 py-4 text-md text-ink text-right">{money(remaining(r))}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={13} className="px-4 py-16 text-center text-md text-ink-subtle">Không có nhân viên phù hợp</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* floating Khởi tạo */}
      <button className="fixed right-6 bottom-6 flex items-center gap-2 h-11 px-4 rounded-full bg-primary text-white text-md font-medium shadow-md hover:bg-primary-600 cursor-pointer z-[var(--kv-z-dropdown)]">
        <GearIcon /> Khởi tạo
      </button>
    </div>
  )
}

export default PayrollUpdate
